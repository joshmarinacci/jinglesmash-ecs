import {DoubleSide, Mesh, MeshLambertMaterial, PlaneGeometry, Vector3} from "./node_modules/three/build/three.module.js"
import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {BaseBall, BaseBlock, Consts, Globals, toRad} from './common.js'
import {ThreeScene} from './three.js'
import {ParticlesGroup} from './particles.js'
import {LevelInfo} from './levels.js'


const wallMaterial = new CANNON.Material()
const ballMaterial = new CANNON.Material()

export class PhysicsBall {
    constructor() {
        this.body = null
    }
}

export class PhysicsFloor {
}
export class PhysicsCubeRoom {
}

export class PhysicsBlock {
    constructor() {
        this.body = null
    }
}

const fixedTimeStep = 1.0 / 60.0; // seconds
const maxSubSteps = 3;

export class PhysicsSystem extends System {
    init() {
        this.cannonWorld = new CANNON.World();
        this.cannonWorld.gravity.set(0, -9.82, 0);




        return {
            queries: {
                three: { components: [ThreeScene], },
                globals: {components:[Globals]},
                blocks: {
                    components:[BaseBlock,PhysicsBlock],
                    events: {
                        added: { event: 'EntityAdded'},
                        removed: { event: 'EntityRemoved'}
                    }
                },
                floors: {
                    components:[PhysicsFloor],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                },
                cuberooms: {
                    components:[PhysicsCubeRoom],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                },
                balls: {
                    components:[BaseBall,PhysicsBall],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                },
                levels:{
                    components:[LevelInfo],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                }
            }
        }
    }
    execute(delta) {
        // console.log(this.cannonWorld.bodies.length)
        const globals = this.queries.globals[0].getMutableComponent(Globals)
        if(globals.removeFloors) {
            globals.removeFloors = false
            this.queries.floors.slice().forEach(ent => {
                const comp = ent.getMutableComponent(PhysicsFloor)
                const sc = this.queries.three[0].getComponent(ThreeScene)
                sc.stage.remove(comp.obj)
                this.cannonWorld.removeBody(comp.body)
                ent.removeComponent(PhysicsFloor)
            })
        }

        const sc = this.queries.three[0].getMutableComponent(ThreeScene)
        this.events.blocks.added.forEach((ent,i) => {
            const base = ent.getComponent(BaseBlock)
            const phys = ent.getMutableComponent(PhysicsBlock)
            let type = CANNON.Body.DYNAMIC
            if(base.physicsType === Consts.BLOCK_TYPES.WALL) type = CANNON.Body.KINEMATIC
            phys.body = new CANNON.Body({
                mass: 1,//kg
                type: type,
                position: new CANNON.Vec3(base.position.x,base.position.y,base.position.z),
                shape: new CANNON.Box(new CANNON.Vec3(base.width/2,base.height/2,base.depth/2)),
                material: wallMaterial,
            })
            phys.body.quaternion.setFromEuler(base.rotation.x,base.rotation.y,base.rotation.z,'XYZ')

            this.cannonWorld.addBody(phys.body)
            phys.body.addEventListener('collide',(e)=>{
                const globals = this.queries.globals[0].getMutableComponent(Globals)
                if(!globals.collisionsActive) return
                if(Math.abs(e.contact.getImpactVelocityAlongNormal() < 1.0)) return
                if((e.target === phys.body && base.physicsType === Consts.BLOCK_TYPES.CRYSTAL) ||
                    (e.body === phys.body && base.physicsType === Consts.BLOCK_TYPES.CRYSTAL)) {
                    if(Math.abs(e.contact.getImpactVelocityAlongNormal() >= 1.5)) {
                        ent.removeComponent(BaseBlock)
                    }
                }
            })
        })

        if(globals.physicsActive) this.cannonWorld.step(fixedTimeStep, delta, maxSubSteps)

        this.queries.blocks.forEach(ent => {
            const phys = ent.getMutableComponent(PhysicsBlock)
            const base = ent.getMutableComponent(BaseBlock)
            base.position.copy(phys.body.position)
            base.quaternion.copy(phys.body.quaternion)
        })

        this.events.blocks.removed.forEach(ent => {
            const phys = ent.getMutableComponent(PhysicsBlock)
            this.cannonWorld.removeBody(phys.body)
            ent.removeComponent(PhysicsBall)
        })

        this.events.floors.added.forEach(ent => {
            const floor = ent.getMutableComponent(PhysicsFloor)
            const floorObj = new Mesh(
                new PlaneGeometry(100,100,32,32),
                new MeshLambertMaterial({color:Consts.FLOOR_COLOR})
            )
            floorObj.receiveShadow = true
            floorObj.rotation.x = toRad(-90)
            const sc = this.queries.three[0].getComponent(ThreeScene)
            sc.stage.add(floorObj)
            floor.obj = floorObj
            floor.body = new CANNON.Body({
                mass: 0 // mass == 0 makes the body static
            });
            floor.body.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
            floor.body.addShape(new CANNON.Plane());
            this.cannonWorld.addBody(floor.body);
        })

        this.events.cuberooms.added.forEach(ent => {
            const room = ent.getMutableComponent(PhysicsCubeRoom)

            const makeFloor = (axis, angle, pos, color) => {
                const floorBody = new CANNON.Body({ mass:0 })
                floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(axis[0],axis[1],axis[2]),angle);
                floorBody.addShape(new CANNON.Plane())
                floorBody.position.set(pos[0],pos[1],pos[2])
                this.cannonWorld.addBody(floorBody);

                const floorObj = new Mesh(
                    new PlaneGeometry(10,10),
                    new MeshLambertMaterial({color:color, side: DoubleSide})
                )
                floorObj.quaternion.setFromAxisAngle(new Vector3(axis[0],axis[1],axis[2]),angle);
                floorObj.position.set(pos[0],pos[1],pos[2])
                const sc = this.queries.three[0].getComponent(ThreeScene)
                sc.stage.add(floorObj)
                return floorBody
            }

            const size = 5.5
            const floors = []
            floors.push(makeFloor([0,1,0],toRad(90), [-size,0,0], 'teal'))
            floors.push(makeFloor([0,1,0],toRad(-90),[+size,0,0], 'teal'))

            floors.push(makeFloor([1,0,0],toRad(-90), [-0,-size,0], 'teal'))
            floors.push(makeFloor([1,0,0],toRad(90), [+0,+size,0], 'teal'))

            floors.push(makeFloor([1,0,0],toRad(0), [+0,0,-size], 'teal'))
            floors.push(makeFloor([1,0,0],toRad(180), [+0,0,size], 'teal'))

        })

