import Area from '../area';
import Areas from '../areas';
import World from '@kaetram/ts/game/world';

export default class Camera extends Areas {

    constructor(data: any, world?: World) {
        super(data, world);

        super.load(this.data, (cameraArea: Area, rawData: any) => {
            cameraArea.cameraType = rawData.type;
        });

        super.message('camera');
    }

}