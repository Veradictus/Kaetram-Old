import _ from 'lodash';

import Area from '../area';
import Areas from '../areas';
import World from '@kaetram/ts/game/world';

export default class Doors extends Areas {

    private areasCopy: Area[];

    constructor(data: any, world?: World) {
        super(data, world);

        super.load(this.data, (doorArea: Area, rawData: any) => {
            doorArea.destinationId = rawData.destination;
        }, true);

        this.areasCopy = _.cloneDeep(this.areas);

        this.linkDoors();

        super.message('door');
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
