import _ from 'lodash';
import log from '../../../../util/log';
import Character from '../character';
import Equipments from './equipments/equipments';
import Incoming from '../../../../controllers/incoming';
import Items from '../../../../util/items';
import Messages from '../../../../network/messages';
import Formulas from '../../../../util/formulas';
import HitPoints from './points/hitpoints';
import Mana from './points/mana';
import Packets from '../../../../network/packets';
import Modules from '../../../../util/modules';
import Handler from './handler';
import Quests from '../../../../controllers/quests';
import Inventory from './containers/inventory/inventory';
import Abilities from './abilities/abilities';
import Professions from './professions/professions';
import Bank from './containers/bank/bank';
import Enchant from './enchant';
import Utils from '../../../../util/utils';
import Constants from '../../../../util/constants';
import MongoDB from '../../../../database/mongodb/mongodb';
import Connection from '../../../../network/connection';
import World from '../../../world';
import Map from '../../../../map/map';
import Area from '../../../../map/areas/area';
import Regions from '../../../../map/regions';
import GlobalObjects from '../../../../controllers/globalobjects';
import Hit from '../combat/hit';
import Trade from './trade';
import Warp from './warp';
import Doors from './doors';
import Friends from './friends';
import Lumberjacking from './professions/impl/lumberjacking';
import config from '../../../../../config';

class Player extends Character {
    public world: World;
    public database: MongoDB;
    public connection: Connection;

    public clientId: string;

    public map: Map;
    public regions: Regions;
    public globalObjects: GlobalObjects;

    public incoming: Incoming;

    public ready: boolean;

    public potentialPosition: any;
    public futurePosition: any;
    public regionPosition: any;

    public newRegion: boolean;

    public team: any; // TODO
    public userAgent: any; // TODO
    public minigame: any; // TODO

    public disconnectTimeout: any;
    public timeoutDuration: number;
    public lastRegionChange: number;

    public handler: Handler;

    public inventory: Inventory;
    public professions: Professions;
    public abilities: Abilities;
    public friends: Friends;
    public enchant: Enchant;
    public bank: Bank;
    public quests: Quests;
    public trade: Trade;
    public doors: Doors;
    public warp: Warp;

    public introduced: boolean;
    public currentSong: string;
    public acceptedTrade: boolean;
    public noDamage: boolean;
    public isGuest: boolean;

    public canTalk: boolean;

    public visible: boolean;

    public talkIndex: number;
    public cheatScore: number;
    public defaultMovementSpeed: number;

    public regionsLoaded: any;
    public lightsLoaded: any;

    public npcTalk: any;

    public password: string;
    public email: string;

    public kind: any; // TO REMOVE;
    public rights: number;
    public experience: number;
    public ban: number;
    public mute: number;
    public membership: number; // TO REMOVE;
    public lastLogin: number;
    public pvpKills: number;
    public pvpDeaths: number;
    public orientation: number;
    public mapVersion: number;

    public nextExperience: number;
    public prevExperience: number;
    public playerHitPoints: HitPoints;
    public mana: Mana;

    public equipment: Equipments;

    public cameraArea: Area;
    public overlayArea: Area;

    public permanentPVP: boolean;
    public movementStart: number;

    public pingTime: any;

    public regionWidth: number;
    public regionHeight: number;

    questsLoaded: boolean;
    achievementsLoaded: boolean;

    public new: boolean;
    public lastNotify: number;
    public profileDialogOpen: boolean;
    public inventoryOpen: boolean;
    public warpOpen: boolean;

    public selectedShopItem: any;

    public teleportCallback: Function;
    public cheatScoreCallback: Function;
    public profileToggleCallback: Function;
    public inventoryToggleCallback: Function;
    public warpToggleCallback: Function;
    public orientationCallback: Function;
    public regionCallback: Function;
    public killCallback: Function;
    public attackCallback: Function;
    public npcTalkCallback: Function;
    public doorCallback: Function;
    public readyCallback: Function;

