import Packets from '../network/packets';
import _ from 'lodash';
import Messages from '../network/messages';
import sanitizer from 'sanitizer';
import Commands from './commands';
import Items from '../util/items';
import Creator from '../database/mongodb/creator';
import Utils from '../util/utils';
import Player from '../game/entity/character/player/player';
import World from '../game/world';
import log from '../util/log';
import Constants from '../util/constants';
import config from '../../config';
import Character from '../game/entity/character/character';
import { Message } from 'discord.js';

class Incoming {
    private player: Player;
    private connection: any;
    private world: World;
    private database: any;
    private commands: any;

    constructor(player: Player) {
        this.player = player;
        this.connection = this.player.connection;
        this.world = this.player.world;
        this.database = this.player.database;
        this.commands = new Commands(this.player);

        this.connection.listen((data: any) => {
            let packet = data.shift(),
                [ message ] = data;

            if (!Utils.validPacket(packet)) {
                log.error('Non-existent packet received: ' + packet + ' data: ');
                log.error(message);
                return;
            }

            if (packet > Packets.Intro && !this.player.introduced) {
                log.error('Improper handshake between client and server.')
                return;
            }

            this.player.refreshTimeout();

            switch (packet) {
                case Packets.Intro:
                    this.handleIntro(message);
                    break;

                case Packets.Ready:
                    this.handleReady(message);
                    break;

                case Packets.Who:
                    this.handleWho(message);
                    break;

                case Packets.Equipment:
                    this.handleEquipment(message);
                    break;

                case Packets.Movement:
                    this.handleMovement(message);
                    break;

                case Packets.Request:
                    this.handleRequest(message);
                    break;

                case Packets.Target:
                    this.handleTarget(message);
                    break;

                case Packets.Combat:
                    this.handleCombat(message);
                    break;

                case Packets.Projectile:
                    this.handleProjectile(message);
                    break;

                case Packets.Network:
                    this.handleNetwork(message);
                    break;

                case Packets.Chat:
                    this.handleChat(message);
                    break;

                case Packets.Command:
                    this.handleCommand(message);
                    break;

                case Packets.Inventory:
                    this.handleInventory(message);
                    break;

                case Packets.Bank:
                    this.handleBank(message);
                    break;

                case Packets.Respawn:
                    this.handleRespawn(message);
                    break;

                case Packets.Trade:
                    this.handleTrade(message);
                    break;

                case Packets.Enchant:
                    this.handleEnchant(message);
                    break;

                case Packets.Click:
                    this.handleClick(message);
                    break;

                case Packets.Warp:
                    this.handleWarp(message);
                    break;

                case Packets.Shop:
                    this.handleShop(message);
                    break;

                case Packets.Camera:
                    this.handleCamera(message);
                    break;

                case Packets.Client:
                    this.handleClient(message);
                    break;

                case Packets.Area:
                    this.handleArea(message);
                    break;
            }
        });
    }

    handleIntro(message: Array<any>): void {
        let loginType = message.shift(),
            username = message.shift().toLowerCase(),
            password = message.shift(),
            isRegistering = loginType === Packets.IntroOpcode.Register,
            isGuest = loginType === Packets.IntroOpcode.Guest,
            email = isRegistering ? message.shift() : '',
            formattedUsername = username
                ? username.charAt(0).toUpperCase() + username.slice(1)
                : '';

        this.player.username = formattedUsername.substr(0, 32).trim().toLowerCase();
        this.player.password = password.substr(0, 32);
        this.player.email = email.substr(0, 128).toLowerCase();

        if (this.player.introduced) return;

        if (this.world.isOnline(this.player.username)) {
            this.connection.sendUTF8('loggedin');
            this.connection.close('Player already logged in..');
            return;
        }

        if (config.overrideAuth) {
            this.database.login(this.player);
            return;
        }

        if (config.offlineMode) {
            this.player.load(Creator.getFullData(this.player));
            this.player.intro();

            return;
        }

        if (isRegistering) {
            this.database.exists(this.player, (result: any) => {
                if (result.exists) {
                    this.connection.sendUTF8(result.type + 'exists');
                    this.connection.close(result.type + ' is not available.');
                } else this.database.register(this.player);
            });
        } else if (isGuest) {
            this.player.username = 'Guest' + Utils.randomInt(0, 2000000);
            this.player.password = null;
            this.player.email = null;
            this.player.isGuest = true;

            this.database.login(this.player);
        } else
            this.database.verify(this.player, (result: any) => {
                if (result.status === 'success') this.database.login(this.player);
                else {
                    this.connection.sendUTF8('invalidlogin');
                    this.connection.close('Wrong password entered for: ' + this.player.username);
                }
            });
    }

