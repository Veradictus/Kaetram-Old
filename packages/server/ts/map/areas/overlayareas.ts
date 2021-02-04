import Area from '../area';
import Areas from './areas';
import World from '@kaetram/ts/game/world';

import map from '../../../data/map/world.json';

export default class OverlayAreas extends Areas {

    constructor(world?: World) {
        super(world);

        super.load(map.overlayAreas, (overlayArea: Area, rawData: any) => {
            overlayArea.darkness = rawData.darkness;
            overlayArea.type = rawData.type;

            if (rawData.fog) overlayArea.fog = rawData.fog;
        });

        super.message('camera');
    }

}