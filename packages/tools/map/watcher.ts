import fs from 'fs';

import ParseMap from './parsemap';
import Utils from '../../server/ts/util/utils';
import log from '../../server/ts/util/log';

class Watcher {

    map: string;
    parser: ParseMap;

    ready: boolean;

    constructor() {
        this.map = this.getMap();
        this.parser = new ParseMap(this.map);
        
        if (!this.parser.ready) {
            log.error('The map file could not be loaded.');
            return;
        }

        this.parser.parse();

        this.parser.onMap((message: string) => {
            log.notice(message);

            if (!this.isWatcher()) return;

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

        log.debug('Watcher Checksum: ' + checksum);
        log.debug('Parser Checksum: ' + this.parser.checksum);

        if (checksum === this.parser.checksum)
            return;

        this.parser.parse();
    }

    isWatcher() {
        return process.argv.length > 3;
    }

    getMap() {
        return this.isWatcher() ? process.argv[3] : process.argv[2];
    }
}

export default Watcher;

new Watcher();