import {World, System} from "./node_modules/ecsy/build/ecsy.module.js"
import {Consts, Globals} from './common'

export class LevelInfo {
    constructor() {
        this.ballRadius = 0.25
        this.ballMass = 5
        this.ballType = pickOneValue(Consts.BALL_TYPES)
        this.wallFriction = null
        this.wallRestitution = null
        this.gravity = g
        this.hasGravity = true
        this.roomType = 'roomType'
    }
}

export  class LevelLoaderSystem extends System {
    loadStructure(level) {
        console.log("fetching",currentLevel, game.levels[game.currentLevel])
        return fetch(`${Consts.BASE_URL}${level.name}?cachebust=${Math.random()}`)
            .then(res => res.json())
            .then(res => {
                return this.loadFromJSON(res,level)
            })
    }

    loadFromJSON(doc,level) {
        console.log("loading level",doc)
        // level.blocks.forEach(b => {
        //     this.group.remove(b.getObject3D())
        //     world.removeBody(b.body)
        // })
        level.blocks = []
        const newBlocks = doc.data.blocks.map(b => {
            // console.log("adding block",b)
            const b2 = this.makeBlock()
            b2.frozen = true
            const p = b.position
            b2.positionSet(p.x,p.y,p.z)
            b2.setWidth(b.size.width)
            b2.setHeight(b.size.height)
            b2.setDepth(b.size.depth)
            b2.set('rotx',b.rotation.x)
            b2.set('roty',b.rotation.y)
            b2.set('rotz',b.rotation.z)
            b2.set('physicstype',b.physicstype)
            b2.frozen = false
            b2.rebuildGeometry()
            return b2
        })

        level.ballRadius = doc.data.ballRadius
        if(!doc.data.ballRadius) level.ballRadius = 0.25
        this.ballMass = doc.data.ballMass
        if(!doc.data.ballMass) this.ballMass = 5

        this.ballType = BALL_TYPES[pickOne(Object.keys(BALL_TYPES))]

        if(typeof doc.data.wallFriction !== 'undefined') {
            this.wallFriction = doc.data.wallFriction
            this.wallRestitution = doc.data.wallRestitution
            this.rebuildWallMaterial()
        }

        if(typeof doc.data.gravity !== 'undefined') {
            const g = doc.data.gravity
            world.gravity.set(g.x,g.y,g.z)
        }
        if(typeof doc.data.hasGravity !== 'undefined') {
            this.hasGravity = doc.data.hasGravity
        }
        if(typeof doc.data.roomType !== 'undefined') {
            this.roomType = doc.data.roomType
        }

        return newBlocks

    }
}


