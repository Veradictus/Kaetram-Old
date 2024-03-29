import Modules from '@kaetram/server/ts/util/modules';
import Equipment from './equipment';

export default class Head extends Equipment {

    constructor(id: number, ability: number, abilityLevel: number) {
        super(id, 1, ability, abilityLevel);

        super.type = Modules.Equipment.Head;
    }

}