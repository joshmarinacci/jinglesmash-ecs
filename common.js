export class Globals {
    constructor() {
    }
}

export const Consts = {
    BASE_URL :  "https://vr.josh.earth/360/doc/",
    docid : "tumble_level5",
    BLOCK_TYPES : {
        FLOOR:'FLOOR',
        WALL:'WALL',
        BALL:'BALL',
        BLOCK:'BLOCK',
        CRYSTAL:'CRYSTAL',
    },

    ROOM_TYPES : {
        FLOOR:'FLOOR',
        CUBE:'CUBE',
    },

    BALL_TYPES : {
        PLAIN:'PLAIN',
        ORNAMENT1:'ornament1',
        ORNAMENT2:'ornament2',
    },

    BLOCK_COLORS : {
        FLOOR:0x666666,
        BALL:0xdd0000,// red
        WALL:0x666666, //purple/magenta
        CRYSTAL:0x00ccff, //light pale blue
        BLOCK:0x00ff00, //full blue
    },
    SELECTED_COLOR : 0xffff00, //yellow
    FLOOR_COLOR : 0xffffff,

    POSITION_NAMES : ['x','y','z'],
    ROTATION_NAMES : ['rotx','roty','rotz'],
}

export const $ = (sel) => document.querySelector(sel)
