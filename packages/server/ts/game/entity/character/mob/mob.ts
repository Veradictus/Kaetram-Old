import _ from 'lodash';
import Character from '../character';
import Mobs from '../../../../util/mobs';
import Utils from '../../../../util/utils';
import Items from '../../../../util/items';
import Constants from '../../../../util/constants';
import MobHandler from './mobhandler';
import Player from '../player/player';
import Area from '../../../../map/areas/area';
import Areas from '../../../../map/areas/areas';

class Mob extends Character {
    data: any;
    drops: any;

    respawnDelay: number;

    boss: boolean;
    static: boolean;
    hiddenName: boolean;
    miniboss: boolean;

    achievementId: number;

    maxRoamingDistance: number;

    handler: MobHandler;

    loadCallback: Function;
    refreshCallback: Function;
    respawnCallback: Function;
    returnCallback: Function;
    forceTalkCallback: Function;
    roamingCallback: Function;

    area: Area;

    constructor(id: number, instance: string, gridX: number, gridY: number) {
        super(id, 'mob', instance, gridX, gridY);

        if (!Mobs.exists(id)) return;

        this.data = Mobs.Ids[this.id];
        this.hitPoints = this.data.hitPoints;
        this.maxHitPoints = this.data.hitPoints;
        this.drops = this.data.drops;

        this.respawnDelay = this.data.spawnDelay;

        this.level = this.data.level;

        this.armourLevel = this.data.armour;
        this.weaponLevel = this.data.weapon;
        this.attackRange = this.data.attackRange;
        this.aggroRange = this.data.aggroRange;
        this.aggressive = this.data.aggressive;
        this.attackRate = this.data.attackRate;
        this.movementSpeed = this.data.movementSpeed;

        this.spawnLocation = [gridX, gridY];

        this.dead = false;
        this.boss = false;
        this.static = false;
        this.hiddenName = false;

        this.roaming = false;
        this.maxRoamingDistance = 3;

        this.projectileName = this.getProjectileName();
    }

    load() {
        this.handler = new MobHandler(this);

        if (this.loadCallback) this.loadCallback();
    }

    refresh() {
        this.hitPoints = this.data.hitPoints;
        this.maxHitPoints = this.data.hitPoints;

        if (this.refreshCallback) this.refreshCallback();
    }

    getDrop() {
        if (!this.drops) return null;

        let random = Utils.randomInt(0, Constants.DROP_PROBABILITY),
            dropObjects = Object.keys(this.drops),
            item = dropObjects[Utils.randomInt(0, dropObjects.length - 1)];

        if (random > this.drops[item]) return null;

        let count = item === 'gold' ? Utils.randomInt(this.level, this.level * 5) : 1;

        return {
            id: Items.stringToId(item),
            count: count
        };
    }

    getProjectileName() {
        return this.data.projectileName ? this.data.projectileName : 'projectile-pinearrow';
    }

    canAggro(player: Player) {
        if (this.hasTarget()) return false;

        if (!this.aggressive) return false;

        if (Math.floor(this.level * 1.5) < player.level && !this.alwaysAggressive) return false;

        if (!player.hasAggressionTimer()) return false;

        return this.isNear(player, this.aggroRange);
    }

    destroy() {
        this.dead = true;
        this.clearTarget();
        this.resetPosition();
        this.respawn();

        if (this.area) this.area.removeEntity(this);
    }

    return() {
        this.clearTarget();
        this.resetPosition();
        this.setPosition(this.gridX, this.gridY);
    }

    isRanged() {
        return this.attackRange > 1;
    }

    distanceToSpawn() {
        return this.getGridDistance(this.spawnLocation[0], this.spawnLocation[1]);
    }

    isAtSpawn() {
        return this.gridX === this.spawnLocation[0] && this.gridY === this.spawnLocation[1];
    }

    isOutsideSpawn() {
        return this.distanceToSpawn() > this.spawnDistance;
    }

    addToChestArea(chestAreas: Areas) {
        let area = chestAreas.inArea(this.x, this.y);

        if (area) area.addEntity(this);
    }

    respawn() {
        /**
         * Some entities are static (only spawned once during an event)
         * Meanwhile, other entities act as an illusion to another entity,
         * so the resawning script is handled elsewhere.
         */

        if (!this.static || this.respawnDelay === -1) return;

        setTimeout(() => {
            if (this.respawnCallback) this.respawnCallback();
        }, this.respawnDelay);
    }

    getState() {
        let base = super.getState();

        base.hitPoints = this.hitPoints;
        base.maxHitPoints = this.maxHitPoints;
        base.attackRange = this.attackRange;
        base.level = this.level;
        base.hiddenName = this.hiddenName; // TODO - Just don't send name when hiddenName present.

        return base;
    }

    resetPosition() {
        this.setPosition(this.spawnLocation[0], this.spawnLocation[1]);
    }

    onLoad(callback: Function) {
        this.loadCallback = callback;
    }

    onRespawn(callback: Function) {
        this.respawnCallback = callback;
    }

    onReturn(callback: Function) {
        this.returnCallback = callback;
    }

    onForceTalk(callback: Function) {
        this.forceTalkCallback = callback;
    }

    onRoaming(callback: Function) {
        this.roamingCallback = callback;
    };

    onRefresh(callback: Function) {
        this.refreshCallback = callback;
    }
}

export default Mob;