    handleReady(message: Array<any>) {
        let isReady = message.shift(),
            preloadedData = message.shift(),
            userAgent = message.shift();

        if (!isReady) return;

        if (this.player.regionsLoaded.length > 0 && !preloadedData) this.player.regionsLoaded = [];

        console.log('Received ready...');

        this.player.ready = true;

        // TODO - Move to request basis
        this.world.region.syncRegion(this.player);

        this.player.loadReady();

        if (this.player.new || config.offlineMode) {
            this.player.questsLoaded = true;
            this.player.achievementsLoaded = true;
        }

        this.player.save();

        if (config.discordEnabled)
            this.world.discord.sendWebhook(this.player.username, 'has logged in!');

        if (config.hubEnabled)
            this.world.api.sendChat(Utils.formatUsername(this.player.username), 'has logged in!');

        if (this.player.readyCallback) this.player.readyCallback();

        this.player.sync();
    }

    handleWho(message: Array<any>) {
        _.each(message.shift(), (id: string) => {
            let entity: any = this.world.entities.get(id);

            if (!entity || entity.dead) return;

            /* We handle player-specific entity statuses here. */

            // Entity is an area-based mob
            if (entity.area) entity.specialState = 'area';

            if (this.player.quests.isQuestNPC(entity)) entity.specialState = 'questNpc';

            if (this.player.quests.isQuestMob(entity)) entity.specialState = 'questMob';

            if (entity.miniboss) {
                entity.specialState = 'miniboss';
                entity.customScale = 1.25;
            }

            if (entity.boss) entity.specialState = 'boss';

            //if (this.player.quests.isAchievementNPC(entity))
            //    entity.specialState = 'achievementNpc';

            this.player.send(new Messages.Spawn(entity));
        });
    }

    handleEquipment(message: Array<any>) {
        let opcode = message.shift();

        switch (opcode) {
            case Packets.EquipmentOpcode.Unequip:
                let type = message.shift();

                if (!this.player.inventory.hasSpace()) {
                    this.player.send(
                        new Messages.Notification(Packets.NotificationOpcode.Text, {
                            message: 'You do not have enough space in your inventory.'
                        })
                    );
                    return;
                }

                this.player.equipment.unequip(type);

                break;
        }
    }

    handleMovement(message: Array<any>) {
        let opcode = message.shift(),
            orientation: number;

        if (!this.player || this.player.dead) return;

        switch (opcode) {
            case Packets.MovementOpcode.Move:
                let [x, y, running] = message,
                    floatX = x / this.world.map.tileSize,
                    floatY = y / this.world.map.tileSize,
                    gridX = Math.floor(floatX),
                    gridY = Math.floor(floatY);

                if (this.world.map.isCollision(floatX, floatY, gridX, gridY)) {
                    log.debug('Detected no clipping.');
                    return;
                }

                this.player.setPosition(x, y, running);

                break;

            case Packets.MovementOpcode.Orientate:

                

                break;

        }
    }

    handleRequest(message: Array<any>) {
        let id = message.shift();

        if (id !== this.player.instance) return;

        this.world.region.push(this.player);
    }

    handleTarget(message: Array<any>) {
        let opcode = message.shift(),
            instance = message.shift();

        log.debug(`Target [opcode]: ${instance} [${opcode}]`);

        switch (opcode) {
            case Packets.TargetOpcode.Talk:
                let entity = this.world.entities.get(instance);

                if (!entity || !this.player.isAdjacent(entity)) return;

                this.player.cheatScore = 0;

                if (entity.type === 'chest') {
                    entity.openChest(this.player);
                    return;
                }

                if (entity.dead) return;

                if (this.player.npcTalkCallback) this.player.npcTalkCallback(entity);

                break;

            case Packets.TargetOpcode.Attack:
                let target: any = this.world.entities.get(instance);

                if (!target || target.dead || !this.canAttack(this.player, target)) return;

                this.player.cheatScore = 0;

                this.world.push(Packets.PushOpcode.Regions, {
                    regionId: target.region,
                    message: new Messages.Combat(Packets.CombatOpcode.Initiate, {
                        attackerId: this.player.instance,
                        targetId: target.instance
                    })
                });

                break;

            case Packets.TargetOpcode.None:
                // Nothing do to here.

                break;

            case Packets.TargetOpcode.Object:
                this.player.setTarget(instance);
                this.player.handleObject(instance);

                break;
        }
    }

