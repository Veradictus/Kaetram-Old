import _ from 'lodash';
import World from '../game/world';
import MongoDB from '../database/mongodb/mongodb';
import Messages from './messages';
import Region from '../region/region';
import Map from '../map/map';
import Player from '../game/entity/character/player/player';
import Utils from '../util/utils';
import Connection from './connection';
import config from '../../config';
import Entities from '../controllers/entities';
import WebSocket from './websocket';

class Network {
    private world: World;
    private entities: Entities;
    private database: MongoDB;
    private socket: WebSocket;
    private region: Region;
    private map: Map;

    public packets: any;
    public differenceThreshold: number;

    constructor(world: World) {
        this.world = world;
        this.entities = world.entities;
        this.database = world.database;
        this.socket = world.socket;
        this.region = world.region;
        this.map = world.map;

        this.packets = {};

        this.differenceThreshold = 4000;

        this.load();
    }

    load(): void {
        this.world.onPlayerConnection((connection: any) => {
            this.handlePlayerConnection(connection);
        });

        this.world.onPopulationChange(() => {
            this.handlePopulationChange();
        });
    }

    /**
     * The primary function that parses through a packets queue,
     * and sends packets to their respective connection.
     */

    parsePackets(): void {
        /**
         * This parses through the packet pool and sends them
         */

        for (let id in this.packets)
            if (this.packets[id].length > 0) {
                let conn = this.socket.get(id);

                if (conn) {
                    conn.send(this.packets[id]);
                    this.packets[id] = [];
                    this.packets[id].id = id;
                } else this.socket.remove(id);
            }
    }

    handlePlayerConnection(connection: Connection): void {
        let clientId = Utils.generateClientId(),
            player = new Player(this.world, this.database, connection, clientId),
            timeDifference = new Date().getTime() - this.getSocketTime(connection);

        if (!config.debug && timeDifference < this.differenceThreshold) {
            connection.sendUTF8('toofast');
            connection.close('Logging in too fast.');
            return;
        }

        this.socket.ips[connection.socket.conn.remoteAddress] = new Date().getTime();

        this.addToPackets(player);

        this.pushToPlayer(
            player,
            new Messages.Handshake({
                id: clientId,
                development: config.development
            })
        );
    }

    handlePopulationChange(): void {
        this.pushBroadcast(new Messages.Population(this.world.getPopulation()));
    }

    addToPackets(player: Player): void {
        this.packets[player.instance] = [];
    }

    /*****************************************
     * Broadcasting and Socket Communication *
     *****************************************/

    /**
     * Broadcast a message to everyone in the world.
     */

    pushBroadcast(message: typeof Messages): void {
        _.each(this.packets, (packet: any) => {
            packet.push(message.serialize());
        });
    }

    /**
     * Broadcast a message to everyone with exceptions.
     */

    pushSelectively(message: typeof Messages, ignores?: string[]): void {
        _.each(this.packets, (packet: any) => {
            if (ignores.includes(packet.id)) return;

            packet.push(message.serialize());
        });
    }

    /**
     * Sends a message to a player.
     */

    pushToPlayer(player: Player, message: any): void {
        if (player && player.instance in this.packets)
            this.packets[player.instance].push(message.serialize());
    }

    /**
     * Sends a message to a group of players types.
     */

    pushToPlayers(players: Player, message: any): void {
        _.each(players, (instance: string) => {
            this.pushToPlayer(this.entities.get(instance) as Player, message);
        });
    }

    /**
     * Sends a message to all players within a region
     */

    pushToRegion(regionId: string, message: any, ignoreId?: string): void {
        let region = this.region.regions[regionId];

        if (!region) return;

        _.each(region.players, (instance: string) => {
            if (instance !== ignoreId)
                this.pushToPlayer(this.entities.get(instance) as Player, message);
        });
    }

    /**
     * Sends a message to the regions surrounding the player. The player's
     * region is also included.
     * G  G  G
     * G  P  G
     * G  G  G
     */

    pushToAdjacentRegions(regionId: string, message: typeof Messages, ignoreId?: string): void {
        this.map.regions.forEachSurroundingRegion(regionId, (id: string) => {
            this.pushToRegion(id, message, ignoreId);
        });
    }

    /**
     * Sends a message to an array of player names
     */

    pushToNameArray(names: string[], message: typeof Messages): void {
        _.each(names, (name: string) => {
            let player = this.world.getPlayerByName(name);

            if (player) this.pushToPlayer(player, message);
        });
    }
    
    getSocketTime(connection: Connection): number {
        return this.socket.ips[connection.socket.conn.remoteAddress];
    }
}

export default Network;
