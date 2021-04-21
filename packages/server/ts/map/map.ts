/* global module */

import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import Grids from './grids';
import Regions from './regions';
import Utils from '../util/utils';
import Modules from '../util/modules';
import World from '../game/world';
import Area from './areas/area';
import Entity from '../game/entity/entity';
import Spawns from '../../data/spawns.json';
import log from '../util/log';
import Areas from './areas/areas';
import AreasIndex from './areas/index';

let map: any;

const mapDestination = path.resolve(__dirname, '../../data/map/world.json');

class Map {
    world: World;
    ready: boolean;

    regions: Regions;
    grids: Grids;

    width: number;
    height: number;
    tileSize: number;
    version: number;

    data: any[];

    collisions: any;
    animations: any;
    polygons: any;
    chests: any;
    lights: any;
    high: any[];
    plateau: any;
    objects: any;
    warps: any;

    trees: any;
    treeIndexes: any;

    rocks: any;
    rockIndexes: any;

    regionWidth: number;
    regionHeight: number;

    areas: { [name: string]: Areas };

    staticEntities: any;

    checksum: string;

    readyInterval: any;
    readyCallback: Function;

    constructor(world: World) {
        this.world = world;

        this.ready = false;

        this.create();
        this.load();

        this.regions = new Regions(this);
        this.grids = new Grids(this);
    }

    // Creates and populates map based on resources.
    create(jsonData?: any) {
        try {
            map = jsonData || JSON.parse(fs.readFileSync(mapDestination, {
                encoding: 'utf8',
                flag: 'r'
            }));
        } catch (e) { log.error('Could not create map file.'); }
    }

    load() {
        this.version = map.version || 0;

        this.width = map.width;
        this.height = map.height;
        this.tileSize = map.tileSize;

        this.data = map.data;

        this.collisions = map.collisions;
        this.animations = map.animations;
        this.polygons = map.polygons;
        this.chests = map.areas.chests;

        this.loadStaticEntities();

        this.lights = map.areas.lights;
        this.high = map.high;
        this.plateau = map.plateau;
        this.objects = map.objects;
        this.warps = map.warps;

        // Lumberjacking
        this.trees = map.trees;
        this.treeIndexes = map.treeIndexes;

        // Mining
        this.rocks = map.rocks;
        this.rockIndexes = map.rockIndexes;

        this.regionWidth = 25;
        this.regionHeight = 25;

        this.checksum = Utils.getChecksum(JSON.stringify(map));

        this.areas = {};

        this.loadAreas();

        this.ready = true;

        if (this.world.ready)
            return;

        this.readyInterval = setInterval(() => {
            if (this.readyCallback) this.readyCallback();

            clearInterval(this.readyInterval);
            this.readyInterval = null;
        }, 50);
    }

    loadAreas() {

        _.each(map.areas, (area: any, key: string) => {
            if (!(key in AreasIndex)) return;

            this.areas[key] = new AreasIndex[key](area, this.world);
        });
    }

    loadStaticEntities() {
        this.staticEntities = [];

        // Legacy static entities (from Tiled);
        _.each(map.staticEntities, (entity: any, tileIndex) => {
            this.staticEntities.push({
                tileIndex: tileIndex,
                string: entity.type,
                roaming: entity.roaming
            });
        });

        _.each(Spawns, (data) => {
            let tileIndex = this.gridPositionToIndex(data.x, data.y);

            this.staticEntities.push({
                tileIndex: tileIndex,
                string: data.string,
                roaming: data.roaming,
                miniboss: data.miniboss,
                achievementId: data.achievementId,
                boss: data.boss
            });
        });
    }

    indexToGridPosition(tileIndex: number) {
        let x = this.getX(tileIndex, this.width),
            y = Math.floor((tileIndex - 1) / this.width);

        return {
            gridX: x,
            gridY: y
        };
    }

    gridPositionToIndex(x: number, y: number) {
        return y * this.width + x;
    }

    inArea(posX: number, posY: number, x: number, y: number, width: number, height: number) {
        return posX >= x && posY >= y && posX <= width + x && posY <= height + y;
    }

    inTutorialArea(entity: Entity) {
        if (entity.gridX === -1 || entity.gridY === -1) return true;

        return (
            this.inArea(entity.gridX, entity.gridY, 370, 36, 10, 10) ||
            this.inArea(entity.gridX, entity.gridY, 312, 11, 25, 22) ||
            this.inArea(entity.gridX, entity.gridY, 399, 18, 20, 15)
        );
    }

    nearLight(light: any, x: number, y: number) {
        let diff = Math.round(light.distance / this.tileSize),
            startX = light.x - this.regionWidth - diff,
            startY = light.y - this.regionHeight - diff,
            endX = light.x + this.regionWidth + diff,
            endY = light.y + this.regionHeight + diff;

        return x > startX && y > startY && x < endX && y < endY;
    }

    isObject(object: any) {
        return this.objects.indexOf(object) > -1;
    }

    // Transforms an object's `instance` or `id` into position
    idToPosition(id: string) {
        let split = id.split('-');

        return { gridX: parseInt(split[0]), gridY: parseInt(split[1]) };
    }

    isValidPosition(x: number, y: number) {
        return (
            Number.isInteger(x) &&
            Number.isInteger(y) &&
            !this.isOutOfBounds(x, y) &&
            !this.isColliding(x, y)
        );
    }

