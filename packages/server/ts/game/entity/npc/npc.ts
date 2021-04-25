/* global module */

import Entity from '../entity';
import Player from '../character/player/player';

class NPC extends Entity {
    talkIndex: number;
    
    private roamingInterval: any;
    
    public roamingCallback: Function;

    constructor(id: number, instance: string, x: number, y: number) {
        super(id, 'npc', instance, x, y);

        this.talkIndex = 0;

        this.roamingInterval = null;

        this.load();
    }

    load() {

        this.roamingInterval = setInterval(() => {

            if (this.roamingCallback) this.roamingCallback();

        }, 5000);

    }

    talk(messages?: any, player?: Player) {
        if (!player) return;

        if (player.npcTalk !== this.id) {
            player.talkIndex = 0;
            player.npcTalk = this.id;
        }

        let message = messages[player.talkIndex];

        if (player.talkIndex > messages.length - 1) player.talkIndex = 0;
        else player.talkIndex++;

        return message;
    }

    onRoaming(callback: Function) {
        this.roamingCallback = callback;
    }
}

export default NPC;