    constructor(world: World, database: MongoDB, connection: Connection, clientId: string) {
        super(-1, 'player', connection.id, -1, -1);

        this.world = world;
        this.database = database;
        this.connection = connection;

        this.clientId = clientId;

        this.map = world.map;
        this.regions = world.map.regions;
        this.globalObjects = world.globalObjects;

        this.incoming = new Incoming(this);

        this.ready = false;

        this.moving = false;
        this.potentialPosition = null;
        this.futurePosition = null;
        this.regionPosition = null;

        this.newRegion = false;

        this.team = null;
        this.userAgent = null;
        this.minigame = null;

        this.disconnectTimeout = null;
        this.timeoutDuration = Constants.TIMEOUT_DURATION; //10 minutes
        this.lastRegionChange = new Date().getTime();

        this.equipment = new Equipments(this);
        this.inventory = new Inventory(this, 20);
        this.professions = new Professions(this);
        this.abilities = new Abilities(this);
        // this.friends = new Friends(this);
        this.enchant = new Enchant(this);
        this.bank = new Bank(this, 56);
        this.quests = new Quests(this);
        //this.trade = new Trade(this);
        this.doors = new Doors(this);
        this.warp = new Warp(this);

        this.handler = new Handler(this);

        this.introduced = false;
        this.currentSong = null;
        this.acceptedTrade = false;
        this.invincible = false;
        this.noDamage = false;
        this.isGuest = false;

        this.pvp = false;

        this.canTalk = true;

        this.instanced = false;
        this.visible = true;

        this.talkIndex = 0;
        this.cheatScore = 0;
        this.defaultMovementSpeed = Constants.MOVEMENT_SPEED; // For fallback.

        this.regionsLoaded = [];
        this.lightsLoaded = [];

        this.npcTalk = null;
    }

    load(data: any) {
        this.kind = data.kind;
        this.rights = data.rights;
        this.experience = data.experience;
        this.ban = data.ban;
        this.mute = data.mute;
        this.membership = data.membership;
        this.lastLogin = data.lastLogin;
        this.pvpKills = data.pvpKills;
        this.pvpDeaths = data.pvpDeaths;
        this.orientation = data.orientation;
        this.mapVersion = data.mapVersion;
            
        this.setPosition(data.x, data.y, data.z);
        this.warp.setLastWarp(data.lastWarp);

        this.level = Formulas.expToLevel(this.experience);
        this.nextExperience = Formulas.nextExp(this.experience);
        this.prevExperience = Formulas.prevExp(this.experience);
        this.playerHitPoints = new HitPoints(data.playerHitPoints, Formulas.getMaxHitPoints(this.level));
        this.mana = new Mana(data.mana, Formulas.getMaxMana(this.level));

        if (data.invisibleIds) this.invisiblesIds = data.invisibleIds.split(' ');

        this.userAgent = data.userAgent;

        this.equipment.load(data.equipment);
    }

    destroy() {
        clearTimeout(this.disconnectTimeout);

        this.disconnectTimeout = null;

        this.handler.destroy();

        this.handler = null;
        this.inventory = null;
        this.abilities = null;
        this.enchant = null;
        this.bank = null;
        this.quests = null;
        this.trade = null;
        this.doors = null;
        this.warp = null;

        this.connection = null;
    }

    loadReady(): void {
        this.sendMap();
        this.sendEquipment();

        this.loadProfessions();
        this.loadInventory();
        this.loadQuests();
        this.loadBank();
    }

    loadRegions(regions: any) {
        if (!regions) return;

        if (this.mapVersion !== this.map.version) {
            this.mapVersion = this.map.version;

            this.save();

            if (config.debug) log.info(`Updated map version for ${this.username}`);

            return;
        }

        if (regions.gameVersion === config.gver) this.regionsLoaded = regions.regions.split(',');
    }

    loadProfessions() {
        if (config.offlineMode) return;

        this.database.loader.getProfessions(this, (info: any) => {
            if (!info)
                // If this somehow happens.
                return;

            this.professions.update(info);

            this.sendProfessions();
        });
    }

    loadFriends() {
        if (config.offlineMode) return;

        this.database.loader.getFriends(this, (info: any) => {
            if (!info) return;

            this.friends.update(info);
        });
    }

