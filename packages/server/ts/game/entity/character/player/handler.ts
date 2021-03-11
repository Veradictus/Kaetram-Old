/* global module */

import _ from 'lodash';
import log from '../../../../util/log';
import config from '../../../../../config';
import Messages from '../../../../network/messages';
import Modules from '../../../../util/modules';
import Packets from '../../../../network/packets';
import Npcs from '../../../../util/npcs';
import Hit from '../combat/hit';
import Utils from '../../../../util/utils';
import Shops from '../../../../util/shops';
import Player from './player';
import Character from '../character';
import NPC from '../../npc/npc';
import World from '../../../world';
import Entity from '../../entity';
import Map from '../../../../map/map';
import Area from '../../../../map/area';
import Doors from './doors';
import Areas from '@kaetram/ts/map/areas/areas';

class Handler {
    player: Player;
    world: World;
    map: Map;
    doors: Doors;

    updateTicks: number;
    updateInterval: any;

    constructor(player: Player) {
        this.player = player;

        this.world = player.world;
        this.map = player.world.map;
        this.doors = player.doors;

        this.updateTicks = 0;
        this.updateInterval = null;

        this.load();
    }

    destroy() {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
    }

    load() {
        this.updateInterval = setInterval(() => {
            this.detectAggro();
            //this.detectPVP(this.player.gridX, this.player.gridY);

            //if (this.updateTicks % 4 === 0)
                // Every 4 (1.6 seconds) update ticks.
            //    this.handlePoison();

            if (this.updateTicks % 16 === 0)
                // Every 16 (6.4 seconds) update ticks.
                this.player.cheatScore = 0;

            if (this.updateTicks > 100)
                // Reset them every now and then.
                this.updateTicks = 0;

            this.updateTicks++;
        }, 400);

        this.player.onMovement((floatX: number, floatY: number) => {
            this.player.checkRegions();

            this.detectAreas(floatX, floatY);
        });

        this.player.onDeath(() => {
            this.player.combat.stop();
            this.player.professions.stopAll();
        });

        this.player.onHit((attacker: Character, damage: number) => {
            /**
             * Handles actions whenever the player
             * instance is hit by 'damage' amount
             */

            log.debug(`Player has been hit - damage: ${damage}`);
        });

        this.player.onKill((character: any) => {
            if (!this.player.quests) {
                log.warning(`${this.player.username} does not have quests initialized properly.`);
                return;
            }
            
            if (this.player.quests.isAchievementMob(character)) {
                let achievement = this.player.quests.getAchievementByMob(character);

                if (achievement && achievement.isStarted())
                    this.player.quests.getAchievementByMob(character).step();
            }
        });

        this.player.onRegion(() => {
            this.player.lastRegionChange = new Date().getTime();

            this.world.region.handle(this.player);
            this.world.region.push(this.player);
        });

        this.player.connection.onClose(() => {
            this.player.stopHealing();

            /* Avoid a memory leak */
            clearInterval(this.updateInterval);
            this.updateInterval = null;

            if (this.player.ready) {
                if (config.discordEnabled)
                    this.world.discord.sendWebhook(this.player.username, 'has logged out!');

                if (config.hubEnabled)
                    this.world.api.sendChat(
                        Utils.formatUsername(this.player.username),
                        'has logged out!'
                    );
            }

            this.world.removePlayer(this.player);
        });

        this.player.onTalkToNPC((npc: NPC) => {
            if (this.player.quests.isQuestNPC(npc)) {
                this.player.quests.getQuestByNPC(npc).triggerTalk(npc);

                return;
            }

            if (this.player.quests.isAchievementNPC(npc)) {
                this.player.quests.getAchievementByNPC(npc).converse(npc);

                return;
            }

            if (Shops.isShopNPC(npc.id)) {
                this.world.shops.open(this.player, npc.id);
                return;
            }

            switch (Npcs.getType(npc.id)) {
                case 'banker':
                    this.player.send(new Messages.NPC(Packets.NPCOpcode.Bank, {}));
                    return;

                case 'enchanter':
                    this.player.send(new Messages.NPC(Packets.NPCOpcode.Enchant, {}));
                    break;
            }

            let text = Npcs.getText(npc.id);

            if (!text) return;

            this.player.send(
                new Messages.NPC(Packets.NPCOpcode.Talk, {
                    id: npc.instance,
                    text: npc.talk(text, this.player)
                })
            );
        });

        this.player.onTeleport((x: number, y: number, isDoor: boolean) => {
            if (!this.player.finishedTutorial() && isDoor && this.player.doorCallback) {
                this.player.doorCallback(x, y);
                return;
            }
        });

        this.player.onPoison((info: any) => {
            this.player.sync();

            if (info) this.player.notify('You have been poisoned.');
            else this.player.notify('The poison has worn off.');

            log.debug(`Player ${this.player.instance} updated poison status.`);
        });

        this.player.onCheatScore(() => {
            /**
             * This is a primitive anti-cheating system.
             * It will not accomplish much, but it is enough for now.
             */

            if (this.player.cheatScore > 10) this.player.timeout();

            log.debug('Cheat score - ' + this.player.cheatScore);
        });
    }

