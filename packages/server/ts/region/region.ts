/* global module */

import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import Messages from '../network/messages';
import Packets from '../network/packets';
import Player from '../game/entity/character/player/player';
import Entity from '../game/entity/entity';
import Map from '../map/map';
import Regions from '../map/regions';
import World from '../game/world';
import Utils from '../util/utils';
import config from '../../config';
import log from '../util/log';

const map = path.resolve(__dirname, '../../data/map/world.json');

class Region {
    /**
     * Region Generation.
     * This is used in order to send the client data about the new region
     * it is about to enter. This has to be greatly expanded to generated
     * instanced areas where other entities will not be pushed to surrounding
     * players, even if they share the same coordinates.
     */

    map: Map;
    mapRegions: Regions;

    world: World;

    regions: any;

    loaded: boolean;

    clientWidth: number;
    clientHeight: number;

    addCallback: Function;
    incomingCallback: Function;

    constructor(world: World) {
        this.map = world.map;
        this.mapRegions = world.map.regions;

        this.world = world;

        this.regions = {};
        this.loaded = false;

        this.onAdd((entity: Entity, regionId: string) => {
            if (!entity || !entity.username) return;

            if (config.debug)
                log.info('Entity - ' + entity.username + ' has entered region - ' + regionId);

            if (entity instanceof Player) {
                if (!entity.questsLoaded) return;

                if (!entity.achievementsLoaded) return;

                this.sendRegion(entity, regionId);
            }
        });

        this.onIncoming((entity: Entity, regionId: string) => {
            if (!entity || !entity.username) return;

            if (config.debug)
                log.info('Entity - ' + entity.username + ' is incoming into region - ' + regionId);
        });

        this.load();
        this.loadWatcher();
    }

    load() {
        this.mapRegions.forEachRegion((regionId: string) => {
            this.regions[regionId] = {
                entities: {},
                players: [],
                incoming: []
            };
        });

        this.loaded = true;

        log.info('Finished loading regions!');
    }

    loadWatcher() {
        fs.watch(map, (_eventType, _filename) => {
            this.update();  
        });

        log.info('Finished loading file watcher!');
    }

    update() {
        let data = fs.readFileSync(map, {
            encoding: 'utf8',
            flag: 'r'
        });

        if (!data) return;

        try {

            let jsonData = JSON.parse(data),
                checksum = Utils.getChecksum(data);

            if (checksum === this.map.checksum)
                return;

            this.map.create(jsonData);
            this.map.load();
            
            log.debug('Successfully loaded new map data.');

            this.updateRegions();

        } catch (e) { log.error('Could not parse new map file.'); log.debug(e); }
    }

    addEntityToInstance(entity: Entity, player: Player) {
        if (!entity) return;

        this.add(entity, player.region);

        player.updateRegion();
    }

    createInstance(player: Player, regionId: string) {
        /**
         * We create an instance at the player's current surrounding
         * region IDs. These will have to be disposed of whenever we're done.
         */

        player.instanced = true;

        this.mapRegions.forEachSurroundingRegion(regionId, (region: string) => {
            this.regions[Region.regionIdToInstance(player, region)] = {
                entities: {},
                players: [],
                incoming: []
            };
        });

        this.handle(player, regionId);
        this.push(player);

        this.world.push(Packets.PushOpcode.OldRegions, {
            player: player,
            message: new Messages.Region(Packets.RegionOpcode.Update, {
                id: player.instance,
                type: 'remove'
            })
        });
    }

    deleteInstance(player: Player) {
        player.instanced = false;

        this.handle(player);
        this.push(player);

        this.mapRegions.forEachSurroundingRegion(player.region, (regionId: string) => {
            const instancedRegion = Region.regionIdToInstance(player, regionId);

            if (instancedRegion in this.regions) delete this.regions[instancedRegion];
        });
    }

    parseRegions() {
        if (!this.loaded) return;

        this.mapRegions.forEachRegion((regionId: string) => {
            if (this.regions[regionId].incoming.length < 1) return;

            this.sendSpawns(regionId);

            this.regions[regionId].incoming = [];
        });
    }

    // If `regionId` is not null, we update adjacent regions
    updateRegions(regionId?: string) {
        if (regionId)
            this.mapRegions.forEachSurroundingRegion(regionId, (id: string) => {
                const region = this.regions[id];

                _.each(region.players, (instance: string) => {
                    const player = this.world.players[instance];

                    if (player) this.sendRegion(player, player.region);
                });
            });
        else
            this.world.forEachPlayer((player: Player) => {
                player.regionsLoaded = [];

                player.send(new Messages.Region(Packets.RegionOpcode.Reset));
                
                this.sendRegion(player, player.region, true);
                this.sendTilesetInfo(player);
            });
    }

