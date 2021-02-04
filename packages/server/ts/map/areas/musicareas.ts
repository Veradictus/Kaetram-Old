import Areas from './areas';
import World from '@kaetram/ts/game/world';

import map from '../../../data/map/world.json';

export default class MusicAreas extends Areas {

    constructor(world?: World) {
        super(world);

        super.load(map.musicAreas);

        super.message('music');
    }

}