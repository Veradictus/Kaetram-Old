import log from '../../../../../util/log';
import Items from '../../../../../util/items';

class Slot {
    public index: number;

    public id: number;
    public count: number;
    public ability: number;
    public abilityLevel: number;

    public string: string;

    public edible: boolean;
    public equippable: boolean;

    constructor(index: number) {
        this.index = index;

        this.id = -1;
        this.count = -1;
        this.ability = -1;
        this.abilityLevel = -1;

        this.string = null;
    }

    load(id: number, count: number, ability: number, abilityLevel: number): void {
        this.id = id;
        this.count = count;
        this.ability = ability;
        this.abilityLevel = abilityLevel;

        this.string = Items.idToString(this.id);
        this.edible = Items.isEdible(this.id);
        this.equippable = Items.isEquippable(this.id);

        this.verify();
    }

    empty(): void {
        this.id = -1;
        this.count = -1;
        this.ability = -1;
        this.abilityLevel = -1;

        this.string = null;
    }

    increment(amount: number): void {
        this.count += amount;

        this.verify();
    }

    decrement(amount: number): void {
        this.count -= amount;

        if (this.count < 1)
            log.error('[Slot] Item ' + this.id + ' has a count below 1 -> count: ' + this.count);

        this.verify();
    }

    verify(): void {
        if (isNaN(this.count) || this.count < 1) this.count = 1;
    }

    getData() {
        return {
            index: this.index,
            string: this.string,
            count: this.count,
            ability: this.ability,
            abilityLevel: this.abilityLevel
        };
    }
}

export default Slot;
