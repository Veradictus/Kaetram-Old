const Packets: { [key: string]: any } = {
    Handshake: 0,
    Intro: 1,
    Welcome: 2,
    Spawn: 3,
    List: 4,
    Who: 5,
    Equipment: 6,
    Ready: 7,
    Sync: 8,
    Movement: 9,
    Teleport: 10,
    Request: 11,
    Despawn: 12,
    Target: 13,
    Combat: 14,
    Animation: 15,
    Projectile: 16,
    Population: 17,
    Points: 18,
    Network: 19,
    Chat: 20,
    Command: 21,
    Inventory: 22,
    Bank: 23,
    Ability: 24,
    Quest: 25,
    Notification: 26,
    Blink: 27,
    Heal: 28,
    Experience: 29,
    Death: 30,
    Audio: 31,
    NPC: 32,
    Respawn: 33,
    Trade: 34,
    Enchant: 35,
    Guild: 36,
    Pointer: 37,
    PVP: 38,
    Click: 39,
    Warp: 40,
    Shop: 41,
    Minigame: 42,
    Map: 43,
    Overlay: 44, 
    Camera: 45,
    Bubble: 46,
    Client: 47,
    Profession: 48,
    BuildUp: 49,
    Area: 50
};

Packets.IntroOpcode = {
    Login: 0,
    Register: 1,
    Guest: 2
};

Packets.EquipmentOpcode = {
    Batch: 0,
    Equip: 1,
    Unequip: 2
};

Packets.MovementOpcode = {
    Move: 0,
    Orientate: 1
};

Packets.TargetOpcode = {
    Talk: 0,
    Attack: 1,
    None: 2,
    Object: 3
};

Packets.CombatOpcode = {
    Attack: 0
};

Packets.ProjectileOpcode = {
    Static: 0,
    Dynamic: 1,
    Create: 2,
    Update: 3,
    Impact: 4
};

Packets.NetworkOpcode = {
    Ping: 0,
    Pong: 1
};

Packets.InventoryOpcode = {
    Batch: 0,
    Add: 1,
    Remove: 2,
    Select: 3
};

Packets.BankOpcode = {
    Batch: 0,
    Add: 1,
    Remove: 2,
    Select: 3
};

Packets.QuestOpcode = {
    QuestBatch: 0,
    AchievementBatch: 1,
    Progress: 2,
    Finish: 3
};

Packets.NotificationOpcode = {
    Ok: 0,
    YesNo: 1,
    Text: 2,
    Popup: 3
};

Packets.ExperienceOpcode = {
    Combat: 0,
    Profession: 1
};

Packets.NPCOpcode = {
    Talk: 0,
    Store: 1,
    Bank: 2,
    Enchant: 3,
    Countdown: 4
};

Packets.TradeOpcode = {
    Request: 1,
    Accept: 2,
    Decline: 3
};

Packets.EnchantOpcode = {
    Select: 0,
    Remove: 1,
    Enchant: 2,
    Update: 3
};

Packets.GuildOpcode = {
    Create: 0,
    Join: 1,
    Leave: 2,
    Rank: 3,
    Loot: 4,
    Update: 5
};

Packets.PointerOpcode = {
    Location: 0,
    NPC: 1,
    Relative: 2,
    Remove: 3,
    Button: 4
};

Packets.ShopOpcode = {
    Open: 0,
    Buy: 1,
    Sell: 2,
    Refresh: 3,
    Select: 4,
    Remove: 5
};

Packets.MinigameOpcode = {
    TeamWar: 1,

    TeamWarOpcode: {
        Enter: 0,
        Team: 1,
        Red: 2,
        Blue: 3,
        Leave: 4,
        Countdown: 5
    }
};

Packets.MapOpcode = {
    Info: 0,
    Tileset: 1,
    Data: 2
};

Packets.OverlayOpcode = {
    Default: 0,
    Set: 1
};

Packets.CameraOpcode = {
    Default: 0,
    Lock: 1
};

Packets.PushOpcode = {
    Broadcast: 0,
    Selectively: 1,
    Player: 2,
    Players: 3,
    Region: 4,
    Regions: 5,
    NameArray: 6
};

Packets.CommandOpcode = {
    CtrlClick: 0,
    ClearMap: 1
};

Packets.ProfessionOpcode = {
    Batch: 0,
    Update: 1
};

Packets.AreaOpcode = {
    Door: 0,
    NPC: 1
};

export default Packets;