    loadInventory() {
        if (config.offlineMode) {
            this.inventory.loadEmpty();
            return;
        }

        this.database.loader.getInventory(
            this,
            (
                ids: Array<number>,
                counts: Array<number>,
                skills: Array<number>,
                skillLevels: Array<number>
            ) => {
                if (ids === null || counts === null) {
                    this.inventory.loadEmpty();
                    return;
                }

                if (ids.length !== this.inventory.size) this.save();

                this.inventory.load(ids, counts, skills, skillLevels);
                this.inventory.check();
            }
        );
    }

    loadBank() {
        if (config.offlineMode) {
            this.bank.loadEmpty();
            return;
        }

        this.database.loader.getBank(this, (ids, counts, skills, skillLevels) => {
            if (ids === null || counts === null) {
                this.bank.loadEmpty();
                return;
            }

            if (ids.length !== this.bank.size) this.save();

            this.bank.load(ids, counts, skills, skillLevels);
            this.bank.check();
        });
    }

    loadQuests() {
        if (config.offlineMode) return;

        this.database.loader.getAchievements(this, (ids: any, progress: any) => {
            ids.pop();
            progress.pop();

            if (this.quests.getAchievementSize() !== ids.length) {
                log.info('Mismatch in achievements data.');

                this.save();
            }

            this.quests.updateAchievements(ids, progress);
        });

        this.database.loader.getQuests(this, (ids: any, stages: any) => {
            if (!ids || !stages) {
                this.quests.updateQuests(ids, stages);
                return;
            }

            /* Removes the empty space created by the loader */

            ids.pop();
            stages.pop();

            if (this.quests.getQuestSize() !== ids.length) {
                log.info('Mismatch in quest data.');

                this.save();
            }

            this.quests.updateQuests(ids, stages);
        });

        this.quests.onAchievementsReady(() => {
            this.send(
                new Messages.Quest(
                    Packets.QuestOpcode.AchievementBatch,
                    this.quests.getAchievementData()
                )
            );

            /* Update region here because we receive quest info */
            if (this.questsLoaded) this.updateRegion();

            this.achievementsLoaded = true;
        });

        this.quests.onQuestsReady(() => {
            this.send(
                new Messages.Quest(Packets.QuestOpcode.QuestBatch, this.quests.getQuestData())
            );

            /* Update region here because we receive quest info */
            if (this.achievementsLoaded) this.updateRegion();

            this.questsLoaded = true;
        });
    }

    intro() {
        if (this.ban > new Date().getTime()) {
            this.connection.sendUTF8('ban');
            this.connection.close('Player: ' + this.username + ' is banned.');
        }

        if (this.playerHitPoints.getHitPoints() < 0) this.playerHitPoints.setHitPoints(this.getMaxHitPoints());

        if (this.mana.getMana() < 0) this.mana.setMana(this.mana.getMaxMana());

        this.verifyRights();

        let info = {
            id: this.instance,
            username: Utils.formatUsername(this.username),
            x: this.x,
            y: this.y,
            z: this.z,
            kind: this.kind,
            rights: this.rights,
            hitPoints: this.playerHitPoints.getData(),
            mana: this.mana.getData(),
            experience: this.experience,
            nextExperience: this.nextExperience,
            prevExperience: this.prevExperience,
            level: this.level,
            lastLogin: this.lastLogin,
            pvpKills: this.pvpKills,
            pvpDeaths: this.pvpDeaths,
            orientation: this.orientation,
            movementSpeed: this.getMovementSpeed()
        };

        this.regionPosition = [this.gridX, this.gridY];

        /**
         * Send player data to client here
         */

        this.world.entities.addPlayer(this);

        this.introduced = true;

        this.send(new Messages.Welcome(info));
    }

    verifyRights() {
        if (config.moderators.includes(this.username.toLowerCase())) this.rights = 1;

        if (config.administrators.includes(this.username.toLowerCase()) || config.offlineMode)
            this.rights = 2;
    }

