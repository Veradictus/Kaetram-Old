import _ from 'lodash';

import Areas from './areas';
import World from '@kaetram/ts/game/world';

import map from '../../../data/map/world.json';
import Area from '../area';

export default class DoorAreas extends Areas {

    private areasCopy: Area[];

    constructor(world?: World) {
        super(world);

        super.load(map.doors, (doorArea: Area, rawData: any) => {
            doorArea.destinationId = rawData.destination; 
        });

        this.areasCopy = _.cloneDeep(this.areas);

        this.linkDoors();

        super.message('door');

        console.log(this.areas);
    }

    linkDoors() {
        _.each(this.areas, (doorArea: Area) => {
            let destination: Area = this.getDoor(doorArea.destinationId);

            if (destination) doorArea.destination = destination;
        });
    }

    getDoor(id: number): Area {
        return _.find(this.areasCopy, (doorArea: Area) => {
            return doorArea.id === id;
        });
    }
}
