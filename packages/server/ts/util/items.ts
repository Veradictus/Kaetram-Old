import log from '../util/log';
import Modules from './modules';

export default {
    Data: {},
    Ids: {},
    onCreate: {},
    Plugins: {},

    getData(name: string) {
        if (name in this.Data) return this.Data[name];

        return 'null';
    },

    hasPlugin(id: number) {
        return id in this.Plugins;
    },

    hasOffset(id: number) {
        if (!(id in this.Ids))
            return false;

        if (this.Ids[id].offsetX && this.Ids[id].offsetY)
            return true;
    },

    getPlugin(id: number) {
        if (this.hasPlugin(id)) return this.Plugins[id];

        return null;
    },

    idToString(id: number) {
        if (id in this.Ids) return this.Ids[id].key;

        return 'null';
    },

    idToName(id: number) {
        if (id in this.Ids) return this.Ids[id].name;

        return 'null';
    },

    stringToId(name: string) {
        if (name in this.Data) return this.Data[name].id;
        else log.error('Item: ' + name + ' not found in the database.');

        return 'null';
    },

    getType(id: number): number {
        if (!(id in this.Ids)) return -1;

        let type = this.Ids[id].type;

        switch (type) {
            case 'head':
                return Modules.Equipment.Head;

            case 'necklace':
                return Modules.Equipment.Necklace;

            case 'torso':
                return Modules.Equipment.Torso;

            case 'legs':
                return Modules.Equipment.Legs;

            case 'ring':
                return Modules.Equipment.Ring;

            case 'boots':
                return Modules.Equipment.Boots;

            case 'weapon':
                return Modules.Equipment.Weapon;

            default:
                return -1;
        }
    },

    getLevelRequirement(name: string) {
        let item = this.Data[name];

        if (!name || !item || !item.level) return 0;

        return item.level;
    },

    /*getLumberjackingLevel(weaponName: string) {
        if (this.isWeapon(weaponName)) return this.Data[weaponName].lumberjacking;

        return -1;
    },

    getMiningLevel(weaponName: string) {
        if (this.isWeapon(weaponName)) return this.Data[weaponName].mining;

        return -1;
    },*/

    isStackable(id: number) {
        if (id in this.Ids) return this.Ids[id].stackable;

        return false;
    },

    isEdible(id: number) {
        if (id in this.Ids) return this.Ids[id].edible;

        return false;
    },

    getCustomData(id: number) {
        if (id in this.Ids) return this.Ids[id].customData;

        return null;
    },

    maxStackSize(id: number) {
        if (id in this.Ids) return this.Ids[id].maxStackSize;

        return false;
    },

    isShard(id: number) {
        return id === 253 || id === 254 || id === 255 || id === 256 || id === 257;
    },

    isEnchantable(id: number) {
        return false; /* TODO - Re-implement this later on */
    },

    getShardTier(id: number) {
        if (id === 253) return 1;
        else if (id === 254) return 2;
        else if (id === 255) return 3;
        else if (id === 256) return 4;
        else if (id === 257) return 5;
    },

    isEquippable(id: number) {
        return this.getType(id) !== -1;
    },

    healsHealth(id: number) {
        if (id in this.Ids) return this.Ids[id].healsHealth > 0;

        return false;
    },

    getMovementSpeed(string: string) {
        if (string in this.Data) return this.Data[string].movementSpeed;

        return null;
    },

    healsMana(id: number) {
        if (id in this.Ids) return this.Ids[id].healsMana > 0;
    },

    getHealingFactor(id: number) {
        if (id in this.Ids) return this.Ids[id].healsHealth;

        return 0;
    },

    getManaFactor(id: number) {
        if (id in this.Ids) return this.Ids[id].healsMana;

        return 0;
    }
};