    addExperience(exp: number) {
        this.experience += exp;

        let oldLevel = this.level;

        this.level = Formulas.expToLevel(this.experience);
        this.nextExperience = Formulas.nextExp(this.experience);
        this.prevExperience = Formulas.prevExp(this.experience);

        if (oldLevel !== this.level) {
            this.playerHitPoints.setMaxHitPoints(Formulas.getMaxHitPoints(this.level));
            this.healHitPoints(this.playerHitPoints.maxPoints);

            this.updateRegion();

            this.popup('Level Up!', `Congratulations, you are now level ${this.level}!`, '#ff6600');
        }

        let data: any = {
            id: this.instance,
            level: this.level
        };

        /**
         * Sending two sets of data as other users do not need to
         * know the experience of another player.. (yet).
         */

        this.sendToAdjacentRegions(
            this.region,
            new Messages.Experience(Packets.ExperienceOpcode.Combat, data),
            this.instance
        );

        data.amount = exp;
        data.experience = this.experience;
        data.nextExperience = this.nextExperience;
        data.prevExperience = this.prevExperience;

        this.send(new Messages.Experience(Packets.ExperienceOpcode.Combat, data));

        this.sync();
    }

    heal(amount: number): void {
        /**
         * Passed from the superclass...
         */

        if (!this.playerHitPoints || !this.mana) return;

        this.playerHitPoints.heal(amount);
        this.mana.heal(amount);

        this.sync();
    }

    healHitPoints(amount: number): void {
        let type = 'health';

        this.playerHitPoints.heal(amount);

        this.sync();

        this.sendToAdjacentRegions(
            this.region,
            new Messages.Heal({
                id: this.instance,
                type,
                amount
            })
        );
    }

    healManaPoints(amount: number): void {
        let type = 'mana';

        this.mana.heal(amount);

        this.sync();

        this.sendToAdjacentRegions(
            this.region,
            new Messages.Heal({
                id: this.instance,
                type,
                amount
            })
        );
    }

    eat(id: number): void {
        let item = Items.getPlugin(id);

        if (!item) return;

        new item(id).onUse(this);
    }

    updateRegion(force?: boolean): void {
        this.world.region.sendRegion(this, force);
    }

    isInvisible(instance: string): boolean {
        let entity = this.world.entities.get(instance);

        if (!entity) return false;

        return super.hasInvisibleId(entity.id) || super.hasInvisible(entity);
    }

    formatInvisibles(): string {
        return this.invisiblesIds.join(' ');
    }

    canEquip(string: string): boolean {
        let requirement = Items.getLevelRequirement(string);

        if (requirement > Constants.MAX_LEVEL) requirement = Constants.MAX_LEVEL;

        if (requirement > this.level) {
            this.notify('You must be at least level ' + requirement + ' to equip this.');
            return false;
        }

        return true;
    }

    die(): void {
        this.dead = true;

        if (this.deathCallback) this.deathCallback();

        this.send(new Messages.Death(this.instance));
    }

    /**
     * 
     * @param x Absolute x position (not gridX)
     * @param y Absolute y position (not gridY)
     * @param isDoor Whether the teleport is a door type.
     * @param animate Do we animate the teleportation?
     */

    teleport(x: number, y: number, isDoor?: boolean, animate?: boolean): void {
        let z = this.map.getPlateauLevel(x, y);

        if (this.teleportCallback) this.teleportCallback(x, y, z, isDoor);

        this.sendToAdjacentRegions(
            this.region,
            new Messages.Teleport({
                id: this.instance,
                x,
                y,
                z,
                withAnimation: animate
            })
        );

        this.setPosition(x, y, z);

        this.world.cleanCombat(this);
    }

    /**
     * We route all object clicks through the player instance
     * in order to organize data more neatly.
     */

    handleObject(id: string): void {
        let info = this.globalObjects.getInfo(id);

        if (!info) return;

        let data: any,
            message: string,
            lumberjacking: Lumberjacking;

        switch (info.type) {
            case 'sign':
                data = this.globalObjects.getSignData(id);

                if (!data) return;

                message = this.globalObjects.talk(data.object, this);

                this.world.push(Packets.PushOpcode.Player, {
                    player: this,
                    message: new Messages.Bubble({
                        id: id,
                        text: message,
                        duration: 5000,
                        isObject: true,
                        info: data.info
                    })
                });

                break;

            case 'lumberjacking':
                lumberjacking = this.professions.getProfession(
                    Modules.Professions.Lumberjacking
                );

                if (lumberjacking) lumberjacking.handle(id, info.tree);

                break;
        }
    }

