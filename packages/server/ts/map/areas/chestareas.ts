import Area from '../area';
import Areas from './areas';
import World from '@kaetram/ts/game/world';
import Utils from '../../util/utils';

import map from '../../../data/map/world.json';

export default class ChestAreas extends Areas {

    constructor(world?: World) {
        super(world);

        super.load(map.chestAreas, (chestArea: Area, rawData: any) => {
            chestArea.maxEntities = rawData.entities || 0;
            chestArea.items = rawData.items.split(',');

            chestArea.cx = rawData.cx;
            chestArea.cy = rawData.cy;

            if (rawData.achievement)
                chestArea.achievement = rawData.achievement;

            chestArea.onEmpty(() => {
                this.spawnChest(chestArea);
            });

            chestArea.onSpawn(() => {
                this.removeChest(chestArea);
            });
        });

        super.message('chest');
    }

    spawnChest(chestArea: Area) {
        if (Utils.timePassed(chestArea.lastSpawn, chestArea.spawnDelay)) return;

        chestArea.chest = this.world.spawnChest(
            chestArea.items,
            chestArea.cx,
            chestArea.cy,
            null, false
        );

        chestArea.lastSpawn = Date.now();
    }

    removeChest(chestArea: Area) {
        if (!chestArea.chest) return;

        this.world.removeChest(chestArea.chest);
        
        chestArea.chest = null;
    }

}