    handleCombat(message: Array<any>) {
        let opcode = message.shift();

        switch (opcode) {
            case Packets.CombatOpcode.Attack:

                let instance = message.shift(),
                    attackType = message.shift();

                if (instance !== this.player.instance) return;

                this.player.sendAnimation(attackType, instance);
                
                break;
        }
    }

    handleProjectile(message: Array<any>) {
        let type = message.shift();

        switch (type) {
            case Packets.ProjectileOpcode.Impact:
                let projectile: any = this.world.entities.get(message.shift()),
                    target: any = this.world.entities.get(message.shift());

                if (!target || target.dead || !projectile) return;

                this.world.handleDamage(projectile.owner, target, projectile.damage);
                this.world.entities.remove(projectile);

                if (target.combat.started || target.dead || target.type !== 'mob') return;

                target.begin(projectile.owner);

                break;
        }
    }

    handleNetwork(message: Array<any>) {
        let opcode = message.shift();

        switch (opcode) {
            case Packets.NetworkOpcode.Pong:
                let time = new Date().getTime();

                this.player.notify(`Latency of ${time - this.player.pingTime}ms`, 'red');
                break;
        }
    }

    handleChat(message: any) {
        let text = sanitizer.escape(sanitizer.sanitize(message));

        if (!text || text.length < 1 || !/\S/.test(text)) return;

        if (text.charAt(0) === '/' || text.charAt(0) === ';') this.commands.parse(text);
        else {
            if (this.player.isMuted()) {
                this.player.send(
                    new Messages.Notification(Packets.NotificationOpcode.Text, {
                        message: 'You are currently muted.'
                    })
                );
                return;
            }

            if (!this.player.canTalk) {
                this.player.send(
                    new Messages.Notification(Packets.NotificationOpcode.Text, {
                        message: 'You are not allowed to talk for the duration of this event.'
                    })
                );
                return;
            }

            log.debug(`${this.player.username} - ${text}`);

            if (config.discordEnabled)
                this.world.discord.sendWebhook(this.player.username, text, true);

            if (config.hubEnabled)
                this.world.api.sendChat(Utils.formatUsername(this.player.username), text, true);

            this.world.push(Packets.PushOpcode.Regions, {
                regionId: this.player.region,
                message: new Messages.Chat({
                    id: this.player.instance,
                    name: this.player.username,
                    withBubble: true,
                    text: text,
                    duration: 7000
                })
            });
        }
    }

    handleCommand(message: Array<any>) {
        let opcode = message.shift();

        if (this.player.rights < 2) return;

        switch (opcode) {
            case Packets.CommandOpcode.CtrlClick:
                let position = message.shift();

                this.player.teleport(position.x, position.y, false, true);

                break;
        }
    }

    handleInventory(message: Array<any>) {
        let opcode = message.shift(),
            id: number,
            ability: number,
            abilityLevel: number;

        switch (opcode) {
            case Packets.InventoryOpcode.Remove:
                let item = message.shift(),
                    count: number;

                if (!item) return;

                if (item.count > 1) count = message.shift();

                id = Items.stringToId(item.string);

                let iSlot = this.player.inventory.slots[item.index];

                if (iSlot.id < 1) return;

                if (count > iSlot.count) count = iSlot.count;

                (ability = iSlot.ability), (abilityLevel = iSlot.abilityLevel);

                if (this.player.inventory.remove(id, count ? count : item.count, item.index))
                    this.world.entities.dropItem(
                        id,
                        count ? count : 1,
                        this.player.gridX,
                        this.player.gridY,
                        ability,
                        abilityLevel
                    );

                break;

            case Packets.InventoryOpcode.Select:
                let index = message.shift(),
                    slot = this.player.inventory.slots[index],
                    string = slot.string,
                    sCount = slot.count;

                (ability = slot.ability), (abilityLevel = slot.abilityLevel);

                if (!slot || slot.id < 1) return;

                id = Items.stringToId(slot.string);

                if (slot.equippable) {
                    if (!this.player.canEquip(string)) return;

                    this.player.inventory.remove(id, slot.count, slot.index);

                    //this.player.equipment.equip(string, sCount, ability, abilityLevel);
                } else if (slot.edible) {
                    this.player.inventory.remove(id, 1, slot.index);

                    this.player.eat(id);
                }

                break;
        }
    }

