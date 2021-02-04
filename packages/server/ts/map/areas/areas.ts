import _ from 'lodash';
import Area from '../area';
import World from '../../game/world';
import log from '../../util/log';

export default class Areas {
    public world: World;
    public areas: Area[];

    constructor(world?: World) {
        this.world = world;

        this.areas = [];
    }

    load(mapAreas: any, callback?: Function) {
        _.each(mapAreas, (a: any) => {
            let area: Area = new Area(a.x, a.y, a.width, a.height);

            this.areas.push(area);

            if (callback) callback(this.areas[this.areas.length - 1], a);
        });
    }

    message(type: string) {
        log.info(`Loaded ${this.areas.length} ${type} areas.`);
    }
    
    inArea(x: number, y: number) {
        return _.find(this.areas, (area: Area) => {
            return area.contains(x, y);
        });
    }
}