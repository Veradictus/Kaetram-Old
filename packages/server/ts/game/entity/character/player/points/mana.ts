import Points from './points';
import { VoidCallback } from '@kaetram/common/types/index';

class Mana extends Points {
    manaCallback: VoidCallback;
    maxManaCallback: VoidCallback;

    constructor(mana: number, maxMana: number) {
        super(mana, maxMana);
    }

    setMana(mana: number): void {
        this.points = mana;

        if (this.manaCallback) this.manaCallback();
    }

    setMaxMana(maxMana: number): void {
        this.maxPoints = maxMana;

        if (this.maxManaCallback) this.maxManaCallback();
    }

    getMana(): number {
        return this.points;
    }

    getMaxMana(): number {
        return this.maxPoints;
    }

    onMana(callback: VoidCallback): void {
        this.manaCallback = callback;
    }

    onMaxMana(callback: VoidCallback): void {
        this.maxManaCallback = callback;
    }
}

export default Mana;