    sendRegion(player: Player, region: string, force?: boolean) {
        const tileData = this.getRegionData(region, player, force);

        let dynamicTiles;// = this.getDynamicTiles(player);

        dynamicTiles = {
            indexes: [],
            objectData: []
        }

        // Send dynamic tiles alongside the region
        for (let i = 0; i < tileData.length; i++) {
            const tile = tileData[i],
                index = dynamicTiles.indexes.indexOf(tile.index);

            if (index > -1)
                tileData[i].data = dynamicTiles.data[index];
        }

        // Send dynamic tiles independently
        if (tileData.length < 1)
            for (let i = 0; i < dynamicTiles.indexes.length; i++) {
                tileData[i] = {};

                tileData[i].index = dynamicTiles.indexes[i];
                tileData[i].data = dynamicTiles.data[i];

                const data = dynamicTiles.objectData,
                    index = tileData[i].index;

                if (data && index in data) {
                    tileData[i].isObject = data[index].isObject;

                    if (data[index].cursor) tileData[i].cursor = data[index].cursor;
                }
            }

        for (let i in tileData) {
            tileData[i].position = this.map.indexToGridPosition(tileData[i].index);
            delete tileData[i].index;
        }

        //No need to send empty data...
        if (tileData.length > 0)
            player.send(new Messages.Region(Packets.RegionOpcode.Render, tileData, force));
    }

    sendTilesetInfo(player: Player) {
        let tileCollisions = this.map.collisions,
            polygonCollisions = this.map.polygons,
            high = this.map.high,
            tilesetData = {};

        for (let i in this.map.collisions)
            tilesetData[tileCollisions[i]] = { collision: true };

        for (let i in this.map.polygons)
            tilesetData[i] = { polygon: true, polygons: polygonCollisions[i] };

        for (let i in this.map.high)
            if (high[i] in tilesetData)
                tilesetData[high[i]].high = true;
            else
                tilesetData[high[i]] = { high: true }

        player.send(new Messages.Region(Packets.RegionOpcode.Tileset, tilesetData));
    }

    sendDoors(player: Player) {
        let doors = [];

        for (let i in this.map.doors)
            console.log(this.map.doors[i]);       
    }

    // TODO - Format dynamic tiles to follow same structure as `getRegionData()`
    getDynamicTiles(player: Player) {
        const dynamicTiles: any = player.doors.getAllTiles(),
            trees = player.getSurroundingTrees();

        // Start with the doors and append afterwards.

        dynamicTiles.indexes.push.apply(dynamicTiles.indexes, trees.indexes);
        dynamicTiles.data.push.apply(dynamicTiles.data, trees.data);

        if (trees.objectData) dynamicTiles.objectData = trees.objectData;

        return dynamicTiles;
    }

    sendSpawns(regionId: string) {
        if (!regionId) return;

        _.each(this.regions[regionId].incoming, (entity: Entity) => {
            if (!entity || !entity.instance || entity.instanced) return;

            this.world.push(Packets.PushOpcode.Region, {
                regionId: regionId,
                message: new Messages.Spawn(entity),
                ignoreId: entity.isPlayer() ? entity.instance : null
            });
        });
    }

    add(entity: Entity, regionId: string) {
        const newRegions = [];

        if (entity && regionId && regionId in this.regions) {
            this.mapRegions.forEachSurroundingRegion(regionId, (id: string) => {
                if (entity.instanced) id = Region.regionIdToInstance(entity, id);

                const region = this.regions[id];

                if (region && region.entities) {
                    region.entities[entity.instance] = entity;
                    newRegions.push(id);
                }
            });

            entity.region = regionId;

            if (entity instanceof Player) this.regions[regionId].players.push(entity.instance);
        }

        if (this.addCallback) this.addCallback(entity, regionId);

        return newRegions;
    }

