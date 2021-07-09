import Items from '@kaetram/server/ts/util/items';

class Equipment {

    private id: number;
    private count: number; // For arrows
    private ability: number;
    private abilityLevel: number;

    public type: number;

    constructor(id: number, count: number, ability: number, abilityLevel: number) {
        this.update(id, count, ability, abilityLevel);
    }

    update(id: number, count: number, ability: number, abilityLevel: number): void {
        this.id = id;
        this.count = count ? count : 0;
        this.ability = !isNaN(ability) ? ability : -1;
        this.abilityLevel = !isNaN(abilityLevel) ? abilityLevel : -1;
    }

    getName(): string {
        return Items.idToName(this.id);
    }

    getString(): string {
        return Items.idToString(this.id);
    }

    getId(): number {
        return this.id;
    }

    getCount(): number {
        return this.count;
    }

    getAbility(): number {
        return this.ability;
    }

    getAbilityLevel(): number {
        return this.abilityLevel;
    }

    getBaseAmplifier(): number {
        return 1.0;
    }

    getType(): number {
        return this.type;
    }

    isEquipped(): boolean {
        return this.id !== -1;
    }

    getData() {
        // TOOD - Gotta add weapon requirement/power in there for the client.

        return {
            name: this.getName(),
            string: this.getString(),
            id: this.id,
            count: this.count,
            ability: this.ability,
            abilityLevel: this.abilityLevel,
            type: this.getType()
        };
    }
}

export default Equipment;
