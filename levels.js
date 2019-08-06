import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {Consts, toRad} from './common.js'
import {Block, PhysicsFloor} from './physics.js'
import {ThreeScene} from './three.js'
import {Mesh, MeshLambertMaterial, PlaneGeometry, Vector3} from "./node_modules/three/build/three.module.js"
import {pickOneValue} from './common.js'
import {Globals} from './common.js'
import {PhysicsCubeRoom} from './physics.js'


export class LevelInfo {
    constructor() {
        this.name = 'foo'
        this.ballRadius = 0.25
        this.ballMass = 5
        this.ballType = pickOneValue(Consts.BALL_TYPES)
        this.wallFriction = 0.0
        this.wallRestitution = 0.0
        this.gravity = new Vector3()
        this.hasGravity = true
        this.roomType = 'roomType'
    }
}

export function loadStructure(info,world) {
    console.log("fetching",info)
    return fetch(`${Consts.BASE_URL}${info.name}?cachebust=${Math.random()}`)
        .then(res => res.json())
        .then(res => {
            return loadFromJSON(res,info,world)
        })
}

function  loadFromJSON(doc,level,world) {
    level.blocks = []
    const newBlocks = doc.data.blocks.map(b => {
        const block = world.createEntity()
        block.addComponent(Block)
        const b2 = block.getMutableComponent(Block)
        b2.set('position',b.position)
        b2.set('width',b.size.width)
        b2.set('height',b.size.height)
        b2.set('depth',b.size.depth)
        b2.set('rotation',b.rotation)
        if(b.physicstype === "fixed") b.physicstype = Consts.BLOCK_TYPES.BLOCK
        if(b.physicstype === "dynamic") b.physicstype = Consts.BLOCK_TYPES.BLOCK
        b2.set('physicstype',b.physicstype)
        b2.rebuildMaterial()
        return block
    })

    if(!doc.data.ballRadius) level.ballRadius = 0.25
    if(!doc.data.ballMass) level.ballMass = 5
    if(typeof doc.data.wallFriction !== 'undefined') {
        // console.log("wall friction",doc.data.wallFriction)
        // console.log("wall restitution",doc.data.wallRestitution)
        level.wallFriction = doc.data.wallFriction
        level.wallRestitution = doc.data.wallRestitution
    //     this.rebuildWallMaterial()
    }

    if(typeof doc.data.gravity !== 'undefined') {
        const g = doc.data.gravity
        console.log("desired gravity",g)
        level.gravity.copy(g)
    }
    if(typeof doc.data.hasGravity !== 'undefined') {
        level.hasGravity = doc.data.hasGravity
    }
    if(typeof doc.data.roomType !== 'undefined') {
        level.roomType = doc.data.roomType
    }

    if(level.roomType === Consts.ROOM_TYPES.FLOOR) {
        world.createEntity().addComponent(PhysicsFloor)
    }
    if(level.roomType === Consts.ROOM_TYPES.CUBE) {
        world.createEntity().addComponent(PhysicsCubeRoom)
    }
    return newBlocks
}


