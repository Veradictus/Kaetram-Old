import Modules from '@kaetram/server/ts/util/modules';
import Equipment from './equipment';

export default class Quiver extends Equipment {

    constructor(id: number, count: number, ability: number, abilityLevel: number) {
        super(id, count, ability, abilityLevel);

        super.type = Modules.Equipment.Weapon;
    }

}