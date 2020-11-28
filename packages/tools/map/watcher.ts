import fs from 'fs';

import ParseMap from './parsemap';
import Utils from '../../server/ts/util/utils';
import log from '../../server/ts/util/log';

class Watcher {

    map: string;
    parser: ParseMap;

    ready: boolean;

    constructor() {
        this.map = process.argv[2];
        this.parser = new ParseMap(this.map);

        if (!this.parser.ready) {
            log.error('The map file could not be loaded.');
            return;
        }

        this.parser.parse();

        this.parser.onMap((message) => {
            log.notice(message);

            if (!this.ready) this.load();
        });
    }

    load() {
        fs.watchFile(this.map, () => {
            this.handleChanges();
        });

        log.notice('Map watcher has successfully initalized.');

        this.ready = true;
    }

    handleChanges() {
        let data = fs.readFileSync(this.map, {
            encoding: 'utf8',
            flag: 'r'
        });

        if (!data) return;

        let checksum = Utils.getChecksum(data);

        console.log('Watcher Checksum: ' + checksum);
        console.log('Parser Checksum: ' + this.parser.checksum);

        if (checksum === this.parser.checksum)
            return;

        this.parser.parse();
    }
}

export default Watcher;

new Watcher();