    isOutOfBounds(x: number, y: number) {
        return x < 0 || x > this.width || y < 0 || y > this.height;
    }

    isPlateau(index: number) {
        return index in this.plateau;
    }

    // To be deprecated...
    isColliding(x: number, y: number) {
        if (this.isOutOfBounds(x, y)) return false;

        let tileIndex = this.gridPositionToIndex(x, y);

        return this.collisions.indexOf(tileIndex) > -1;
    }

    /**
     * Formats polygon shape to tileIndex and determines if player is in there.
     */

    formatPolygon(gridX: number, gridY: number, polygonShape: any) {
        let newPolygon = [];

        for (let i in polygonShape)
            newPolygon.push({
                x: gridX + (polygonShape[i].x / this.tileSize),
                y: gridY + (polygonShape[i].y / this.tileSize)
            });

        return newPolygon;
    }

    isInside(rawX: number, rawY: number, gridX: number, gridY: number, polygonShape: any) {
        polygonShape = this.formatPolygon(gridX, gridY, polygonShape);

        for (let i = 0, j = polygonShape.length - 1; i < polygonShape.length; j = i++) {
            let xi = polygonShape[i].x, yi = polygonShape[i].y,
                xj = polygonShape[j].x, yj = polygonShape[j].y;

            let intersect = ((yi > rawY) != (yj > rawY)) &&
                (rawX < (xj - xi) * (rawY - yi) / (yj - yi) + xi);

            if (intersect)
                return true;
        }

        return false;
    }

    isCollision(rawX: number, rawY: number, gridX: number, gridY: number) {
        let tileIndex = this.gridPositionToIndex(gridX, gridY);

        if (this.collisions.indexOf(tileIndex) > -1)
            return rawX > gridX && rawX < gridX + 1 && rawY > gridY && rawY < gridY + 1;

        let tileData: any = this.data[tileIndex],
            isInside = (tile: any) => {
                if (tile in this.polygons)
                    return this.isInside(rawX, rawY, gridX, gridY, this.polygons[tile]);
            };

        let isColliding = false;

        if (tileData instanceof Array)
            for (let i in tileData)
                if (isInside(tileData[i]))
                    isColliding = true;
        else
            isColliding = isInside(tileData);

        return isColliding;
    }

    /* For preventing NPCs from roaming in null areas. */


    isEmpty(x: number, y: number) {
        if (this.isOutOfBounds(x, y)) return true;

        let tileIndex = this.gridPositionToIndex(x, y);

        return this.data[tileIndex] === 0;
    }

    getX(index: number, width: number) {
        if (index === 0) return 0;

        return index % width === 0 ? width - 1 : (index % width) - 1;
    }

    getRandomPosition(area: Area) {
        let pos: any = {},
            valid = false;

        while (!valid) {
            pos.x = area.x + Utils.randomInt(0, area.width + 1);
            pos.y = area.y + Utils.randomInt(0, area.height + 1);
            valid = this.isValidPosition(pos.x, pos.y);
        }

        return pos;
    }

    getPlateauLevel(x: number, y: number) {
        let index = this.gridPositionToIndex(x, y);

        if (!this.isPlateau(index)) return 0;

        return this.plateau[index];
    }

    getWarpById(id: number) {
        let warpName = Object.keys(Modules.Warps)[id];

        if (!warpName) return null;

        let warp = this.getWarpByName(warpName.toLowerCase());

        if (!warp) return;

        warp.name = warpName;

        return warp;
    }

    getWarpByName(name: string) {
        for (let i in this.warps)
            if (this.warps[i].name === name)
                return _.cloneDeep(this.warps[i]);

        return null;
    }

    getAnimation(tileData: any): any {
        if (tileData instanceof Array) {
            for (let i in tileData)
                if (tileData[i] in this.animations)
                    return { tileId: tileData[i], name: this.animations[tileData[i]] };
        } else
            if (tileData in this.animations)
                return { tileId: tileData, name: this.animations[tileData] };

        return null;
    }

    getPositionObject(x: number, y: number) {
        let index = this.gridPositionToIndex(x, y),
            tiles: any = this.data[index],
            objectId: any;

        if (tiles instanceof Array)
            for (let i in tiles)
                if (this.isObject(tiles[i])) objectId = tiles[i];
                else if (this.isObject(tiles)) objectId = tiles;

        return objectId;
    }

    getObjectId(tileIndex: number) {
        let position = this.indexToGridPosition(tileIndex + 1);

        return position.gridX + '-' + position.gridY;
    }

    getObject(x: number, y: number, data: any) {
        let index = this.gridPositionToIndex(x, y) - 1,
            tiles: any = this.data[index];

        if (tiles instanceof Array) for (let i in tiles) if (tiles[i] in data) return tiles[i];

        if (tiles in data) return tiles;

        return null;
    }

    getTree(x: number, y: number) {
        return this.getObject(x, y, this.trees);
    }

    getRock(x: number, y: number) {
        return this.getObject(x, y, this.rocks);
    }

    getChestAreas(): Areas {
        return this.areas['chests'];
    }

    getDoors() {
        return this.areas['doors'].areas;
    }

    isReady(callback: Function) {
        this.readyCallback = callback;
    }
}

export default Map;
