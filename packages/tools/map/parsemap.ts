import fs from 'fs';
import _ from 'lodash';
import log from '../../server/ts/util/log';

class ParseMap {

    map: string; // The map we are going to parse

    constructor() {
        this.map = process.argv[2];

        if (!this.mapValid()) {
            log.error('Invalid map file specified.');
            return;
        }

        fs.readFile(this.map, (error, data) => {
            if (error) throw error;
            this.parse(JSON.parse(data.toString()));
        });
    }

    parse(data: any) {
        console.log(data);
    }

    mapValid() {
        return this.map && fs.existsSync(this.map);
    }

}

export default ParseMap;

new ParseMap();