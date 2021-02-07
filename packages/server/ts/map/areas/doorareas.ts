import Areas from './areas';
import World from '@kaetram/ts/game/world';

import map from '../../../data/map/world.json';
import Area from '../area';

export default class DoorAreas extends Areas {

    constructor(world?: World) {
        super(world);

        super.load(map.doors, (doorArea: Area, rawData: any) => {
            doorArea.tx = rawData.tx;
            doorArea.ty = rawData.ty;
        });

        super.message('door');
    }
}
