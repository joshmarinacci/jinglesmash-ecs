import {World, System} from "./node_modules/ecsy/build/ecsy.module.js"
import {Consts, Globals} from './common'
import {Block} from './physics'
import {ThreeScene} from './three'

function pickOne(arr) {
    return arr[Math.floor(Math.random()*arr.length)]
}

function pickOneValue(obj) {
    return obj[pickOne(Object.keys(obj))]
}

export class LevelInfo {
    constructor() {
        this.ballRadius = 0.25
        this.ballMass = 5
        this.ballType = pickOneValue(Consts.BALL_TYPES)
        this.wallFriction = null
        this.wallRestitution = null
        // this.gravity = g
        this.hasGravity = true
        this.roomType = 'roomType'
    }
}

export  class LevelLoaderSystem extends System {
    init() {
        return {
            queries: {
                three: { components: [ThreeScene], },
                levels: {
                    components: [LevelInfo],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                }
            }
        }
    }
    execute(delta) {
        this.events.levels.added.forEach(ent => {
            console.log("added a level",ent)
            const info = ent.getMutableComponent(LevelInfo)
            console.log("info is",info)
            this.loadStructure(info).then(()=>{
                console.log("fully loaded")
            })
        })
    }
    loadStructure(info) {
        console.log("fetching",info)
        return fetch(`${Consts.BASE_URL}${info.name}?cachebust=${Math.random()}`)
            .then(res => res.json())
            .then(res => {
                return this.loadFromJSON(res,info)
            })
    }

    loadFromJSON(doc,level) {
        console.log("loading level",doc)
        const sc = this.queries.three[0].getComponent(ThreeScene)
        // level.blocks.forEach(b => {
        //     this.group.remove(b.getObject3D())
        //     world.removeBody(b.body)
        // })
        level.blocks = []
        const newBlocks = doc.data.blocks.map(b => {
            // console.log("adding block",b)
            const block = this.world.createEntity()
            block.addComponent(Block)
            const b2 = block.getMutableComponent(Block)
            // console.log(sc)
            sc.scene.add(b2.obj)
            // const b2 = this.makeBlock()
            b2.frozen = true
            const p = b.position
            b2.position.copy(p)
            // b2.positionSet(p.x,p.y,p.z)
            // b2.setWidth(b.size.width)
            // b2.setHeight(b.size.height)
            // b2.setDepth(b.size.depth)
            // b2.set('rotx',b.rotation.x)
            // b2.set('roty',b.rotation.y)
            // b2.set('rotz',b.rotation.z)
            // b2.set('physicstype',b.physicstype)
            // b2.frozen = false
            // b2.rebuildGeometry()
            return block
        })

        // level.ballRadius = doc.data.ballRadius
        // if(!doc.data.ballRadius) level.ballRadius = 0.25
        // this.ballMass = doc.data.ballMass
        // if(!doc.data.ballMass) this.ballMass = 5

        // this.ballType = BALL_TYPES[pickOne(Object.keys(BALL_TYPES))]

        // if(typeof doc.data.wallFriction !== 'undefined') {
        //     this.wallFriction = doc.data.wallFriction
        //     this.wallRestitution = doc.data.wallRestitution
        //     this.rebuildWallMaterial()
        // }

        // if(typeof doc.data.gravity !== 'undefined') {
        //     const g = doc.data.gravity
        //     world.gravity.set(g.x,g.y,g.z)
        // }
        // if(typeof doc.data.hasGravity !== 'undefined') {
        //     this.hasGravity = doc.data.hasGravity
        // }
        // if(typeof doc.data.roomType !== 'undefined') {
        //     this.roomType = doc.data.roomType
        // }
        //
        return newBlocks

    }
}


