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

type Tile = number[] | number;
type RCallback = (entity: Entity, regionId: string) => void; // region callback
type TCallback = (tileInfo: TileInfo) => void; // Tile info callback

type Bounds = {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
};

type TileInfo = {
    position: {
        x: number;
        y: number;
    };
    data: Tile;
    animation?: string;
};

type ParsedData = {
    data: Tile;
    flipped: number | number[];
}

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

    doors: any;

    world: World;

    regions: any;

    loaded: boolean;

    clientWidth: number;
    clientHeight: number;

    addCallback: RCallback;
    incomingCallback: RCallback;

    constructor(world: World) {
        this.map = world.map;
        this.mapRegions = world.map.regions;

        this.doors = this.map.getDoors();

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

                this.sendRegion(entity);
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

    load(): void {
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

    loadWatcher(): void {
        fs.watch(map, () => {
            this.update();  
        });

        log.info('Finished loading file watcher!');
    }

    update(): void {
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

    addEntityToInstance(entity: Entity, player: Player): void {
        if (!entity) return;

        this.add(entity, player.region);

        player.updateRegion();
    }

    createInstance(player: Player, regionId: string): void {
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
            player,
            message: new Messages.Region(Packets.RegionOpcode.Update, {
                id: player.instance,
                type: 'remove'
            })
        });
    }

    deleteInstance(player: Player): void {
        player.instanced = false;

        this.handle(player);
        this.push(player);

        this.mapRegions.forEachSurroundingRegion(player.region, (regionId: string) => {
            const instancedRegion = Region.regionIdToInstance(player, regionId);

            if (instancedRegion in this.regions) delete this.regions[instancedRegion];
        });
    }

    parseRegions(): void {
        if (!this.loaded) return;

        this.mapRegions.forEachRegion((regionId: string) => {
            if (this.regions[regionId].incoming.length < 1) return;

            this.sendSpawns(regionId);

            this.regions[regionId].incoming = [];
        });
    }

    /**
     * We take every player instance within and around the region
     * and send new data to all those players.
     * 
     * @param regionId The region we are updating
     */

    updateRegion(regionId: string): void {
        this.mapRegions.forEachSurroundingRegion(regionId, (id: string) => {
            const region = this.regions[id];
            
            _.each(region.players, (instance: string) => {
                const player = this.world.entities.players[instance];

                if (player) this.sendRegion(player);
            });
        });
    }

    syncRegion(player: Player): void {
        this.handle(player);
        this.push(player);
 
        this.sendTilesetInfo(player);
        this.sendRegion(player, true);
        //this.sendDoors(player);
    }

    // If `regionId` is not null, we update adjacent regions
    updateRegions(regionId?: string): void {
        if (regionId)
            this.mapRegions.forEachSurroundingRegion(regionId, (id: string) => {
                const region = this.regions[id];

                _.each(region.players, (instance: string) => {
                    const player = this.world.entities.players[instance];

                    if (player) this.sendRegion(player);
                });
            });
        else
            this.world.entities.forEachPlayer((player: Player) => {
                player.regionsLoaded = [];

                player.send(new Messages.Region(Packets.RegionOpcode.Reset));
                
                this.sendRegion(player, true);
                this.sendTilesetInfo(player);
            });
    }

    sendRegion(player: Player, force?: boolean): void {
        const regionData = this.getRegionData(player, force);

        if (Object.keys(regionData).length > -1)
            player.send(new Messages.Map(Packets.MapOpcode.Data, regionData, force));
    }

    sendTilesetInfo(player: Player): void {
        let tileCollisions = this.map.collisions,
            polygonCollisions = this.map.polygons,
            tilesetData = {};

        for (let i in this.map.collisions)
            tilesetData[tileCollisions[i]] = { c: true };

        for (let i in this.map.polygons)
            tilesetData[i] = { p: polygonCollisions[i] };

        for (let i in this.map.high)
            if (i in tilesetData)
                tilesetData[i].h = this.map.high[i];
            else
                tilesetData[i] = { h: this.map.high[i] };

        player.send(new Messages.Map(Packets.MapOpcode.Tileset, tilesetData));
    }

    sendDoors(player: Player): void {
        let doors = [];

        for (let i in this.doors)
            doors.push({
                id: this.doors[i].id,
                x: this.doors[i].x,
                y: this.doors[i].y,
                width: this.doors[i].width,
                height: this.doors[i].height
            });

        player.send(new Messages.Region(Packets.RegionOpcode.Doors, doors));
    }

    // TODO - Format dynamic tiles to follow same structure as `getRegionData()`
    getDynamicTiles(player: Player): any {
        return {};
    }

    sendSpawns(regionId: string): void {
        if (!regionId) return;

        _.each(this.regions[regionId].incoming, (entity: Entity) => {
            if (!entity || !entity.instance || entity.instanced) return;

            this.world.push(Packets.PushOpcode.Region, {
                regionId,
                message: new Messages.Spawn(entity),
                ignoreId: entity.isPlayer() ? entity.instance : null
            });
        });
    }

    add(entity: Entity, regionId: string): string[] {
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

    remove(entity: Entity): string[] {
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

    incoming(entity: Entity, regionId: string): void {
        if (!entity || !regionId) return;

        const region = this.regions[regionId];

        if (region && !_.includes(region.entities, entity.instance)) region.incoming.push(entity);

        if (this.incomingCallback) this.incomingCallback(entity, regionId);
    }

    handle(entity: Entity, region?: string): boolean {
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

    push(player: Player): void {
        let entities: string[];

        if (!player || !(player.region in this.regions)) return;

        entities = _.keys(this.regions[player.region].entities);

        entities = _.reject(entities, (instance) => {
            return instance === player.instance; //TODO //|| player.isInvisible(instance);
        });

        entities = _.map(entities, (instance: string) => {
            return instance;
        });

        player.send(new Messages.List(entities));
    }

    changeTileAt(player: Player, newTile: Tile, x: number, y: number): void {
        const index = this.gridPositionToIndex(x, y);

        player.send(Region.getModify(index, newTile));
    }

    changeGlobalTile(newTile: Tile, x: number, y: number): void {
        const index = this.gridPositionToIndex(x, y);

        this.map.data[index] = newTile;

        this.world.push(Packets.PushOpcode.Broadcast, {
            message: Region.getModify(index, newTile)
        });
    }

    /**
     * We parse through the surrounding regions around a player.
     * See `getSurroundingRegions` for more information in `regions.ts`
     * 
     * @param player The player entity we extract the surrounding regions from.
     * @param force This forces reloading of regions regardless if player has loaded them
     * @returns A serialized object array of region data.
     */

    getRegionData(player: Player, force?: boolean): any {
        const data = {};

        if (!player) return data;

        let dynamicTiles = this.getDynamicTiles(player);

        this.mapRegions.forEachSurroundingRegion(player.region, (regionId: string) => {
            if (player.hasLoadedRegion(regionId) && !force) return;

            player.loadRegion(regionId);

            const bounds = this.getRegionBounds(regionId);

            data[regionId] = {
                region: [],
                doors: this.getDoorsInRegion(bounds)
            };

            this.forEachTile(bounds, dynamicTiles, (tile: TileInfo) => {
                data[regionId].region.push(tile);
            });
        });

        return data;
    }

    forEachTile(bounds: Bounds, dynamicTiles: any, callback: TCallback): void {
        this.forEachGrid(bounds, (x: number, y: number) => {
            let index = this.gridPositionToIndex(x - 1, y),
                data = this.map.getData(index) as any;

            if (!data) return;
            
            /*if (index in dynamicTiles) {

            }*/

            let info: TileInfo = {
                position: { x, y },
                data,
                animation: this.map.getAnimation(data)
            };

            if (!info.animation) delete info.animation;

            callback(info);
        });
    }

    forEachGrid(bounds: Bounds, callback: (x: number, y: number) => void): void {
        for (let y = bounds.startY; y < bounds.endY; y++)
            for (let x = bounds.startX; x < bounds.endX; x++)
                callback(x, y)
    }

    getDoorsInRegion(bounds: Bounds): any {
        let doors = [];

        _.each(this.doors, (door: any) => {
            if (!this.doorInBounds(door, bounds)) return;

            doors.push({
                id: door.id,
                x: door.x,
                y: door.y,
                width: door.width,
                height: door.height
            });
        });

        return doors;
    }

    getRegionBounds(regionId: string): Bounds {
        const regionCoordinates = this.mapRegions.regionIdToCoordinates(regionId);

        return {
            startX: regionCoordinates.x,
            startY: regionCoordinates.y,
            endX: regionCoordinates.x + this.map.regionWidth,
            endY: regionCoordinates.y + this.map.regionHeight
        };
    }

    doorInBounds(door: any, bounds: Bounds): boolean {
        let x = door.x / this.map.tileSize,
            y = door.y / this.map.tileSize;

        return x > bounds.startX && y > bounds.startY && x < bounds.endX && y < bounds.endY;
    }

    static getModify(index: number, newTile: Tile): typeof Messages.Region {
        return new Messages.Region(Packets.RegionOpcode.Modify, {
            index,
            newTile
        });
    }

    static instanceToRegionId(instancedRegionId: string): string {
        const region = instancedRegionId.split('-');

        return region[0] + '-' + region[1];
    }

    static regionIdToInstance(entity: Entity, regionId: string): string {
        return regionId + '-' + entity.instance;
    }

    gridPositionToIndex(x: number, y: number): number {
        return y * this.map.width + x + 1;
    }

    onAdd(callback: RCallback): void {
        this.addCallback = callback;
    }

    onIncoming(callback: RCallback): void {
        this.incomingCallback = callback;
    }
}

export default Region;