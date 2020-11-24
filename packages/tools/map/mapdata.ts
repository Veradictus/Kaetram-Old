export interface MapData {
    width: number;
    height: number;
    tileSize: number;
    version: number;
    depth?: number;

    collisions: number[];
    //tileCollisions: number[];
    polygons: any;

    entities: any;

    lights?: any[];
    high?: any[];
    animated?: any;
    tilesets?: any[];
    animations?: any;
    data?: any[];
    objects?: any[];
    cursors?: any;
    trees?: any;
    treeIndexes?: any[];
    rocks?: any;
    rockIndexes?: any[];
    pvpAreas?: any[];
    gameAreas?: any[];
    doors?: any;
    musicAreas?: any[];
    staticEntities?: any;
    chestAreas?: any[];
    chests?: any[];
    overlayAreas?: any[];
    cameraAreas?: any[];
    tilewidth?: number;
    achievementAreas?: any[];
    plateau?: any;
    warps?: any;
    tilesize?: number;
    layers?: any[];
}

export default MapData;