    remove(entity: Entity) {
        const oldRegions = [];

        if (entity && entity.region) {
            const region = this.regions[entity.region];

            if (entity instanceof Player)
                region.players = _.reject(region.players, (id) => {
                    return id === entity.instance;
                });

            this.mapRegions.forEachSurroundingRegion(entity.region, (id: string) => {
                if (this.regions[id] && entity.instance in this.regions[id].entities) {
                    delete this.regions[id].entities[entity.instance];
                    oldRegions.push(id);

                    this.world.push(Packets.PushOpcode.Region, {
                        regionId: id,
                        message: new Messages.Despawn(entity.instance)
                    });
                }
            });

            entity.region = null;
        }

        return oldRegions;
    }

    incoming(entity: Entity, regionId: string) {
        if (!entity || !regionId) return;

        const region = this.regions[regionId];

        if (region && !_.includes(region.entities, entity.instance)) region.incoming.push(entity);

        if (this.incomingCallback) this.incomingCallback(entity, regionId);
    }

    handle(entity: Entity, region?: string) {
        let regionsChanged = false;

        if (!entity) return regionsChanged;

        let regionId = region ? region : this.mapRegions.regionIdFromPosition(entity.gridX, entity.gridY);

        if (entity.instanced) regionId = Region.regionIdToInstance(entity, regionId);

        if (!entity.region || (entity.region && entity.region !== regionId)) {
            regionsChanged = true;

            this.incoming(entity, regionId);

            let oldRegions = this.remove(entity),
                newRegions = this.add(entity, regionId);

            if (_.size(oldRegions) > 0) entity.recentRegions = _.difference(oldRegions, newRegions);
        }

        return regionsChanged;
    }

    push(player: Player) {
        let entities: any;

        if (!player || !(player.region in this.regions)) return;

        entities = _.keys(this.regions[player.region].entities);

        entities = _.reject(entities, (instance) => {
            return instance === player.instance; //TODO //|| player.isInvisible(instance);
        });

        entities = _.map(entities, (instance: string) => {
            return parseInt(instance);
        });

        player.send(new Messages.List(entities));
    }

    changeTileAt(player: Player, newTile: any, x: number, y: number) {
        const index = this.gridPositionToIndex(x, y);

        player.send(Region.getModify(index, newTile));
    }

    changeGlobalTile(newTile: any, x: number, y: number) {
        const index = this.gridPositionToIndex(x, y);

        this.map.data[index] = newTile;

        this.world.push(Packets.PushOpcode.Broadcast, {
            message: Region.getModify(index, newTile)
        });
    }

    /**
     * Compare the user's screen size and chip away the amount of data
     * we are sending.
     */
    formatRegionData(_player: Player, _data: any) {}

    getRegionData(region: string, player: Player, force?: boolean) {
        const data = [];

        if (!player) return data;

        this.mapRegions.forEachSurroundingRegion(region, (regionId: string) => {
            if (!player.hasLoadedRegion(regionId) || force) {
                player.loadRegion(regionId);

                const bounds = this.getRegionBounds(regionId);

                this.forEachGrid(bounds, (x: number, y: number) => {
                    let index = this.gridPositionToIndex(x - 1, y),
                    tileData = this.map.data[index];

                    if (!tileData)
                        return;
                    
                    let info: any = {
                        index: index,
                        data: tileData,
                        animation: this.map.getAnimation(tileData)
                    };

                    if (!info.animation) delete info.animation;

                    data.push(info);
                });

            }
        });

        return data;
    }

    forEachGrid(bounds: any, callback: Function) {
        for (let y = bounds.startY; y < bounds.endY; y++)
            for (let x = bounds.startX; x < bounds.endX; x++)
                callback(x, y)
    }    

    getRegionBounds(regionId: string) {
        const regionCoordinates = this.mapRegions.regionIdToCoordinates(regionId);

        return {
            startX: regionCoordinates.x,
            startY: regionCoordinates.y,
            endX: regionCoordinates.x + this.map.regionWidth,
            endY: regionCoordinates.y + this.map.regionHeight
        };
    }

    static getModify(index: number, newTile: any) {
        return new Messages.Region(Packets.RegionOpcode.Modify, {
            index: index,
            newTile: newTile
        });
    }

    static instanceToRegionId(instancedRegionId: string) {
        const region = instancedRegionId.split('-');

        return region[0] + '-' + region[1];
    }

    static regionIdToInstance(entity: Entity, regionId: string) {
        return regionId + '-' + entity.instance;
    }

    gridPositionToIndex(x: number, y: number) {
        return y * this.map.width + x + 1;
    }

    onAdd(callback: Function) {
        this.addCallback = callback;
    }

    onIncoming(callback: Function) {
        this.incomingCallback = callback;
    }
}

export default Region;
