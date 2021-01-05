import _ from 'lodash';

import Items from '@kaetram/server/ts/util/items';
import Modules from '@kaetram/server/ts/util/modules';
import Messages from '@kaetram/server/ts/network/messages';
import Packets from '@kaetram/server/ts/network/packets';

import Player from '../player';
import Boots from './impl/boots';
import Equipment from './impl/equipment';
import Head from './impl/head';
import Legs from './impl/legs';
import Necklace from './impl/necklace';
import Ring from './impl/ring';
import Torso from './impl/torso';
import Weapon from './impl/weapon';
import Quiver from './impl/quiver';

export default class Equipments {

    /**
     * The new equipment system uses a paper-doll system.
     * The sprites for each equipment is layered on top of
     * a player character base sprite. This allows for
     * more visually appealing look, as well as more
     * customization capabilities.
     */

    private player: Player;

    private head: Head;
    private necklace: Necklace;
    private torso: Torso;
    private legs: Legs;
    private ring: Ring;
    private boots: Boots;
    private weapon: Weapon;
    private quiver: Quiver;

    constructor(player: Player) {
        this.player = player;

        this.head = new Head(-1, -1, -1);
        this.necklace = new Necklace(-1, -1, -1);
        this.torso = new Torso(-1, -1, -1);
        this.legs = new Legs(-1, -1, -1);
        this.ring = new Ring(-1, -1, -1);
        this.boots = new Boots(-1, -1, -1);
        this.weapon = new Weapon(-1, -1, -1);
        this.quiver = new Quiver(-1, -1, -1, -1); // Quiver has a stackable count.
    }

    /**
     * We receive the player data from the database, and pluck out
     * information we need for each equipment.
     * 
     * @param data The player data received from the database.
     */

    load(equipmentData) {

        _.each(equipmentData, (value: any, index: string) => {
            let equipment = this.getEquipment(parseInt(index));

            if (!equipment) return;

            equipment.update(value.id, value.count, value.ability, value.abilityLevel);
        });
            
    }

    equip(id: number, count: number, ability: number, abilityLevel: number) {
        let type = Items.getType(id),
            equipment = this.getEquipment(type);

        if (!equipment || equipment.isEquipped()) return;
        
        equipment.update(id, count, ability, abilityLevel);

        
    }

    unequip(type: number) {
        let equipment = this.getEquipment(type);

        if (!equipment) return;

        equipment.update(-1, -1, -1, -1);

        this.player.send(new Messages.Equipment(Packets.EquipmentOpcode.Unequip, [type]));
    }

    getDefense() {
        /**
         * TODO - Implement a defense stat based on all the equipped items
         * of the player.
         */

        return 1;
    }

    getEquipment(type: number) {
        switch (type) {
            case Modules.Equipment.Head:
                return this.head;
            
            case Modules.Equipment.Necklace:
                return this.necklace;

            case Modules.Equipment.Torso:
                return this.torso;

            case Modules.Equipment.Legs:
                return this.legs;

            case Modules.Equipment.Ring:
                return this.ring;

            case Modules.Equipment.Boots:
                return this.boots;

            case Modules.Equipment.Weapon:
                return this.weapon;

            case Modules.Equipment.Quiver:
                return this.quiver;

            default:
                return null;
        }
    }

    getMovementSpeed() {
        return null;
    }

    getData() {
        let data = {};

        this.forEachEquipment(equipment => {
            data[equipment.type] = {
                id: equipment.getId(),
                count: equipment.getCount(),
                ability: equipment.getAbility(),
                abilityLevel: equipment.getAbilityLevel()
            };
        });

        return data;
    }

    getEquipments() {
        return [this.head, this.necklace, this.torso, 
            this.legs, this.ring, this.boots, this.weapon,
            this.quiver];
    }

    forEachEquipment(callback) {
        _.each(this.getEquipments(), (equipment: Equipment) => {
            callback(equipment);
        });
    }
}