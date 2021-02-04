import Area from '../area';
import Areas from './areas';
import World from '@kaetram/ts/game/world';

import map from '../../../data/map/world.json';

export default class CameraAreas extends Areas {

    constructor(world?: World) {
        super(world);

        super.load(map.cameraAreas, (cameraArea: Area, rawData: any) => {
            cameraArea.cameraType = rawData.type;
        });

        super.message('camera');
    }

}