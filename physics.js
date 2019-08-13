import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {BaseBall, BaseBlock, BaseRoom, Consts, Globals} from './common.js'
import {ThreeScene} from './three.js'
import {ParticlesGroup} from './particles.js'
import {LevelInfo} from './levels.js'
import {Vector3} from "./node_modules/three/build/three.module.js"


const wallMaterial = new CANNON.Material()
const ballMaterial = new CANNON.Material()

export class PhysicsBall {}
export class PhysicsFloor {}
export class PhysicsCubeSide {}
export class PhysicsBlock {}

const fixedTimeStep = 1.0 / 60.0; // seconds
const maxSubSteps = 3;

export class PhysicsSystem extends System {
    init() {
        this.ballCollided_handler = this.ballCollided.bind(this)
        this.blockCollide_handler = this.blockCollided.bind(this)
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
                rooms: {
                    components:[BaseRoom],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                },
                floors: {
                    components:[PhysicsFloor],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                },
                cubesides: {
                    components:[PhysicsCubeSide],
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
        const globals = this.queries.globals[0].getMutableComponent(Globals)

        this.events.blocks.added.forEach((ent,i) => this.addBlock(ent,i))
        if(globals.physicsActive) this.cannonWorld.step(fixedTimeStep, delta, maxSubSteps)
        this.queries.blocks.forEach(ent => this.syncBlock(ent))
        this.events.blocks.removed.forEach(ent => this.removeBlock(ent))

        this.events.rooms.added.forEach(ent => {
            const base = ent.getComponent(BaseRoom)
            if(base.type === Consts.ROOM_TYPES.FLOOR) {
                ent.addComponent(PhysicsFloor)
            }
            if(base.type === Consts.ROOM_TYPES.CUBE) {
                const size = 5.5
                this.world.createEntity().addComponent(PhysicsCubeSide, {axis: new Vector3(0,1,0), angle: +90, pos:new Vector3(-size,0,0) })
                this.world.createEntity().addComponent(PhysicsCubeSide, {axis: new Vector3(0,1,0), angle: -90, pos:new Vector3(+size,0,0) })
                this.world.createEntity().addComponent(PhysicsCubeSide, {axis: new Vector3(1,0,0), angle: -90, pos:new Vector3(0,-size,0) })
                this.world.createEntity().addComponent(PhysicsCubeSide, {axis: new Vector3(1,0,0), angle: +90, pos:new Vector3(0,+size,0) })
                this.world.createEntity().addComponent(PhysicsCubeSide, {axis: new Vector3(1,0,0), angle:  -0, pos:new Vector3(0,0,-size) })
                this.world.createEntity().addComponent(PhysicsCubeSide, {axis: new Vector3(1,0,0), angle: 180, pos:new Vector3(0,0,+size) })
            }
        })
        this.events.rooms.removed.forEach(ent =>{
            this.queries.floors.slice().forEach(ent => {
                this.cannonWorld.removeBody(ent.getComponent(PhysicsFloor).body)
                ent.removeComponent(PhysicsFloor)
            })
            this.queries.cubesides.slice().forEach(ent => {
                this.cannonWorld.removeBody(ent.getComponent(PhysicsCubeSide).body)
                ent.removeComponent(PhysicsCubeSide)
            })
        })
        this.events.floors.added.forEach(ent => {
            const floor = ent.getMutableComponent(PhysicsFloor)
            floor.body = new CANNON.Body({
                mass: 0 // mass == 0 makes the body static
            });
            floor.body.user_entity = ent
            floor.body.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
            floor.body.addShape(new CANNON.Plane());
            this.cannonWorld.addBody(floor.body);
        })
        this.events.cubesides.added.forEach(ent => {
            const side = ent.getMutableComponent(PhysicsCubeSide)
            const floorBody = new CANNON.Body({ mass:0 })
            floorBody.user_entity = ent
            floorBody.addShape(new CANNON.Plane())
            floorBody.quaternion.setFromAxisAngle(side.axis,side.angle);
            floorBody.position.copy(side.pos)
            side.body = floorBody
            this.cannonWorld.addBody(floorBody);
        })

        this.events.balls.added.forEach(ent => this.addBall(ent))
        this.queries.balls.forEach(ent => this.syncBall(ent))
        this.events.balls.removed.forEach(ent => this.removeBall(ent))

        this.events.levels.added.forEach(ent => this.addLevel(ent))
    }
    rebuildWallMaterial(info) {
        // console.log("rebuilding the wall material",info.wallFriction, info.wallRestitution)
        this.cannonWorld.addContactMaterial(new CANNON.ContactMaterial(wallMaterial,ballMaterial,
            {friction:info.wallFriction, restitution: info.wallRestitution}))
    }

    addBlock(ent, i) {
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
        phys.body.addEventListener('collide',this.blockCollide_handler)
        phys.body.user_entity = ent

        this.cannonWorld.addBody(phys.body)

    }

    syncBlock(ent) {
        const phys = ent.getMutableComponent(PhysicsBlock)
        const base = ent.getMutableComponent(BaseBlock)
        base.position.copy(phys.body.position)
        base.quaternion.copy(phys.body.quaternion)
    }

    removeBlock(ent) {
        const phys = ent.getMutableComponent(PhysicsBlock)
        phys.body.removeEventListener(this.blockCollide_handler)
        this.cannonWorld.removeBody(phys.body)
        ent.removeComponent(PhysicsBall)
    }

    blockCollided(e){
        const globals = this.queries.globals[0].getMutableComponent(Globals)
        if(!globals.collisionsActive) return
        if(Math.abs(e.contact.getImpactVelocityAlongNormal() < 1.0)) return
        if(Math.abs(e.contact.getImpactVelocityAlongNormal() < 1.5)) return

        // console.log("collided",e.target,e.body)

        const tent = e.target.user_entity
        if(tent.hasComponent(BaseBlock)) {
            const base = tent.getComponent(BaseBlock)
            if(base.physicsType === Consts.BLOCK_TYPES.CRYSTAL) {
                tent.removeComponent(BaseBlock)
            }
            return
        }
        const bent = e.body.user_entity
        if(bent.hasComponent(BaseBlock)) {
            const base = bent.getComponent(BaseBlock)
            if(base.physicsType === Consts.BLOCK_TYPES.CRYSTAL) {
                bent.removeComponent(BaseBlock)
            }
        }
    }


    addBall(ent) {
        const globals = this.queries.globals[0].getMutableComponent(Globals)
        const level = this.queries.levels[0].getComponent(LevelInfo)
        globals.timeOfLastShot = performance.now()

        const phys = ent.getMutableComponent(PhysicsBall)
        const base = ent.getComponent(BaseBall)

        const pos = base.position
        const dir = base.velocity


        phys.body = new CANNON.Body({
            mass: level.ballMass,
            shape: new CANNON.Sphere(base.radius),
            position: new CANNON.Vec3(pos.x, pos.y, pos.z),
            velocity: new CANNON.Vec3(dir.x,dir.y,dir.z),
            material: ballMaterial,
        })
        phys.body.user_entity = ent
        phys.body.addEventListener('collide',this.ballCollided_handler)
        this.cannonWorld.addBody(phys.body)
    }

    syncBall(ent) {
        const phys = ent.getMutableComponent(PhysicsBall)
        const base = ent.getMutableComponent(BaseBall)
        base.position.copy(phys.body.position)
        base.quaternion.copy(phys.body.quaternion)
    }

    removeBall(ent) {
        const phys = ent.getMutableComponent(PhysicsBall)
        phys.body.removeEventListener('collide',this.ballCollided_handler)
        this.cannonWorld.removeBody(phys.body)
        ent.removeComponent(PhysicsBall)
    }

    ballCollided(e) {
        if(e.body.position.y !== 0) {
            const parts = this.world.createEntity()
            parts.addComponent(ParticlesGroup, {position: e.body.position.clone()})
        }
    }
    addLevel(ent) {
        const info = ent.getMutableComponent(LevelInfo)
        this.rebuildWallMaterial(info)
        if(info.hasGravity) {
            this.cannonWorld.gravity.set(0,-9.82,0);
        } else {
            this.cannonWorld.gravity.set(0,0,0)
        }
    }
}



