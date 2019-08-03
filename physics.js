import {BoxGeometry, Mesh, MeshLambertMaterial, Vector3, SphereGeometry, MeshPhongMaterial} from "./node_modules/three/build/three.module.js"
import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {Consts} from './common.js'
import {ThreeScene} from './three'

const wallMaterial = new CANNON.Material()

export class PhysicsBall {
    constructor() {
        this.obj = null
        this.body = null
        this.initialVelocity = new Vector3()
        this.initialPosition = new Vector3()
    }
    syncBack() {
        this.obj.position.copy(this.body.position)
        this.obj.quaternion.copy(this.body.quaternion)
    }
}

export class PhysicsFloor {
}

export class BlockSystem extends System {
    init() {
        return {
            queries: {
                blocks: { components:[Block]}
            }
        }
    }
    execute(delta) {
        this.queries.blocks.forEach(ent => {
            const block = ent.getMutableComponent(Block)
            // block.obj.position.copy(block.position)
            // block.obj.rotation.copy(block.rotation)
        })
    }
}

export class Block {
    constructor() {
        this.position = new Vector3(0,0,0)
        this.rotation = new Vector3(0,0,0)
        this.width = 1
        this.height = 2
        this.depth = 1
        this.obj = new Mesh(
            new BoxGeometry(this.width,this.height,this.depth),
            new MeshLambertMaterial({color:'green'})
        )
        this.obj.castShadow = true
        // this.obj.userData.clickable = true
        this.obj.userData.block = this
        this.physicsType = Consts.BLOCK_TYPES.BLOCK
        this.body = null
    }
    copy(src) {
        this.rebuildGeometry()
        // this.rebuildMaterial()
    }

    syncBack() {
        this.obj.position.copy(this.body.position)
        this.obj.quaternion.copy(this.body.quaternion)
    }

    set(name, value) {
        if(name === 'width' || name === 'height' || name === 'depth') {
            this[name] = value
            this.rebuildGeometry()
            return
        }
        if(name === 'position') {
            this.position.copy(value)
            this.obj.position.copy(value)
            if(this.body) this.body.position.copy(value)
            return
        }
        if(name === 'rotation') {
            this.rotation.copy(value)
            this.obj.rotation.setFromVector3(value,'XYZ')
            if(this.body) this.body.quaternion.setFromEuler(this.rotation.x,this.rotation.y,this.rotation.z,'XYZ')
            return
        }
        if(name === 'physicstype') return this.physicsType = value
        throw new Error(`unknown property to set ${name}`)
    }


    rebuildGeometry() {
        this.obj.geometry = new BoxGeometry(this.width,this.height,this.depth)
    }

    rebuildPhysics() {
        this.body = new CANNON.Body({
            mass: 1,//kg
            type: CANNON.Body.DYNAMIC,
            position: new CANNON.Vec3(this.position.x,this.position.y,this.position.z),
            shape: new CANNON.Box(new CANNON.Vec3(this.width/2,this.height/2,this.depth/2)),
            material: wallMaterial,
        })

    }
}

const fixedTimeStep = 1.0 / 60.0; // seconds
const maxSubSteps = 3;

export class PhysicsSystem extends System {
    init() {
        this.cannonWorld = new CANNON.World();
        this.cannonWorld.gravity.set(0, -9.82, 0);

        this.wallMaterial = new CANNON.Material()
        this.ballMaterial = new CANNON.Material()


        return {
            queries: {
                three: { components: [ThreeScene], },
                blocks: {
                    components:[Block],
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
                balls: {
                    components:[PhysicsBall],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                },
            }
        }
    }
    execute(delta) {
        this.events.blocks.added.forEach(ent => {
            const block = ent.getMutableComponent(Block)
            block.rebuildPhysics()
            this.cannonWorld.addBody(block.body)

        })
        this.cannonWorld.step(fixedTimeStep)//, delta, maxSubSteps)

        this.queries.blocks.forEach(ent => {
            ent.getMutableComponent(Block).syncBack()
        })

        this.events.floors.added.forEach(ent => {
            const floor = ent.getMutableComponent(PhysicsFloor)
            floor.body = new CANNON.Body({
                mass: 0 // mass == 0 makes the body static
            });
            floor.body.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
            floor.body.addShape(new CANNON.Plane());
            this.cannonWorld.addBody(floor.body);
            this.makeBall()
        })

        this.events.balls.added.forEach(ent => {
            const ball = ent.getMutableComponent(PhysicsBall)
            ball.obj =new Mesh(
                new SphereGeometry(ball.radius,16,16),
                new MeshPhongMaterial({color: 'orange', flatShading: true})
            )
            // const pos = new Vector3(0,3,2)
            ball.obj.castShadow = true
            ball.obj.position.copy(ball.initialPosition)

            const pos = ball.initialPosition
            const dir = ball.initialVelocity

            const sc = this.queries.three[0].getComponent(ThreeScene)
            sc.scene.add(ball.obj)

            ball.body = new CANNON.Body({
                mass: 5,
                shape: new CANNON.Sphere(ball.radius),
                position: new CANNON.Vec3(pos.x, pos.y, pos.z),
                velocity: new CANNON.Vec3(dir.x,dir.y,dir.z),
                type: CANNON.Body.DYNAMIC,
                material: this.ballMaterial,
            })
            this.cannonWorld.addBody(ball.body)
        })

        this.queries.balls.forEach(ent => {
            ent.getMutableComponent(PhysicsBall).syncBack()
        })
    }
    handleCollision(e) {
        // if(game.blockService.ignore_collisions) return
        //ignore tiny collisions
        if(Math.abs(e.contact.getImpactVelocityAlongNormal() < 1.0)) return

        //when ball hits moving block,
        if(e.body.jtype === Consts.BLOCK_TYPES.BALL) {
            if( e.target.jtype === Consts.BLOCK_TYPES.WALL) {
                const sound = this.world.createEntity()
                sound.addComponent(PlaySound,{name:'click'})
            }
            if (e.target.jtype === Consts.BLOCK_TYPES.BLOCK) {
                //hit a block, just make the thunk sound
                sound.addComponent(PlaySound,{name:'click'})
            }
        }

        //if crystal hits anything and the impact was strong enought
        if(e.body.jtype === Consts.BLOCK_TYPES.CRYSTAL || e.target.jtype === Consts.BLOCK_TYPES.CRYSTAL) {
            if(Math.abs(e.contact.getImpactVelocityAlongNormal() >= 2.0)) {
                return destroyCrystal(e.target)
            }
        }
        // console.log(`collision: body ${e.body.jtype} target ${e.target.jtype}`)
    }

    makeBall() {
    }
}