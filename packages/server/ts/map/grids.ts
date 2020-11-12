/* global module */

import _ from 'lodash';
import Map from './map';
import Entity from '../game/entity/entity';

class Grids {
    map: Map;
    entityGrid: any;

    constructor(map: Map) {
        this.map = map;

        this.entityGrid = [];

        this.load();
    }

    load() {
        for (let i = 0; i < this.map.height; i++) {
            this.entityGrid[i] = [];

            for (let j = 0; j < this.map.width; j++) this.entityGrid[i][j] = {};
        }
    }

    updateEntityPosition(entity: Entity) {
        if (entity && entity.oldX === entity.gridX && entity.oldY === entity.gridY) return;

        this.removeFromEntityGrid(entity, entity.oldX, entity.oldY);
        this.addToEntityGrid(entity, entity.gridX, entity.gridY);

        entity.updatePosition();
    }

    addToEntityGrid(entity: Entity, gridX: number, gridY: number) {
        if (
            entity &&
            gridX > 0 &&
            gridY > 0 &&
            gridX < this.map.width &&
            gridY < this.map.height &&
            this.entityGrid[gridY][gridX]
        )
            this.entityGrid[gridY][gridX][entity.instance] = entity;
    }

    removeFromEntityGrid(entity: Entity, gridX: number, gridY: number) {
        if (
            entity &&
            gridX > 0 &&
            gridY > 0 &&
            gridX < this.map.width &&
            gridY < this.map.height &&
            this.entityGrid[gridY][gridX] &&
            entity.instance in this.entityGrid[gridY][gridX]
        )
            delete this.entityGrid[gridY][gridX][entity.instance];
    }

    getSurroundingEntities(entity: Entity, radius?: number, include?: boolean) {
        let entities = [];

        if (!this.checkBounds(entity.gridX, entity.gridY, radius)) return;

        for (let i = -radius; i < radius + 1; i++) {
            for (let j = -radius; j < radius + 1; j++) {
                let pos = this.entityGrid[entity.gridY + i][entity.gridX + j];

                if (_.size(pos) > 0) {
                    _.each(pos, (pEntity: Entity) => {
                        if (!include && pEntity.instance !== entity.instance)
                            entities.push(pEntity);
                    });
                }
            }
        }

        return entities;
    }

    checkBounds(gridX: number, gridY: number, radius?: number) {
        return (
            gridX + radius < this.map.width &&
            gridX - radius > 0 &&
            gridY + radius < this.map.height &&
            gridY - radius > 0
        );
    }
}

export default Grids;
