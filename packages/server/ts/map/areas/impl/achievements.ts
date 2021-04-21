import Area from '../area';
import Areas from '../areas';
import World from '@kaetram/ts/game/world';

export default class Achievements extends Areas {

    constructor(data: any, world?: World) {
        super(data, world);

        super.load(this.data, (achievementArea: Area, rawData: any) => {
            achievementArea.achievement = rawData.achievement;
        });

        super.message('achievement');
    }

}