    handleDoor(x?: number, y?: number): void {
        let door = this.world.getArea(Modules.Areas.Doors).inArea(x, y);

        log.debug(`x: ${x} - y: ${y}`);
        log.debug(door);

        if (!door) return;

        let destination = this.doors.getDestination(door);

        this.teleport(destination.x, destination.y, true);
    }

    incrementCheatScore(amount: number): void {
        if (this.inCombat()) return;

        this.cheatScore += amount;

        if (this.cheatScoreCallback) this.cheatScoreCallback();
    }

    updatePVP(pvp: boolean, permanent?: boolean): void {
        /**
         * No need to update if the state is the same
         */

        if (!this.region) return;

        if (this.pvp === pvp || this.permanentPVP) return;

        if (this.pvp && !pvp) this.notify('You are no longer in a PvP zone!');
        else this.notify('You have entered a PvP zone!');

        this.pvp = pvp;
        this.permanentPVP = permanent;

        this.sendToAdjacentRegions(this.region, new Messages.PVP(this.instance, this.pvp));
    }

    updateOverlay(overlay: Area): void {
        if (this.overlayArea === overlay) return;

        this.overlayArea = overlay;

        if (!overlay) {
            this.send(new Messages.Overlay(Packets.OverlayOpcode.Default));
            return;
        }

        this.send(new Messages.Overlay(Packets.OverlayOpcode.Set, overlay.overlayColour));
    }

    updateCamera(camera: Area): void {
        if (this.cameraArea === camera) return;

        this.cameraArea = camera;

        if (!camera) {
            this.send(new Messages.Camera(Packets.CameraOpcode.Default));
            return;
        }

        switch (camera.cameraType) {
            case 'lock': 
                this.send(new Messages.Camera(Packets.CameraOpcode.Lock, {
                    left: camera.x,
                    top: camera.y,
                    right: camera.x + camera.width,
                    bottom: camera.y + camera.height
                }));
                break;
        }
    }

    updateMusic(song: string): void {
        this.currentSong = song;

        this.send(new Messages.Audio(song));
    }

    revertPoints(): void {
        this.playerHitPoints.setHitPoints(this.playerHitPoints.getMaxHitPoints());
        this.mana.setMana(this.mana.getMaxMana());

        this.sync();
    }

    applyDamage(damage: number): void {
        this.playerHitPoints.decrement(damage);
    }

    toggleProfile(state: boolean): void {
        this.profileDialogOpen = state;

        if (this.profileToggleCallback) this.profileToggleCallback(state);
    }

    toggleInventory(state: boolean): void {
        this.inventoryOpen = state;

        if (this.inventoryToggleCallback) this.inventoryToggleCallback(state);
    }

    toggleWarp(state: boolean): void {
        this.warpOpen = state;

        if (this.warpToggleCallback) this.warpToggleCallback(state);
    }

    getMana() {
        return this.mana.getMana();
    }

    getMaxMana() {
        return this.mana.getMaxMana();
    }

    getHitPoints() {
        return this.playerHitPoints.getHitPoints();
    }

    getMaxHitPoints() {
        return this.playerHitPoints.getMaxHitPoints();
    }

    getTutorial() {
        return this.quests.getQuest(Modules.Quests.Introduction);
    }

    getLumberjackingLevel() {
        return this.professions.getProfession(Modules.Professions.Lumberjacking).getLevel();
    }

    // We get dynamic trees surrounding the player
    getSurroundingTrees() {
        let tiles = {
            indexes: [],
            data: [],
            collisions: [],
            objectData: {}
        };

        _.each(this.map.treeIndexes, (index: number) => {
            let position = this.map.indexToGridPosition(index + 1),
                treeRegion = this.regions.regionIdFromPosition(position.gridX, position.gridY);

            if (!this.regions.isSurrounding(this.region, treeRegion)) return;

            let objectId = this.map.getPositionObject(position.gridX, position.gridY);

            tiles.indexes.push(index);
            tiles.data.push(this.map.data[index]);
            tiles.collisions.push(this.map.collisions.includes(index));

            if (objectId)
                tiles.objectData[index] = {
                    isObject: !!objectId
                };
        });

        return tiles;
    }

