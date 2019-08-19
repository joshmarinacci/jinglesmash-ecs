import {Quaternion, Euler, Vector3} from "./node_modules/three/build/three.module.js"

export class Globals {
    constructor() {
        this.playing = false
        this.balls = -1
        this.removeBalls = false
        this.removeFloors = false
        this.nextLevel = false
        this.levelIndex = 0
        this.physicsActive = false
        this.collisionsActive = false
        this.immersive = false
        this.timeOfLastShot = 0
        this.inputMode = Consts.INPUT_MODES.UNSELECTED
    }
}


export const Consts = {
    BASE_URL :  "https://vr.josh.earth/360/doc/",
    docid : "tumble_level5",
    INPUT_MODES: {
        MOUSE:'MOUSE',
        VR:'VR',
        UNSELECTED:'UNSELECTED',
    },
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
    CUBE_SIDE_COLOR: 'teal',

    POSITION_NAMES : ['x','y','z'],
    ROTATION_NAMES : ['rotx','roty','rotz'],
    LEVEL_NAMES: [
    "tumble_level1",
    "tumble_level2",
    "tumble_level5",
    "tumble_level6",
    "tumble_level7",
    "tumble_level8",
    "tumble_level10",
    // "tumble_level11",
    "tumble_level12",
    "tumble_level13",
    "tumble_level14",
    "tumble_level9",
    "tumble_level15",
    ]
}

export const $ = (sel) => document.querySelector(sel)
export const on = (elem, type, cb) => elem.addEventListener(type,cb)
export const toRad = (deg) => deg * Math.PI/180
export const remap =  (val, smin, smax, emin, emax) => {
    const t =  (val-smin)/(smax-smin)
    return (emax-emin)*t + emin
}

export function pickOne(arr) {
    return arr[Math.floor(Math.random()*arr.length)]
}

export function pickOneValue(obj) {
    return obj[pickOne(Object.keys(obj))]
}
export function pickOneKey(obj) {
    return pickOne(Object.keys(obj))
}

export class BaseBall {
    constructor() {
        this.radius = 0.25
        this.position = new Vector3()
        this.velocity = new Vector3()
        this.quaternion = new Quaternion()
        this.type = Consts.BALL_TYPES.PLAIN
    }
    copy({
             radius=0.25,
             position=new Vector3(0,0,0),
             velocity=new Vector3(0,0,0),
            type=Consts.BALL_TYPES.PLAIN
         }) {
        this.radius = radius
        this.position.copy(position)
        this.velocity.copy(velocity)
        this.type = type
    }
}

export class BaseBlock {
    constructor() {
        this.width = 1
        this.height = 1
        this.depth = 1
        this.position = new Vector3()
        this.quaternion = new Quaternion()
        this.rotation = new Euler()
        this.physicsType = Consts.BLOCK_TYPES.BLOCK
    }
    set(name, value) {
        if(name === 'width' || name === 'height' || name === 'depth') {
            this[name] = value
            return
        }
        if(name === 'position') {
            this.position.copy(value)
            return
        }
        if(name === 'rotation') {
            this.rotation.set(value.x,value.y,value.z,'XYZ')
            return
        }
        if(name === 'physicstype') return this.physicsType = value
        throw new Error(`unknown property to set ${name}`)
    }
}

export class BaseRoom {
    constructor() {
        this.type = Consts.ROOM_TYPES.FLOOR
    }
}

export class BaseSlingshot {
    constructor() {
        this.target = new Vector3()
        this.ballType = Consts.BALL_TYPES.PLAIN
    }
}