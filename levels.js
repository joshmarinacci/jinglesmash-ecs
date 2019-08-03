import {World, System} from "./node_modules/ecsy/build/ecsy.module.js"
import {Consts, Globals, toRad} from './common'
import {Block} from './physics'
import {ThreeScene} from './three'
import {
    PlaneGeometry,
    Object3D,
    Vector2,
    Vector3,
    Quaternion,
    BufferGeometry,
    Raycaster,
    Float32BufferAttribute,
    LineBasicMaterial,
    NormalBlending,
    SphereBufferGeometry,
    Line,
    Mesh,
    MeshLambertMaterial,
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    DefaultLoadingManager,
    Group,
} from "./node_modules/three/build/three.module.js"

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
            // const p = b.position
            // b2.position.copy(p)
            b2.set('position',b.position)
            // b2.positionSet(p.x,p.y,p.z)
            b2.set('width',b.size.width)
            b2.set('height',b.size.height)
            b2.set('depth',b.size.depth)
            b2.set('rotation',b.rotation)
            b2.set('physicstype',b.physicstype)
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
        if(typeof doc.data.roomType !== 'undefined') {
            level.roomType = doc.data.roomType
        }
        //
        console.log('room type is',level.roomType)

        if(level.roomType === Consts.ROOM_TYPES.FLOOR) {
            this.startFloorRoom(level)
        }
        return newBlocks

    }
    startFloorRoom() {
        /*
        //add floor
        const floorBody = new CANNON.Body({
            mass: 0 // mass == 0 makes the body static
        });
        floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
        floorBody.addShape(new CANNON.Plane());
        this.getWorld().addBody(floorBody);
        floorBody.jtype = BLOCK_TYPES.FLOOR
         */
        const floorObj = new Mesh(
            new PlaneGeometry(100,100,32,32),
            new MeshLambertMaterial({color:Consts.FLOOR_COLOR})
        )
        floorObj.receiveShadow = true
        floorObj.rotation.x = toRad(-90)
        const sc = this.queries.three[0].getComponent(ThreeScene)
        sc.scene.add(floorObj)

        // floorBody.userData = {obj:floorObj}
        // floorBody.userData.skipRaycast = true
        // this.floors.push(floorBody)
    }
}


