let Constants: { [key: string]: any } = {
    MAX_STACK: 2147483646,
    MAX_LEVEL: 135,
    DROP_PROBABILITY: 1000, //1 in 1000
    MAX_PROFESSION_LEVEL: 100,
    POSITION_OFFSET: 0.75, // Offset due to character collision box
    MOVEMENT_SPEED: 80,
    TIMEOUT_DURATION: 10 * 60 * 1000, // 10 minutes
    DIAGONAL_FLAG: 0x20000000,
    VERTICAL_FLAG: 0x40000000,
    HORIZONTAL_FLAG: 0x80000000
};

Constants.Messages = {
    InventoryFull: 'You do not have enough space in your inventory!',
    NoDrop: 'You cannot drop an item here.'
};

export default Constants;