    getMovementSpeed(): number {
        let itemMovementSpeed = this.equipment.getMovementSpeed(),
            movementSpeed = itemMovementSpeed || this.defaultMovementSpeed;

        /*
         * Here we can handle equipment/potions/abilities that alter
         * the player's movement speed. We then just broadcast it.
         */

        this.movementSpeed = movementSpeed;

        return this.movementSpeed;
    }

    /**
     * Setters
     */

    setPosition(x: number, y: number, z?: number, running?: boolean): void {
        if (this.dead) return;

        super.setPosition(x, y, z);

        if (this.map.isEmpty(this.gridX, this.gridY)) {
            log.debug(`Player ${this.username} is out of bounds.`);
            this.sendToSpawn();
            return;
        }

        let movementInfo: any = {
            id: this.instance,
            x,
            y,
            forced: false,
            teleport: false
        };

        if (running)
            movementInfo.running = running;

        this.sendToAdjacentRegions(
            this.region,
            new Messages.Movement(Packets.MovementOpcode.Move, movementInfo),
            this.instance
        );
    }

    setOrientation(orientation: number): void {
        this.orientation = orientation;

        if (this.orientationCallback)
            // Will be necessary in the future.
            this.orientationCallback;
    }

    setFuturePosition(x: number, y: number): void {
        /**
         * Most likely will be used for anti-cheating methods
         * of calculating the actual time and duration for the
         * displacement.
         */

        this.futurePosition = {
            x,
            y
        };
    }

    loadRegion(regionId: string): void {
        this.regionsLoaded.push(regionId);
    }

    hasLoadedRegion(region: string): boolean {
        return this.regionsLoaded.includes(region);
    }

    hasLoadedLight(light: string): boolean {
        return this.lightsLoaded.includes(light);
    }

    timeout(): void {
        if (!this.connection) return;

        this.connection.sendUTF8('timeout');
        this.connection.close('Player timed out.');
    }

    refreshTimeout(): void {
        clearTimeout(this.disconnectTimeout);

        this.disconnectTimeout = setTimeout(() => {
            this.timeout();
        }, this.timeoutDuration);
    }

    /**
     * Getters
     */

    hasMaxHitPoints(): boolean {
        return this.getHitPoints() >= this.playerHitPoints.getMaxHitPoints();
    }

    hasMaxMana(): boolean {
        return this.mana.getMana() >= this.mana.getMaxMana();
    }

    canBeStunned(): boolean {
        return true;
    }

    getState(): any {
        return {
            type: this.type,
            id: this.instance,
            name: Utils.formatUsername(this.username),
            x: this.x,
            y: this.y,
            rights: this.rights,
            level: this.level,
            pvp: this.pvp,
            pvpKills: this.pvpKills,
            pvpDeaths: this.pvpDeaths,
            attackRange: this.attackRange,
            orientation: this.orientation,
            hitPoints: this.playerHitPoints.getData(),
            movementSpeed: this.getMovementSpeed(),
            mana: this.mana.getData(),
            equipment: this.equipment.getData()
        };
    }

    getRemoteAddress(): string {
        return this.connection.getRemoteAddress();
    }

    getSpawn(): any {
        /**
         * Here we will implement functions from quests and
         * other special events and determine a spawn point.
         */

        //if (!this.finishedTutorial()) return this.getTutorial().getSpawn();

        return { x: 14 * 32, y: 10 * 32 };
    }

