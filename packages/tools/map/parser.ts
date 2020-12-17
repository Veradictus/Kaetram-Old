import _, { property } from 'lodash';
import zlib from 'zlib';

import log from '../../server/ts/util/log';

import MapData from './mapdata';

export default class Parser {
    
    public map: MapData;
    public data: any;

    constructor(data: any) {
        this.data = data;
    }

    parse() {

        this.map = {
            width: this.data.width,
            height: this.data.height,
            tileSize: this.data.tilewidth,
            version: new Date().getTime(),

            data: [],

            collisions: [],
            blocking: [],
            polygons: {},
            entities: {},
            staticEntities: {},
            animations: {},

            plateau: {},

            lights: [],
            high: [],
            objects: [],
            trees: {},
            treeIndexes: [],
            rocks: {},
            rockIndexes: [],
            pvpAreas: [],
            gameAreas: [],
            doors: {},
            musicAreas: [],
            chestAreas: [],
            chests: [],
            overlayAreas: [],
            cameraAreas: [],
            achievementAreas: [],
            warps: {},
            layers: []
        }

        this.parseTilesets();
        this.parseLayers();
    }

    /**
     * We iterate through all the tilesets in the map file.
     * The `mobs` layer is parsed differently and allows us to
     * spawn entities later. The rest of the tilesets are parsed
     * individually and their tile properties are extracted.
     */

    parseTilesets() {
        if (!(this.data.tilesets instanceof Array)) {
            log.error('Invalid tileset format detected.')
            return;
        }

        _.each(this.data.tilesets, tileset => {
            const name = tileset.name.toLowerCase();

            switch (name) {
                case 'mobs':
                    
                    this.parseEntities(tileset);

                    break;

                default:

                    this.parseTileset(tileset);

                    break;
            }
        });
    }

    parseLayers() {
        _.each(this.data.layers, layer => {

            switch (layer.type) {
                case 'tilelayer':
                    this.parseTileLayer(layer);
                    break;

                case 'objectgroup':
                    this.parseObjectLayer(layer);
                    break;
            }

        });
    }

    parseEntities(tileset: any) {
        
        _.each(tileset.tiles, tile => {
            const tileId = this.getTileId(tileset, tile);

            this.map.entities[tileId] = {};

            _.each(tile.properties, property => {
                this.map.entities[tileId][property.name] = property.value;
            });
        });
    }

    parseStaticEntities(layer: any) {
        _.each(layer.data, (value, index) => {
            if (value < 1)
                return;

            if (value in this.map.entities)
                this.map.staticEntities[index] = this.map.entities[value];
        });
    }

    parsePlateau(layer: any) {
        const level = parseInt(layer.name.split('plateau')[1]);

        _.each(layer.data, (value, index) => {
            if (value < 1)
                return;

            // We skip collisions
            if (this.map.collisions.indexOf(value) > -1)
                return;
            
            this.map.plateau[index] = level;
        });
    }

    /**
     * We parse through the elements within a tileset, and handle
     * each tile's property individually. We then store that
     * data in the overall map file to be sent to the server.
     * 
     * @param tileset The tileset we are iterating through.
     */

    parseTileset(tileset: any) {

        _.each(tileset.tiles, tile => {
            const tileId = this.getTileId(tileset, tile);

            _.each(tile.properties, property => {
                this.parseProperties(tileId, property, tile.objectgroup);
            });
        });

    }

    /**
     * 
     * @param tileId The absolute tileId among all tilesets.
     * @param property The property we are iterating.
     * @param objectGroup The object group present (useful for collisions).
     */

    parseProperties(tileId: number, property: any, objectGroup?: any) {
        const name = property.name,
              value = parseInt(property.value, 10) || property.value;

        if (objectGroup && objectGroup.objects)
            _.each(objectGroup.objects, object => {
                if (!(tileId in this.map.polygons))
                    this.map.polygons[tileId] = this.parsePolygon(object.polygon, object.x, object.y);
            });

        if (this.isColliding(name) && !(tileId in this.map.polygons))
            this.map.collisions.push(tileId);

        switch (name) {
            case 'v':
                this.map.high.push(tileId);
                break;

            case 'o':
                this.map.objects.push(tileId);
                break;
            
            case 'tree':
                this.map.trees[tileId] = value;
                break;

            case 'rock':
                this.map.rocks[tileId] = value;
                break;

            case 'animation':
                this.map.animations[tileId] = 'animation-' + value;
                break;
        }
    }

