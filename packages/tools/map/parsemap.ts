#!/usr/bin/env ts-node

import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import log from '../../server/ts/util/log';

import MapData from './mapdata';
import Parser from './parser';

const relative = (dir: string): string => path.relative('../../', dir);

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
            this.handle(JSON.parse(data.toString()));
        });
    }

    handle(data: MapData) {
        let destination = '../../server/data/map/world.json',
            parser = new Parser(data);
        
        parser.parse();
        
        fs.writeFile(destination, parser.getMap(), error => {
            if (error) throw 'An error has occurred while writing map files.';
            else log.notice(`[ParseMap] Map successfully saved at ${relative(destination)}`)
        });
    }

    mapValid() {
        return this.map && fs.existsSync(this.map);
    }

}

export default ParseMap;

new ParseMap();