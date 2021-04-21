import Areas from '../areas';
import World from '@kaetram/ts/game/world';

export default class PVP extends Areas {

    constructor(data: any, world?: World) {
        super(data, world);

        super.load(this.data);

        super.message('PVP');
    }

}