    /**
     * We parse two types of layers separately from the rest.
     * The entities layer dictates where the entity will spawn.
     * The plateau layer indicates an imaginary z-index position.
     * We then decompress the layer data, and parse it.
     * 
     * @param layer A tile layer from Tiled map file.
     */

    parseTileLayer(layer: any) {
        const name = layer.name.toLowerCase();

        if (name === 'entities') {
            this.parseStaticEntities(layer);
            return;
        }

        if (name.startsWith('plateau')) {
            this.parsePlateau(layer);
            return;
        }

        this.parseTileLayerData(this.getCompressedData(layer.data, layer.compression));

        this.formatData();
    }

    /**
     * We parse through the layer data (after being decompressed if necessary)
     * then iterate through each index of the array. If the index exists in our
     * map data, we append it.
     * 
     * @param data The raw layer data containing tile ids.
     */

    parseTileLayerData(data: any) {
        _.each(data, (value, index) => {
            if (value < 1) return;

            if (!this.map.data[index]) this.map.data[index] = value;
            else if (_.isArray(this.map.data[index])) this.map.data[index].push(value);
            else this.map.data[index] = [this.map.data[index], value];
        });
    }

    /**
     * We parse through pre-defined object layers and add them
     * to the map data.
     * 
     * @param layer An object layer from Tiled map.
     */

    parseObjectLayer(layer: any) {
        const name = layer.name.toLowerCase();

        switch (name) {
            case 'doors': {
                const doors = layer.objects;

                _.each(doors, door => {
                    if (door.properties.length > 2) {
                        this.map.doors[door.id] = {
                            o: door.properties[0].value,
                            tx: parseInt(door.properties[1].value),
                            ty: parseInt(door.properties[2].value),
                            x: door.x / 16,
                            y: door.y / 16
                        };
                    }
                });

                break;
            }

            case 'warps': {
                const warps = layer.objects;

                _.each(warps, warp => {
                    this.map.warps[warp.name] = {
                        x: warp.x / 16,
                        y: warp.y / 16
                    };

                    _.each(warp.properties, (property) => {
                        if (property.name === 'level')
                            property.value = parseInt(property.value);

                        this.map.warps[warp.name][property.name] = property.value;
                    });
                });

                break;
            }

            case 'chestareas': {
                const cAreas = layer.objects;

                _.each(cAreas, area => {
                    const chestArea = {
                        x: area.x / this.map.tileSize,
                        y: area.y / this.map.tileSize,
                        width: area.width / this.map.tileSize,
                        height: area.height / this.map.tileSize
                    };

                    _.each(area.properties, (property) => {
                        chestArea['t' + property.name] = property.value;
                    });

                    this.map.chestAreas.push(chestArea);
                });

                break;
            }

            case 'chests': {
                const chests = layer.objects;

                _.each(chests, chest => {
                    const oChest: { [key: string]: number } = {
                        x: chest.x / this.map.tileSize,
                        y: chest.y / this.map.tileSize
                    };

                    _.each(chest.properties, (property) => {
                        if (property.name === 'items') oChest.i = property.value.split(',');
                        else oChest[property.name] = property.value;
                    });

                    this.map.chests.push(oChest);
                });

                break;
            }

            case 'lights': {
                const lights = layer.objects;

                _.each(lights, lightObject => {
                    const light = {
                        x: lightObject.x / 16 + 0.5,
                        y: lightObject.y / 16 + 0.5
                    };

                    _.each(lightObject.properties, (property) => {
                        light[property.name] = property.value;
                    });

                    this.map.lights.push(light);
                });

                break;
            }

            case 'music': {
                const mAreas = layer.objects;

                _.each(mAreas, area => {
                    const musicArea = {
                        x: area.x / this.map.tileSize,
                        y: area.y / this.map.tileSize,
                        width: area.width / this.map.tileSize,
                        height: area.height / this.map.tileSize
                    };

                    _.each(area.properties, (property) => {
                        musicArea[property.name] = property.value;
                    });

                    this.map.musicAreas.push(musicArea);
                });

                break;
            }

            case 'pvp': {
                const pAreas = layer.objects;

                _.each(pAreas, area => {
                    const pvpArea = {
                        x: area.x / this.map.tileSize,
                        y: area.y / this.map.tileSize,
                        width: area.width / this.map.tileSize,
                        height: area.height / this.map.tileSize
                    };

                    this.map.pvpAreas.push(pvpArea);
                });

                break;
            }

            case 'overlays': {
                const overlayAreas = layer.objects;

                _.each(overlayAreas, area => {
                    const oArea = {
                        id: area.id,
                        x: area.x / this.map.tileSize,
                        y: area.y / this.map.tileSize,
                        width: area.width / this.map.tileSize,
                        height: area.height / this.map.tileSize
                    };

                    _.each(area.properties, (property) => {
                        oArea[property.name] = isNaN(property.value)
                            ? property.value
                            : parseFloat(property.value);
                    });

                    this.map.overlayAreas.push(oArea);
                });

                break;
            }

            case 'camera': {
                const cameraAreas = layer.objects;

                _.each(cameraAreas, area => {
                    const cArea = {
                        id: area.id,
                        x: area.x / this.map.tileSize,
                        y: area.y / this.map.tileSize,
                        width: area.width / this.map.tileSize,
                        height: area.height / this.map.tileSize,
                        type: area.properties[0].value
                    };

                    this.map.cameraAreas.push(cArea);
                });

                break;
            }

            case 'achievements': {
                const achievementAreas = layer.objects;

                _.each(achievementAreas, area => {
                    const achievementArea = {
                        id: area.id,
                        x: area.x / this.map.tileSize,
                        y: area.y / this.map.tileSize,
                        width: area.width / this.map.tileSize,
                        height: area.height / this.map.tileSize,
                        achievement: area.properties[0].value
                    };

                    this.map.achievementAreas.push(achievementArea);
                });

                break;
            }

            case 'games': {
                const gAreas = layer.objects;

                _.each(gAreas, area => {
                    const gameArea = {
                        x: area.x / this.map.tileSize,
                        y: area.y / this.map.tileSize,
                        width: area.width / this.map.tileSize,
                        height: area.height / this.map.tileSize
                    };

                    this.map.gameAreas.push(gameArea);
                });

                break;
            }
        }
    }

