/* global module */

import _ from 'lodash';
import Character from '../character';
import Hit from './hit';

class Combat {

    public character: Character;
    
    private attackers: any; //{ key: string, value: Character }

    private started: boolean;

    private lastAttack: number;
    private attackRate: number;

    constructor(character: Character) {

        this.character = character;

        this.attackRate = character.attackRate;

        this.attackers = {};
    }

    cycle() {
    }

    attack(target: Character, hitInfo?: Hit, callback?: Function, force?: boolean) {
        if (!this.canAttack()) return;


        this.lastAttack = new Date().getTime();

        if (callback) callback();
    }

    stop() {

    }

    addAttacker(attacker: Character) {
        if (this.hasAttacker(attacker)) return;

        this.attackers[attacker.instance] = attacker;
    }

    removeAttacker(attacker: Character) {
        delete this.attackers[attacker.instance];
    }

    canAttack() {
        return (new Date().getTime()) - this.lastAttack > this.attackRate;
    }

    hasAttacker(attacker: Character) {
        return attacker.instance in this.attackers;
    }

    isActive() {
        return this.started;
    }

    forEachAttacker(callback: Function) {
        _.each(this.attackers, attacker => {
            callback(attacker);
        });
    }

}

export default Combat;