    handleBank(message: Array<any>) {
        let opcode = message.shift();

        switch (opcode) {
            case Packets.BankOpcode.Select:
                let type = message.shift(),
                    index = message.shift(),
                    isBank = type === 'bank';

                if (isBank) {
                    let bankSlot = this.player.bank.getInfo(index);

                    if (bankSlot.id < 1) return;

                    //Infinite stacks move all at once, otherwise move one by one.
                    let moveAmount = Items.maxStackSize(bankSlot.id) === -1 ? bankSlot.count : 1;

                    bankSlot.count = moveAmount;

                    if (this.player.inventory.add(bankSlot))
                        this.player.bank.remove(bankSlot.id, moveAmount, index);
                } else {
                    let inventorySlot = this.player.inventory.slots[index];

                    if (inventorySlot.id < 1) return;

                    if (
                        this.player.bank.add(
                            inventorySlot.id,
                            inventorySlot.count,
                            inventorySlot.ability,
                            inventorySlot.abilityLevel
                        )
                    )
                        this.player.inventory.remove(inventorySlot.id, inventorySlot.count, index);
                }

                break;
        }
    }

    handleRespawn(message: Array<any>) {
        let instance = message.shift();

        if (this.player.instance !== instance) return;

        let spawn = this.player.getSpawn();

        this.player.dead = false;
        this.player.setPosition(spawn.x, spawn.y);

        this.world.push(Packets.PushOpcode.Regions, {
            regionId: this.player.region,
            message: new Messages.Spawn(this.player),
            ignoreId: this.player.instance
        });

        this.player.send(new Messages.Respawn(this.player.instance, this.player.gridX, this.player.gridY));

        this.player.revertPoints();
    }

    handleTrade(message: Array<any>) {
        let opcode = message.shift(),
            oPlayer = this.world.entities.get(message.shift());

        if (!oPlayer || !opcode) return;

        switch (opcode) {
            case Packets.TradeOpcode.Request:
                break;

            case Packets.TradeOpcode.Accept:
                break;

            case Packets.TradeOpcode.Decline:
                break;
        }
    }

    handleEnchant(message: Array<any>) {
        let opcode = message.shift();

        switch (opcode) {
            case Packets.EnchantOpcode.Select:
                let index = message.shift(),
                    item = this.player.inventory.slots[index],
                    type = 'item';

                if (item.id < 1) return;

                if (Items.isShard(item.id)) type = 'shards';

                this.player.enchant.add(type, item);

                break;

            case Packets.EnchantOpcode.Remove:
                this.player.enchant.remove(message.shift());

                break;

            case Packets.EnchantOpcode.Enchant:
                this.player.enchant.enchant();

                break;
        }
    }

    handleClick(message: Array<any>) {
        let type = message.shift(),
            state = message.shift();

        switch (type) {
            case 'profile':
                this.player.toggleProfile(state);

                break;

            case 'inventory':
                this.player.toggleInventory(state);

                break;

            case 'warp':
                this.player.toggleWarp(state);

                break;
        }
    }

    handleWarp(message: Array<any>) {
        let id = parseInt(message.shift()) - 1;

        if (this.player.warp) this.player.warp.warp(id);
    }