    detectAggro() {
        let region = this.world.region.regions[this.player.region];

        if (!region) return;

        _.each(region.entities, (character: Character) => {
            if (character && character.type === 'mob' && this.canEntitySee(character)) {
                let aggro = character.canAggro(this.player);


                log.notice('Aggro not implemented.');
                //if (aggro) character.combat.begin(this.player);
            }
        });
    }

    detectAreas(x: number, y: number) {
        _.each(this.world.getAreas(), (area: Areas, name: string) => {
            let info = area.inArea(x, y);

            switch (name.toLowerCase()) {
                case 'pvp':
                    this.player.updatePVP(!!info);
                    break;

                case 'music':
                    if (info && this.player.currentSong !== info.song)
                        this.player.updateMusic(info.song);

                    break;

                case 'overlays':
                    this.player.updateOverlay(info);
                    break;

                case 'camera':
                    this.player.updateCamera(info);
                    break;

                case 'achievements':

                    if (!info || !info.achievement) return;

                    if (!this.player.achievementsLoaded) return;

                    this.player.finishAchievement(info.achievement);

                    break;

                case 'doors':
                    this.handleDoor(info);
                    break;
            }
        });
    }

    detectLights(x: number, y: number) {
        _.each(this.map.lights, (light) => {
            if (this.map.nearLight(light, x, y) && !this.player.hasLoadedLight(light)) {
                // Add a half a tile offset so the light is centered on the tile.

                this.player.lightsLoaded.push(light);
                this.player.send(new Messages.Overlay(Packets.OverlayOpcode.Lamp, light));
            }
        });
    }

    detectClipping(x: number, y: number) {
        let isColliding = this.map.isColliding(x, y);

        if (!isColliding) return;

        this.player.incoming.handleNoClip(x, y);
    }

    handleDoor(doorArea: Area) {
        if (!doorArea) {
            this.doors.ignoreDoor = 0;
            return;
        }
        
        console.log(doorArea);
        console.log(this.doors.ignoreDoor);
        
        if (doorArea.id === this.doors.ignoreDoor) return;

        let x = doorArea.destination.x - (doorArea.width / 2),
            y = doorArea.destination.y + (doorArea.height / 2);

        console.log(`x: ${x} - y: ${y}`);

        this.doors.ignoreDoor = doorArea.destination.id;
        this.player.teleport(x, y);
    }

    handlePoison() {
        log.notice('handlePoision not implemented.');

        // if (!this.player.poison) return;

        // let info: any = this.player.poison.split(':'),
        //     timeDiff = new Date().getTime() - info[0];

        // if (timeDiff > info[1]) {
        //     this.player.setPoison('');
        //     return;
        // }

        // let hit = new Hit(Modules.Hits.Poison, info[2]);

        // hit.poison = true;

        // this.player.combat.hit(this.player, this.player, hit.getData());
    }

    canEntitySee(entity: Entity) {
        return !this.player.hasInvisible(entity) && !this.player.hasInvisibleId(entity.id);
    }
}

export default Handler;
