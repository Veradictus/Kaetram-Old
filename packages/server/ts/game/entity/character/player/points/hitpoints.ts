import Points from './points';
import { VoidCallback } from '@kaetram/common/types/index';

class HitPoints extends Points {
    hitPointsCallback: VoidCallback;
    maxHitPointsCallback: VoidCallback;

    constructor(hitPoints: number, maxHitPoints: number) {
        super(hitPoints, maxHitPoints);
    }

    setHitPoints(hitPoints: number): void {
        super.setPoints(hitPoints);

        if (this.hitPointsCallback) this.hitPointsCallback();
    }

    setMaxHitPoints(maxHitPoints: number): void {
        super.setMaxPoints(maxHitPoints);

        if (this.maxHitPointsCallback) this.maxHitPointsCallback();
    }

    getHitPoints(): number {
        return this.points;
    }

    getMaxHitPoints(): number {
        return this.maxPoints;
    }

    onHitPoints(callback: VoidCallback): void {
        this.hitPointsCallback = callback;
    }

    onMaxHitPoints(callback: VoidCallback): void {
       this.maxHitPointsCallback = callback;
    }
}

export default HitPoints;