    handleShop(message: Array<any>) {
        let opcode = message.shift(),
            npcId = message.shift();

        switch (opcode) {
            case Packets.ShopOpcode.Buy:
                let buyId = message.shift(),
                    amount = message.shift();

                if (!buyId || !amount) {
                    this.player.notify('Incorrect purchase packets.');
                    return;
                }

                log.debug('Received Buy: ' + npcId + ' ' + buyId + ' ' + amount);

                this.world.shops.buy(this.player, npcId, buyId, amount);

                break;

            case Packets.ShopOpcode.Sell:
                if (!this.player.selectedShopItem) {
                    this.player.notify('No item has been selected.');
                    return;
                }

                this.world.shops.sell(this.player, npcId, this.player.selectedShopItem.index);

                break;

            case Packets.ShopOpcode.Select:
                let slotId = message.shift();

                if (!slotId) {
                    this.player.notify('Incorrect purchase packets.');
                    return;
                }

                slotId = parseInt(slotId);

                /**
                 * Though all this could be done client-sided
                 * it's just safer to send it to the server to sanitize data.
                 * It also allows us to add cheat checks in the future
                 * or do some fancier stuff.
                 */

                let item = this.player.inventory.slots[slotId];

                if (!item || item.id < 1) return;

                if (this.player.selectedShopItem) this.world.shops.remove(this.player);

                let currency = this.world.shops.getCurrency(npcId);

                if (!currency) return;

                this.player.send(
                    new Messages.Shop(Packets.ShopOpcode.Select, {
                        id: npcId,
                        slotId: slotId,
                        currency: Items.idToString(currency),
                        price: this.world.shops.getSellPrice(npcId, item.id)
                    })
                );

                this.player.selectedShopItem = {
                    id: npcId,
                    index: item.index
                };

                log.debug('Received Select: ' + npcId + ' ' + slotId);

                break;

            case Packets.ShopOpcode.Remove:
                this.world.shops.remove(this.player);

                break;
        }
    }

    handleCamera(message: Array<any>) {
        log.info(this.player.gridX + ' ' + this.player.gridY);
        console.log(message);

        this.player.cameraArea = null;
        //this.player.handler.detectCamera(this.player.gridX, this.player.gridY);
    }

    /**
     * Receive client information such as screen size, will be expanded
     * for more functionality when needed.
     */

    handleClient(message: Array<any>) {
        let canvasWidth = message.shift(),
            canvasHeight = message.shift();

        if (!canvasWidth || !canvasHeight) return;

        /**
         * The client is by default scaled to 3x the normal
         * tileSize of 16x16. So we are using 48x48 to find
         * a desireable region size.
         */

        this.player.regionWidth = Math.ceil(canvasWidth / 48);
        this.player.regionHeight = Math.ceil(canvasHeight / 48);
    }

    /**
     * Each time a player enters an area client-sided, a signal is
     * sent. We take the player's position and correlate it with
     * the respective area. For example, a player triggers a door
     * area, we just find the player's area and trigger the action
     * server-sided.
     */

    handleArea(message: Array<any>) {
        let opcode = message.shift(),
            x: number, y: number;

        console.log(opcode);

        switch (opcode) {

            case Packets.AreaOpcode.Door:
                [x, y] = message;

                return this.player.handleDoor(x, y);

            case Packets.AreaOpcode.NPC:
                [x, y] = message;

                console.log('npc');    

                break;

        }
    }

    canAttack(attacker: Character, target: Character) {
        /**
         * Used to prevent client-sided manipulation. The client will send the packet to start combat
         * but if it was modified by a presumed hacker, it will simply cease when it arrives to this condition.
         */

        if (attacker.type === 'mob' || target.type === 'mob') return true;

        return attacker.type === 'player' && target.type === 'player' && attacker.pvp && target.pvp;
    }

    preventNoClip(x: number, y: number) {
        let isMapColliding = this.world.map.isColliding(x, y),
            isInstanceColliding = this.player.doors.hasCollision(x, y);

        if (this.world.map.getPositionObject(x, y)) return true;

        if (isMapColliding || isInstanceColliding) {
            this.handleNoClip(x, y);
            return false;
        }

        return true;
    }

    handleNoClip(x: number, y: number) {
        this.player.stopMovement(true);
        this.player.notify(
            'We have detected no-clipping in your client. Please submit a bug report.'
        );

        x = this.player.previousX < 0 ? this.player.gridX : this.player.previousX;
        y = this.player.previousY < 0 ? this.player.gridY : this.player.previousY;

        if (this.world.map.isColliding(x, y)) {
            let spawn = this.player.getSpawn();

            (x = spawn.x), (y = spawn.y);
        }

        this.player.teleport(x, y, false, true);
    }
}

export default Incoming;