    getHit(target?: Character): Hit {
        let weapon = this.equipment.getEquipment(Modules.Equipment.Weapon),
            defaultDamage = Formulas.getDamage(this, target),
            isSpecial = Utils.randomInt(0, 100) < 30 + weapon.getAbilityLevel() * 3;

        if (!isSpecial || !this.hasSpecialAttack())
            return new Hit(Modules.Hits.Damage, defaultDamage);

        let multiplier: number, damage: number;

        switch (weapon.getAbility()) {
            case Modules.Enchantment.Critical:
                /**
                 * Still experimental, not sure how likely it is that you're
                 * gonna do a critical strike. I just do not want it getting
                 * out of hand, it's easier to buff than to nerf..
                 */

                multiplier = 1.0 + weapon.getAbilityLevel();
                damage = defaultDamage * multiplier;

                return new Hit(Modules.Hits.Critical, damage);

            case Modules.Enchantment.Stun:
                return new Hit(Modules.Hits.Stun, defaultDamage);

            case Modules.Enchantment.Explosive:
                return new Hit(Modules.Hits.Explosive, defaultDamage);
        }
    }

    isMuted(): boolean {
        let time = new Date().getTime();

        return this.mute - time > 0;
    }

    isDead(): boolean {
        return this.getHitPoints() < 1 || this.dead;
    }

    /**
     * Miscellaneous
     */

    send(message: typeof Messages): void {
        this.world.push(Packets.PushOpcode.Player, {
            player: this,
            message
        });
    }

    sendToRegion(message: typeof Messages): void {
        this.world.push(Packets.PushOpcode.Region, {
            regionId: this.region,
            message
        });
    }

    sendToAdjacentRegions(regionId: string, message: typeof Messages, ignoreId?: string): void {
        this.world.push(Packets.PushOpcode.Regions, {
            regionId,
            message,
            ignoreId
        });
    }

    sendMap(): void {
        this.send(new Messages.Map(Packets.MapOpcode.Info, {
            width: this.map.width,
            height: this.map.height,
            version: this.map.version
        }));
    }

    sendEquipment(): void {
        this.send(new Messages.Equipment(Packets.EquipmentOpcode.Batch, this.equipment.getData()));
    }

    sendProfessions(): void {
        if (!this.professions) return;

        this.send(
            new Messages.Profession(Packets.ProfessionOpcode.Batch, {
                data: this.professions.getInfo()
            })
        );
    }

    sendToSpawn(): void {
        let position = this.getSpawn();

        this.teleport(position.x, position.y);
    }

    sendMessage(playerName: string, message: string): void {
        if (config.hubEnabled) {
            this.world.api.sendPrivateMessage(this, playerName, message);
            return;
        }

        if (!this.world.isOnline(playerName)) {
            this.notify(`@aquamarine@${playerName}@crimson@ is not online.`, 'crimson');
            return;
        }

        let otherPlayer = this.world.getPlayerByName(playerName),
            oFormattedName = Utils.formatUsername(playerName), // Formated username of the other player.
            formattedName = Utils.formatUsername(this.username); // Formatted username of current instance.

        otherPlayer.notify(`[From ${oFormattedName}]: ${message}`, 'aquamarine');
        this.notify(`[To ${formattedName}]: ${message}`, 'aquamarine');
    }

    sendAnimation(animationId: number, ignoreId?: string): void {
        this.sendToAdjacentRegions(this.region, new Messages.Animation(this.instance, animationId), ignoreId);
    }

    sync(): void {
        /**
         * Function to be used for syncing up health,
         * mana, exp, and other variables
         */

        if (!this.playerHitPoints || !this.mana) return;

        let info = {
            id: this.instance,
            attackRange: this.attackRange,
            hitPoints: this.getHitPoints(),
            maxHitPoints: this.getMaxHitPoints(),
            mana: this.mana.getMana(),
            maxMana: this.mana.getMaxMana(),
            level: this.level,
            poison: !!this.poison,
            movementSpeed: this.getMovementSpeed()
        };

        this.sendToAdjacentRegions(this.region, new Messages.Sync(info));

        this.save();
    }

    popup(title: string, message: string, colour: string): void {
        if (!title) return;

        title = Utils.parseMessage(title);
        message = Utils.parseMessage(message);

        this.send(
            new Messages.Notification(Packets.NotificationOpcode.Popup, {
                title,
                message,
                colour
            })
        );
    }