    /* The way Tiled processes polygons is by using the first point
     * as the pivot point around where the rest of the shape is drawn.
     * This can create issues if we start at different point on the shape,
     * so the solution is to append the offset to each point.
     */

   parsePolygon(polygon: any, offsetX: number, offsetY: number) {
       let formattedPolygons = [];

       _.each(polygon, (p: any) => {
           formattedPolygons.push({
               x: p.x + offsetX,
               y: p.y + offsetY
           })
       });

       return formattedPolygons;
   }

    /**
     * We are generating a map data array without defining preliminary
     * variables. In other words, we are accessing indexes of the array
     * ahead of time, so JavaScript engine just fills in values in the array
     * for us. In this case, it fills in with `null`.
     * 
     * An example is accessing index 4 of an empty array and setting value
     * 5 at that index. Because of this, index 0, 1, 2, 3 are going to be
     * set to null. We need to get rid of these values before sending data
     * to the server.
     */

    formatData() {
        _.each(this.map.data, (value, index) => {
            if (!value) this.map.data[index] = 0;
        });
    }

    /**
     * This function allows us to decompress data from the Tiled editor
     * map file. Thus far, our parser only supports zlib, gzip, and CSV
     * in the JSON file-format. Further support is not entirely necessary
     * but should be considered.
     * 
     * @param data The we will be parsing, base64 string format 
     * for compressed data, and string for uncompressed data.
     * @param type The type of compression 'zlib', 'gzip', '' are accepted inputs.
     */

    getCompressedData(data: any, type: string): number[] {
        if (_.isArray(data))
            return data;

        let dataBuffer = Buffer.from(data, 'base64'),
            inflatedData: Buffer;

        switch (type) {

            case 'zlib':
                inflatedData = zlib.inflateSync(dataBuffer);
                break;

            case 'gzip':
                inflatedData = zlib.gunzipSync(dataBuffer);
                break;

            default:
                log.error('Invalid compression format detected.');
                return;

        }

        if (!inflatedData) return;

        let size = this.map.width * this.map.height * 4,
            layerData: number[] = [];

        if (inflatedData.length !== size) {
            log.error('Invalid buffer detected while parsing layer.');
            return;
        }

        for (var i = 0; i < size; i += 4)
            layerData.push(inflatedData.readUInt32LE(i));

        return layerData;
    }

    /**
     * We are using a unified function in case we need to make adjustments
     * to how we process tiling indexes. An example is not having to go through
     * all the instances of tileId calculations to modify one variable. This
     * is just an overall more organized way of doing work.
     * 
     * @param tileset A tileset layer that we are parsing.
     * @param tile The current tile that we are parsing through.
     * @param offset The offset of the tileIndex.
     */

    getTileId(tileset: any, tile: any, offset = 0) {
        return tileset.firstgid + tile.id + offset;
    }

    getMap(): string {
        return JSON.stringify(this.map);
    }

    isColliding(property: string) {
        return property === 'c' || property === 'o';
    }
}