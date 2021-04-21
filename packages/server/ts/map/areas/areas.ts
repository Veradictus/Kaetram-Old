import _ from 'lodash';
import Area from './area';
import World from '../../game/world';
import log from '../../util/log';

export default class Areas {
    public data: any;
    public world: World;
    public areas: Area[];

    constructor(data: any, world?: World) {
        this.data = data;
        this.world = world;

        this.areas = [];
    }

    /**
     * Elegant way of loading objects without repetitious code. Use margin when you want
     * objects that may contain a discrepancy with the client-side or when entering them
     * the position changes. For example, the client sends a signal when the player enters
     * the door, but his position still shifts. So he is technically in the door, we can
     * assume a margin of error of a couple pixels.
     * 
     * @param mapAreas The raw data that we are parsing through. Generally obtained from the map file.
     * @param callback We callback the raw data in the map file so that we can access it.
     * @param margin If we choose to use a margin of error within each areas. Useful for doors.
     */

    load(mapAreas: any, callback?: Function, margin?: boolean) {
        _.each(mapAreas, (a: any) => {
            let area: Area = new Area(a.id, a.x, a.y, a.width, a.height);

            area.margin = margin;

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