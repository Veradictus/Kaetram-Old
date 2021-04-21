export interface Area {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    properties: { [property: string]: string | number }
}

export interface MapData {
    width: number;
    height: number;
    tileSize: number;
    version: number;

    data: any[];

    collisions: number[];
    blocking: number[];
    openables: any;
    polygons: any;
    entities: any;
    staticEntities: any;
    animations: any;

    plateau: any;

    lights: any[];
    high: any[];
    objects: any[];
    trees: any;
    treeIndexes: any[];
    rocks: any;
    rockIndexes: any[];
    layers: any[];

    areas: { [name: string]: Area[] };
}

export default MapData;