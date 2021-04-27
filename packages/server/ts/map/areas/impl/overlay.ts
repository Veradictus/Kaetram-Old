import Area from '../area';
import Areas from '../areas';
import World from '@kaetram/ts/game/world';

export default class Overlay extends Areas {

    constructor(data: any, world?: World) {
        super(data, world);

        super.load(this.data, (overlayArea: Area, rawData: any) => {
            let red = parseFloat((rawData.r / 255).toFixed(4)),
                green = parseFloat((rawData.g / 255).toFixed(4)),
                blue = parseFloat((rawData.b / 255).toFixed(4)),
                alpha = parseFloat((rawData.a / 255).toFixed(4));

            overlayArea.overlayColour = {
                red: red,
                green: green,
                blue: blue,
                alpha: alpha
            };
        });

        super.message('camera');
    }

}