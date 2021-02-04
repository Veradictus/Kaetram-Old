import Area from '../area';
import Areas from './areas';
import World from '@kaetram/ts/game/world';

import map from '../../../data/map/world.json';

export default class AchievementAreas extends Areas {

    constructor(world?: World) {
        super(world);

        super.load(map.achievementAreas, (achievementArea: Area, rawData: any) => {
            achievementArea.achievement = rawData.achievement;
        });

        super.message('achievement');
    }

}