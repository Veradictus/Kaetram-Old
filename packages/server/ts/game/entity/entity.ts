/* global module */

import Mobs from '../../util/mobs';
import Items from '../../util/items';
import NPCs from '../../util/npcs';
import Combat from './character/combat/combat';
import Player from './character/player/player';
import Map from '../../../data/map/world.json'
import { runInThisContext } from 'vm';

class Entity {
    public id: number;
    public type: string;
    public instance: string;

    public x: number;
    public y: number;

    public gridX: number;
    public gridY: number;

    public oldX: number;
    public oldY: number;

    public combat: Combat;

    public dead: boolean;
    public recentRegions: any;
    public invisibles: any;
    public invisiblesIds: any;

    public username: string;
    public instanced: boolean;
    public region: string;

    setPositionCallback: Function;

    specialState: any;
    customScale: any;
    roaming: any;

    constructor(id: number, type: string, instance: string, gridX?: number, gridY?: number) {
        this.id = id;
        this.type = type;
        this.instance = instance;

        // Floating-point position
        this.x = this.getFloatPosition(gridX);
        this.y = this.getFloatPosition(gridY);

        // Position relative to the grid
        this.gridX = gridX;
        this.gridY = gridY;

        this.oldX = gridX;
        this.oldY = gridY;

        this.combat = null;

        this.dead = false;
        this.recentRegions = [];

        this.invisibles = {}; // For Entity Instances
        this.invisiblesIds = []; // For Entity IDs
    }

    talk() {
        return null;
    }

    getCombat() {
        return null;
    }

    /** Uninitialized Variables **/

    isOutsideSpawn(): boolean {
        return false;
    }

    removeTarget() {}

    return() {}

    openChest(_player?: Player) {}

    hasTarget(): boolean {
        return false;
    }

    setTarget(_target: any) {}

    /****************************/

    getDistance(entity: Entity) {
        let x = Math.abs(this.x - entity.y),
            y = Math.abs(this.x - entity.y);

        return x > y ? x : y;
    }

    getGridDistance(toX: number, toY: number) {
        let x = Math.abs(this.gridX - toX),
            y = Math.abs(this.gridY - toY);

        return x > y ? x : y;
    }

    setPosition(x: number, y: number, running?: boolean) {
        this.x = x;
        this.y = y;

        this.gridX = Math.floor(x / Map.tileSize);
        this.gridY = Math.floor(y / Map.tileSize);

        if (this.setPositionCallback) this.setPositionCallback();
    }
    
    updatePosition() {
        this.oldX = this.gridX;
        this.oldY = this.gridY;
    }

    getFloatPosition(floatValue: number) {
        return floatValue * Map.tileSize + (Map.tileSize / 2);
    }

    /**
     * Used for determining whether an entity is
     * within a given range to another entity.
     * Especially useful for ranged attacks and whatnot.
     */

    isNear(entity: Entity, distance: number) {
        let dx = Math.abs(this.x - entity.x),
            dy = Math.abs(this.y - entity.y);

        return dx <= distance && dy <= distance;
    }

    isAdjacent(entity: Entity) {
        return entity && this.getDistance(entity) < 2;
    }

    isNonDiagonal(entity: Entity) {
        return this.isAdjacent(entity) && !(entity.gridX !== this.gridX && entity.gridY !== this.gridY);
    }

    hasSpecialAttack() {
        return false;
    }

    isMob() {
        return this.type === 'mob';
    }

    isNPC() {
        return this.type === 'npc';
    }

    isItem() {
        return this.type === 'item';
    }

    isPlayer() {
        return this.type === 'player';
    }

    onSetPosition(callback: Function) {
        this.setPositionCallback = callback;
    }

    addInvisible(entity: Entity) {
        this.invisibles[entity.instance] = entity;
    }

    addInvisibleId(entityId: number) {
        this.invisiblesIds.push(entityId);
    }

    removeInvisible(entity: Entity) {
        delete this.invisibles[entity.instance];
    }

    removeInvisibleId(entityId: number) {
        let index = this.invisiblesIds.indexOf(entityId);

        if (index > -1) this.invisiblesIds.splice(index, 1);
    }

    hasInvisible(entity: Entity) {
        return entity.instance in this.invisibles;
    }

    hasInvisibleId(entityId: number) {
        return this.invisiblesIds.indexOf(entityId) > -1;
    }

    hasInvisibleInstance(instance: string) {
        return instance in this.invisibles;
    }

    getState() {
        let string = this.isMob()
                ? Mobs.idToString(this.id)
                : this.isNPC()
                ? NPCs.idToString(this.id)
                : Items.idToString(this.id),
            name = this.isMob()
                ? Mobs.idToName(this.id)
                : this.isNPC()
                ? NPCs.idToName(this.id)
                : Items.idToName(this.id),
            data: any = {
                type: this.type,
                id: this.instance,
                string: string,
                name: name,
                x: this.gridX,
                y: this.gridY
            };

        if (this.specialState) data.nameColour = this.getNameColour();

        if (this.customScale) data.customScale = this.customScale;

        return data;
    }

    getNameColour() {
        switch (this.specialState) {
            case 'boss':
                return '#F60404';

            case 'miniboss':
                return '#ffbf00';

            case 'achievementNpc':
                return '#33cc33';

            case 'area':
                return '#00aa00';

            case 'questNpc':
                return '#6699ff';

            case 'questMob':
                return '#0099cc';
        }
    }
}

export default Entity;