    notify(message: string, colour?: string): void {
        if (!message) return;

        // Prevent notify spams
        if (new Date().getTime() - this.lastNotify < 250) return;

        message = Utils.parseMessage(message);

        this.send(
            new Messages.Notification(Packets.NotificationOpcode.Text, {
                message,
                colour
            })
        );

        this.lastNotify = new Date().getTime();
    }

    /**
     * Sends a chat packet that can be used to
     * show special messages to the player.
     */

    chat(source: string, text: string, colour?: string, isGlobal?: boolean, withBubble?: boolean): void {
        if (!source || !text) return;

        this.send(
            new Messages.Chat({
                name: source,
                text,
                colour,
                isGlobal,
                withBubble
            })
        );
    }

    stopMovement(force?: boolean): void {
        /**
         * Forcefully stopping the player will simply halt
         * them in between tiles. Should only be used if they are
         * being transported elsewhere.
         */

        this.send(
            new Messages.Movement(Packets.MovementOpcode.Stop, {
                instance: this.instance,
                force
            })
        );
    }

    finishedTutorial(): boolean {
        if (!this.quests || !config.tutorialEnabled) return true;

        return this.quests.getQuest(0).isFinished();
    }

    finishedAchievement(id: number): boolean {
        if (!this.quests) return false;

        let achievement = this.quests.getAchievement(id);

        if (!achievement) return true;

        return achievement.isFinished();
    }

    finishAchievement(id: number): boolean {
        if (!this.quests) return;

        let achievement = this.quests.getAchievement(id);

        if (!achievement || achievement.isFinished()) return;

        achievement.finish();
    }

    checkRegions() {
        if (!this.regionPosition) return;

        let diffX = Math.abs(this.regionPosition[0] - this.gridX),
            diffY = Math.abs(this.regionPosition[1] - this.gridY);

        if (diffX >= 10 || diffY >= 10) {
            this.regionPosition = [this.gridX, this.gridY];

            if (this.regionCallback) this.regionCallback();
        }
    }

    movePlayer() {
        /**
         * Server-sided callbacks towards movement should
         * not be able to be overwritten. In the case that
         * this is used (for Quests most likely) the server must
         * check that no hacker removed the constraint in the client-side.
         * If they are not within the bounds, apply the according punishment.
         */

        this.send(new Messages.Movement(Packets.MovementOpcode.Started));
    }

    walkRandomly() {
        setInterval(() => {
            this.setPosition(this.gridX + Utils.randomInt(-5, 5), this.gridY + Utils.randomInt(-5, 5));
        }, 2000);
    }

    killCharacter(character: Character) {
        if (this.killCallback) this.killCallback(character);
    }

    save() {
        if (config.offlineMode || this.isGuest) return;

        if ((!this.questsLoaded || !this.achievementsLoaded) && !this.new) return;

        this.database.creator.save(this);
    }

    inTutorial() {
        return false;
    }

    hasAggressionTimer() {
        return new Date().getTime() - this.lastRegionChange < 1200000; // 20 Minutes
    }

    onOrientation(callback: Function) {
        this.orientationCallback = callback;
    }

    onRegion(callback: Function) {
        this.regionCallback = callback;
    }

    onAttack(callback: Function) {
        this.attackCallback = callback;
    }

    onHit(callback: Function) {
        this.hitCallback = callback;
    }

    onKill(callback: Function) {
        this.killCallback = callback;
    }

    onDeath = (callback: Function) => {
        this.deathCallback = callback;
    };

    onTalkToNPC(callback: Function) {
        this.npcTalkCallback = callback;
    }

    onDoor(callback: Function) {
        this.doorCallback = callback;
    }

    onTeleport(callback: Function) {
        this.teleportCallback = callback;
    }

    onProfile(callback: Function) {
        this.profileToggleCallback = callback;
    }

    onInventory(callback: Function) {
        this.inventoryToggleCallback = callback;
    }

    onWarp(callback: Function) {
        this.warpToggleCallback = callback;
    }

    onCheatScore(callback: Function) {
        this.cheatScoreCallback = callback;
    }

    onReady(callback: Function) {
        this.readyCallback = callback;
    }
}

export default Player;
