import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {Consts, toRad} from './common.js'
import {Block, PhysicsFloor} from './physics.js'
import {ThreeScene} from './three.js'
import {Mesh, MeshLambertMaterial, PlaneGeometry, Vector3} from "./node_modules/three/build/three.module.js"

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
        this.gravity = new Vector3()
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
            const info = ent.getMutableComponent(LevelInfo)
            this.loadStructure(info).then(()=>{
                // console.log("fully loaded")
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
        const sc = this.queries.three[0].getComponent(ThreeScene)
        level.blocks = []
        const newBlocks = doc.data.blocks.map(b => {
            const block = this.world.createEntity()
            block.addComponent(Block)
            const b2 = block.getMutableComponent(Block)
            sc.scene.add(b2.obj)
            b2.set('position',b.position)
            b2.set('width',b.size.width)
            b2.set('height',b.size.height)
            b2.set('depth',b.size.depth)
            b2.set('rotation',b.rotation)
            b2.set('physicstype',b.physicstype)
            return block
        })

        if(!doc.data.ballRadius) level.ballRadius = 0.25
        if(!doc.data.ballMass) level.ballMass = 5
        if(typeof doc.data.wallFriction !== 'undefined') {
            console.log("wall friction",doc.data.wallFriction)
            console.log("wall restitution",doc.data.wallRestitution)
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
            this.startFloorRoom(level)
        }
        return newBlocks

    }
    startFloorRoom() {
        const floorObj = new Mesh(
            new PlaneGeometry(100,100,32,32),
            new MeshLambertMaterial({color:Consts.FLOOR_COLOR})
        )
        floorObj.receiveShadow = true
        floorObj.rotation.x = toRad(-90)
        const sc = this.queries.three[0].getComponent(ThreeScene)
        sc.scene.add(floorObj)
        const floor = this.world.createEntity()
        floor.addComponent(PhysicsFloor)
    }
}


