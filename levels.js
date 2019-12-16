import {BaseBlock, BaseRoom, BaseSlingshot, Consts, LevelInfo, pickOneValue} from './common.js'
import {PhysicsBlock} from './physics.js'
import {Vector3} from "./node_modules/three/build/three.module.js"
import {ThreeBlock, ThreeSlingshot} from './three.js'



export function loadStructure(name,world) {
    console.log("fetching",name)
    return fetch(`${Consts.BASE_URL}${name}?cachebust=${Math.random()}`)
        .then(res => res.json())
        .then(res => {
            return loadFromJSON(res,world)
        })
}

function  loadFromJSON(doc,world) {
    const l = world.createEntity()
    l.addComponent(LevelInfo)
    const level = l.getMutableComponent(LevelInfo)
    level.blocks = []
    const newBlocks = doc.data.blocks.map(b => {
        const block = world.createEntity()
        block.addComponent(BaseBlock)
        const b2 = block.getMutableComponent(BaseBlock)
        b2.set('position',b.position)
        b2.set('width',b.size.width)
        b2.set('height',b.size.height)
        b2.set('depth',b.size.depth)
        b2.set('rotation',b.rotation)
        if(b.physicstype === "fixed") b.physicstype = Consts.BLOCK_TYPES.BLOCK
        if(b.physicstype === "dynamic") b.physicstype = Consts.BLOCK_TYPES.BLOCK
        b2.set('physicstype',b.physicstype)
        block.addComponent(PhysicsBlock)
        block.addComponent(ThreeBlock)
        return block
    })

    if(!doc.data.ballRadius) level.ballRadius = 0.25
    if(!doc.data.ballMass) level.ballMass = 5
    if(typeof doc.data.wallFriction !== 'undefined') {
        level.wallFriction = doc.data.wallFriction
        level.wallRestitution = doc.data.wallRestitution
    }

    if(typeof doc.data.gravity !== 'undefined') {
        const g = doc.data.gravity
        level.gravity.copy(g)
    }
    if(typeof doc.data.hasGravity !== 'undefined') {
        level.hasGravity = doc.data.hasGravity
    }
    if(typeof doc.data.roomType !== 'undefined') {
        level.roomType = doc.data.roomType
    } else {
        level.roomType = Consts.ROOM_TYPES.FLOOR
    }

    world.createEntity().addComponent(BaseRoom, {type:level.roomType})
    return newBlocks
}


