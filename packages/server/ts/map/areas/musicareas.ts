import Areas from './areas';
import World from '@kaetram/ts/game/world';

import map from '../../../data/map/world.json';
import Area from '../area';

export default class MusicAreas extends Areas {

    constructor(world?: World) {
        super(world);

        super.load(map.musicAreas, (musicArea: Area, rawData: any) => {
            musicArea.song = rawData.songName;
        });

        super.message('music');
    }

}