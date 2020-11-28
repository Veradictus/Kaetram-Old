#!/usr/bin/env ts-node

import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import log from '../../server/ts/util/log';

import MapData from './mapdata';
import Utils from '../../server/ts/util/utils';
import Parser from './parser';

const relative = (dir: string): string => path.relative('../../', dir);

class ParseMap {

    map: string; // The map we are going to parse
    checksum: string;

    ready: boolean;

    mapCallback: Function;

    constructor(map: string) {
        this.map = map;

        this.verifyMap();
    }

    parse() {
        let data = fs.readFileSync(this.map, {
            encoding: 'utf8',
            flag: 'r'
        });

        if (!data) {
            log.error('An error has occurred while trying to read the map.');
            return;
        }

        this.handle(JSON.parse(data));

        this.checksum = Utils.getChecksum(data);
    }

    handle(data: MapData) {
        let destination = '../../server/data/map/world.json',
            parser = new Parser(data);
        
        parser.parse();
        
        fs.writeFile(destination, parser.getMap(), error => {
            if (error) throw 'An error has occurred while writing map files.';

            if (this.mapCallback) this.mapCallback(`[ParseMap] Map successfully saved at ${relative(destination)}`);
        });
    }

    verifyMap() {
        this.ready = this.map && fs.existsSync(this.map);
    }

    onMap(callback: Function) {
        this.mapCallback = callback;
    }

}

export default ParseMap;