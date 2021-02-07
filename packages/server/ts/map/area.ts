/* global module */

import Mob from '../game/entity/character/mob/mob';
import Player from '../game/entity/character/player/player';

import Constants from '../util/constants';

class Area {
    public id: number;
    public x: number;
    public y: number;
    public width: number;
    public height: number;

    public entities: any;
    public chest: any;
    public items: any;

    public hasRespawned: boolean;

    // Overlay properties
    public darkness: string;
    public type: string;
    public fog: boolean;

    // Properties it can hold
    public achievement: number;
    public cameraType: string;
    public song: string;

    // Door coordinates
    public destinationId: number;
    public destination: Area;

    // Chest coordinates
    public cx: number;
    public cy: number;

    public maxEntities: number;
    public spawnDelay: number;
    public lastSpawn: number;

    private spawnCallback: Function;
    private emptyCallback: Function;


    constructor(id: number, x: number, y: number, width: number, height: number) {
        this.id = id;

        this.x = x;
        this.y = y;

        this.width = width + Constants.POSITION_OFFSET;
        this.height = height + Constants.POSITION_OFFSET;

        this.entities = [];
        this.items = [];

        this.hasRespawned = true;
        this.chest = null;

        this.maxEntities = 0;
        this.spawnDelay = 0;
    }

    contains(x: number, y: number) {
        return x >= this.x && y >= this.y && x < this.x + this.width && y < this.y + this.height;
    }

    addEntity(mob: Mob) {
        if (this.entities.indexOf(mob) > 0) return;

        this.entities.push(mob);
        mob.area = this;

        // Grab a spawn delay from a mob to create an offset for the chest.
        if (!this.spawnDelay) this.spawnDelay = mob.respawnDelay;

        if (this.spawnCallback) this.spawnCallback();
    }

    removeEntity(mob: Mob) {
        let index = this.entities.indexOf(mob);

        if (index > -1) this.entities.splice(index, 1);

        if (this.entities.length === 0 && this.emptyCallback) {
            if (mob.lastAttacker) this.handleAchievement(mob.lastAttacker);

            this.emptyCallback();
        }
    }

    handleAchievement(player: Player) {
        if (!this.achievement) return;

        player.finishAchievement(this.achievement);
    }

    setMaxEntities(maxEntities: number) {
        this.maxEntities = maxEntities;
    }

    onEmpty(callback: Function) {
        this.emptyCallback = callback;
    }

    onSpawn(callback: Function) {
        this.spawnCallback = callback;
    }
}

export default Area;
