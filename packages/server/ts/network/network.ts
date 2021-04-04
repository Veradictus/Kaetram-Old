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

class Network {
    world: World;
    database: MongoDB;
    socket: any;
    region: Region;
    map: Map;

    packets: any;
    differenceThreshold: number;

    constructor(world: World) {
        this.world = world;
        this.database = world.database;
        this.socket = world.socket;
        this.region = world.region;
        this.map = world.map;

        this.packets = {};

        this.differenceThreshold = 4000;

        this.load();
    }

    load() {
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

    parsePackets() {
        /**
         * This parses through the packet pool and sends them
         */

        for (let id in this.packets) {
            if (this.packets[id].length > 0 && this.packets.hasOwnProperty(id)) {
                let conn = this.socket.get(id);

                if (conn) {
                    conn.send(this.packets[id]);
                    this.packets[id] = [];
                    this.packets[id].id = id;
                } else this.socket.remove(id);
            }
        }
    }

    handlePlayerConnection(connection: any) {
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

    handlePopulationChange() {
        this.pushBroadcast(new Messages.Population(this.world.getPopulation()));
    }

    addToPackets(player: Player) {
        this.packets[player.instance] = [];
    }

    /*****************************************
     * Broadcasting and Socket Communication *
     *****************************************/

    /**
     * Broadcast a message to everyone in the world.
     */

    pushBroadcast(message: any) {
        _.each(this.packets, (packet: any) => {
            packet.push(message.serialize());
        });
    }

    /**
     * Broadcast a message to everyone with exceptions.
     */

    pushSelectively(message: any, ignores?: any) {
        _.each(this.packets, (packet: any) => {
            if (ignores.indexOf(packet.id) < 0) packet.push(message.serialize());
        });
    }

    /**
     * Sends a message to a player.
     */

    pushToPlayer(player: Player, message: any) {
        if (player && player.instance in this.packets)
            this.packets[player.instance].push(message.serialize());
    }

    /**
     * Sends a message to a group of players types.
     */

    pushToPlayers(players: Player, message: any) {
        _.each(players, (instance: string) => {
            this.pushToPlayer(this.world.getPlayerByInstance(instance), message);
        });
    }

    /**
     * Sends a message to all players within a region
     */

    pushToRegion(regionId: string, message: any, ignoreId?: string) {
        let region = this.region.regions[regionId];

        if (!region) return;

        _.each(region.players, (instance: string) => {
            if (instance !== ignoreId)
                this.pushToPlayer(this.world.getEntityByInstance(instance) as Player, message);
        });
    }

    /**
     * Sends a message to the regions surrounding the player. The player's
     * region is also included.
     * G  G  G
     * G  P  G
     * G  G  G
     */

    pushToAdjacentRegions(regionId: string, message: any, ignoreId?: any) {
        this.map.regions.forEachSurroundingRegion(regionId, (id: string) => {
            this.pushToRegion(id, message, ignoreId);
        });
    }

    /**
     * Sends a message to an array of player names
     */

    pushToNameArray(names: any, message: any) {
        _.each(names, (name: string) => {
            let player = this.world.getPlayerByName(name);

            if (player) this.pushToPlayer(player, message);
        });
    }
    
    getSocketTime(connection: Connection) {
        return this.socket.ips[connection.socket.conn.remoteAddress];
    }
}

export default Network;
