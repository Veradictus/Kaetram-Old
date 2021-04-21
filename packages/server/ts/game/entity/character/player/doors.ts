import config from '../../../../../config';
import _ from 'lodash';
import World from '../../../world';
import Player from './player';
import Map from '../../../../map/map';
import Regions from '../../../../map/regions';
import Area from '@kaetram/ts/map/areas/area';

import DoorData from '../../../../../data/doors.json';
import Modules from '../../../../util/modules';

class Doors {
    public world: World;
    public player: Player;
    public map: Map;
    public regions: Regions;

    public doors: any;

    constructor(player: Player) {
        this.world = player.world;
        this.player = player;
        this.map = this.world.map;
        this.regions = this.map.regions;

        this.doors = this.world.getArea(Modules.Areas.Doors).areas;
    }

    getAllTiles() {

    }

    hasCollision(x: number, y: number) {

    }

    getDestination(door: Area) {

        return {
            x: door.destination.x + (door.destination.width / 2),
            y: door.destination.y + (door.destination.height / 2)
        }
    }
}

export default Doors;
