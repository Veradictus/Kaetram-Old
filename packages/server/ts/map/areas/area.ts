import Mob from '../../game/entity/character/mob/mob';
import Player from '../../game/entity/character/player/player';

import Constants from '../../util/constants';

class Area {
    public id: number;
    public x: number;
    public y: number;
    public width: number;
    public height: number;

    public polygon: any[];

    public entities: any;
    public chest: any;
    public items: any;

    public hasRespawned: boolean;

    // Overlay properties
    public overlayColour: any;

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

    public margin: boolean;

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
            if (mob.lastAttacker) this.handleAchievement(mob.lastAttacker as Player);

            this.emptyCallback();
        }
    }

    contains(x: number, y: number) {
        return this.polygon ? this.inPolygon(x, y) : this.inRectangularArea(x, y);
    }

    inRectangularArea(x: number, y: number): boolean {
        let startX = this.x - (this.margin ? 7 : 0),
            startY = this.y - (this.margin ? 7 : 0),
            endX = this.x + this.width + (this.margin ? 7 : 0),
            endY = this.y + this.height + (this.margin ? 7 : 0);

        return x >= startX && y >= startY && x < endX && y < endY;
    }

    inPolygon(x: number, y: number): boolean {
        for (let i = 0, j = this.polygon.length - 1; i < this.polygon.length; j = i++) {
            let xi = this.polygon[i].x, yi = this.polygon[i].y,
                xj = this.polygon[j].x, yj = this.polygon[j].y;

            let intersect = ((yi > y) != (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

            if (intersect) return true;
        }

        return false;
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