        this.events.balls.added.forEach(ent => {
            const level = this.queries.levels[0].getComponent(LevelInfo)
            globals.timeOfLastShot = performance.now()

            const ball = ent.getMutableComponent(PhysicsBall)
            const base = ent.getComponent(BaseBall)

            const pos = base.position
            const dir = base.velocity


            ball.body = new CANNON.Body({
                mass: level.ballMass,
                shape: new CANNON.Sphere(base.radius),
                position: new CANNON.Vec3(pos.x, pos.y, pos.z),
                velocity: new CANNON.Vec3(dir.x,dir.y,dir.z),
                material: ballMaterial,
            })
            ball.body.addEventListener('collide',(e)=>{
                if(e.body.position.y !== 0) {
                    const parts = this.world.createEntity()
                    parts.addComponent(ParticlesGroup, {position: e.body.position.clone()})
                }
            })
            this.cannonWorld.addBody(ball.body)
        })

        this.queries.balls.forEach(ent => {
            const phys = ent.getMutableComponent(PhysicsBall)
            const base = ent.getMutableComponent(BaseBall)
            base.position.copy(phys.body.position)
            base.quaternion.copy(phys.body.quaternion)
        })

        this.events.balls.removed.forEach(ent => {
            const phys = ent.getMutableComponent(PhysicsBall)
            this.cannonWorld.removeBody(phys.body)
            ent.removeComponent(PhysicsBall)
        })

        this.events.levels.added.forEach(ent => {
            const info = ent.getMutableComponent(LevelInfo)
            this.rebuildWallMaterial(info)
            if(info.hasGravity) {
                this.cannonWorld.gravity.set(0,-9.82,0);
            } else {
                this.cannonWorld.gravity.set(0,0,0)
            }
        })
    }
    rebuildWallMaterial(info) {
        // console.log("rebuilding the wall material",info.wallFriction, info.wallRestitution)
        this.cannonWorld.addContactMaterial(new CANNON.ContactMaterial(wallMaterial,ballMaterial,
            {friction:info.wallFriction, restitution: info.wallRestitution}))
    }
}



