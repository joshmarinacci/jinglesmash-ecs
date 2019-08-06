import {
    BoxGeometry,
    CanvasTexture,
    CylinderGeometry,
    Geometry,
    DoubleSide,
    LatheBufferGeometry,
    Mesh,
    MeshLambertMaterial,
    MeshPhongMaterial,
    MeshStandardMaterial,
    RepeatWrapping,
    SphereGeometry,
    PlaneGeometry,
    Vector2,
    Vector3
} from "./node_modules/three/build/three.module.js"
import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {Consts, pickOneValue} from './common.js'
import {ThreeScene} from './three.js'
import {ParticlesGroup} from './particles.js'
import {Globals} from './common.js'
import {LevelInfo} from './levels.js'
import {Anim} from './animation.js'
import {toRad} from './common'


const wallMaterial = new CANNON.Material()
const ballMaterial = new CANNON.Material()

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
export class PhysicsCubeRoom {

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
        this.obj.userData.block = this
        this.physicsType = Consts.BLOCK_TYPES.BLOCK
        this.body = null
        this.toBeRemoved = false
    }
    copy(src) {
        this.rebuildGeometry()
        // this.rebuildMaterial()
        this.toBeRemoved = false
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
            return
        }
        if(name === 'rotation') {
            this.rotation.copy(value)
            this.obj.rotation.setFromVector3(value)
            return
        }
        if(name === 'physicstype') return this.physicsType = value
        throw new Error(`unknown property to set ${name}`)
    }


    rebuildGeometry() {
        this.obj.geometry = new BoxGeometry(this.width,this.height,this.depth)
    }

    rebuildPhysics() {
        let type = CANNON.Body.DYNAMIC
        if(this.physicsType === Consts.BLOCK_TYPES.WALL) type = CANNON.Body.KINEMATIC
        this.body = new CANNON.Body({
            mass: 1,//kg
            type: type,
            position: new CANNON.Vec3(this.position.x,this.position.y,this.position.z),
            shape: new CANNON.Box(new CANNON.Vec3(this.width/2,this.height/2,this.depth/2)),
            material: wallMaterial,
        })
        this.body.quaternion.setFromEuler(this.rotation.x,this.rotation.y,this.rotation.z,'XYZ')
    }

    rebuildMaterial() {
        let color = 'red'
        if(this.physicsType === Consts.BLOCK_TYPES.CRYSTAL) color = 'aqua'
        if(this.physicsType === Consts.BLOCK_TYPES.WALL) color = 'blue'
        this.obj.material = new MeshLambertMaterial({color:color})
    }
}

const fixedTimeStep = 1.0 / 60.0; // seconds
const maxSubSteps = 3;

export class PhysicsSystem extends System {
    init() {
        this.cannonWorld = new CANNON.World();
        this.cannonWorld.gravity.set(0, -9.82, 0);



        this.materials = generateBlockTextures()
        this.textures = generateBallTextures()

        return {
            queries: {
                three: { components: [ThreeScene], },
                globals: {components:[Globals]},
                blocks: {
                    components:[Block],
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
                    components:[PhysicsBall],
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
        if(globals.removeBalls) {
            globals.removeBalls = false
            this.queries.balls.slice().forEach(ent => {
                const ball = ent.getMutableComponent(PhysicsBall)
                const sc = this.queries.three[0].getComponent(ThreeScene)
                sc.scene.remove(ball.obj)
                this.cannonWorld.removeBody(ball.body)
                ent.removeComponent(PhysicsBall)
            })
        }
        if(globals.removeBlocks) {
            globals.removeBlocks = false
            this.queries.blocks.slice().forEach(ent => {
                const block = ent.getMutableComponent(Block)
                const sc = this.queries.three[0].getComponent(ThreeScene)
                sc.scene.remove(block.obj)
                this.cannonWorld.removeBody(block.body)
                ent.removeComponent(Block)
            })
        }

        const sc = this.queries.three[0].getMutableComponent(ThreeScene)
        this.events.blocks.added.forEach((ent,i) => {
            const block = ent.getMutableComponent(Block)
            block.rebuildPhysics()
            block.obj.material = this.materials[block.physicsType]
            sc.scene.add(block.obj)
            this.cannonWorld.addBody(block.body)
            ent.addComponent(Anim,{prop:'scale',from:0.1,to:1.0,duration:0.3, lerp:'elastic', delay:0.1*i})

            block.body.addEventListener('collide',(e)=>{
                const globals = this.queries.globals[0].getMutableComponent(Globals)
                if(!globals.collisionsActive) return
                if(Math.abs(e.contact.getImpactVelocityAlongNormal() < 1.0)) return
                if((e.target === block.body && block.physicsType === Consts.BLOCK_TYPES.CRYSTAL) ||
                    (e.body === block.body && block.physicsType === Consts.BLOCK_TYPES.CRYSTAL)) {
                    if(Math.abs(e.contact.getImpactVelocityAlongNormal() >= 1.5)) {
                        if(ent.hasComponent(Block)) {
                            ent.getMutableComponent(Block).toBeRemoved = true
                        }
                    }
                }
            })
        })

        if(globals.physicsActive) this.cannonWorld.step(fixedTimeStep, delta, maxSubSteps)

        this.queries.blocks.forEach(ent => {
            const block = ent.getMutableComponent(Block)
            block.syncBack()
            if(block.toBeRemoved) {
                sc.scene.remove(block.obj)
                this.cannonWorld.removeBody(block.body)
                ent.removeComponent(Block)
            }
        })

        //remove events seem useless because the component is already removed so I can't
        //do anything with it.
        // console.log(this.events.blocks.removed.length)
        // this.events.blocks.removed.forEach(ent => {
        //     const block = ent.getMutableComponent(Block)
        // })

        this.events.floors.added.forEach(ent => {
            const floor = ent.getMutableComponent(PhysicsFloor)
            const floorObj = new Mesh(
                new PlaneGeometry(100,100,32,32),
                new MeshLambertMaterial({color:Consts.FLOOR_COLOR})
            )
            floorObj.receiveShadow = true
            floorObj.rotation.x = toRad(-90)
            const sc = this.queries.three[0].getComponent(ThreeScene)
            sc.scene.add(floorObj)
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
                sc.scene.add(floorObj)
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

            const ball = ent.getMutableComponent(PhysicsBall)
            ball.tex = pickOneValue(this.textures)
            ball.type = pickOneValue(Consts.BALL_TYPES)
            ball.radius = level.ballRadius
            generateBallMesh(ball)

            ball.obj.castShadow = true
            ball.obj.position.copy(ball.initialPosition)

            const pos = ball.initialPosition
            const dir = ball.initialVelocity

            const sc = this.queries.three[0].getComponent(ThreeScene)
            sc.scene.add(ball.obj)

            ball.body = new CANNON.Body({
                mass: level.ballMass,
                shape: new CANNON.Sphere(ball.radius),
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
            ent.getMutableComponent(PhysicsBall).syncBack()
        })

        this.events.levels.added.forEach(ent => {
            const info = ent.getMutableComponent(LevelInfo)
            this.rebuildWallMaterial(info)
        })
    }
    rebuildWallMaterial(info) {
        // console.log("rebuilding the wall material",info.wallFriction, info.wallRestitution)
        this.cannonWorld.addContactMaterial(new CANNON.ContactMaterial(wallMaterial,ballMaterial,
            {friction:info.wallFriction, restitution: info.wallRestitution}))
    }
}


function generateBallTextures() {
    const textures = {}
    {
        const canvas = document.createElement('canvas')
        canvas.width = 64
        canvas.height = 16
        const c = canvas.getContext('2d')


        c.fillStyle = 'black'
        c.fillRect(0, 0, canvas.width, canvas.height)
        c.fillStyle = 'red'
        c.fillRect(0, 0, 30, canvas.height)
        c.fillStyle = 'white'
        c.fillRect(30, 0, 4, canvas.height)
        c.fillStyle = 'green'
        c.fillRect(34, 0, 30, canvas.height)

        textures.ornament1 = new CanvasTexture(canvas)
        textures.ornament1.wrapS = RepeatWrapping
        textures.ornament1.repeat.set(8, 1)
    }


    {
        const canvas = document.createElement('canvas')
        canvas.width = 128
        canvas.height = 128
        const c = canvas.getContext('2d')
        c.fillStyle = 'black'
        c.fillRect(0,0,canvas.width, canvas.height)

        c.fillStyle = 'red'
        c.fillRect(0, 0, canvas.width, canvas.height/2)
        c.fillStyle = 'white'
        c.fillRect(0, canvas.height/2, canvas.width, canvas.height/2)

        const tex = new CanvasTexture(canvas)
        tex.wrapS = RepeatWrapping
        tex.wrapT = RepeatWrapping
        tex.repeat.set(6,6)
        textures.ornament2 = tex
    }

    return textures

}

function generateBallMesh(ball) {
    const rad = ball.radius
    if(ball.type === Consts.BALL_TYPES.PLAIN) {
        ball.obj = new Mesh(
            new SphereGeometry(ball.radius,6,5),
            new MeshPhongMaterial({color: Consts.BLOCK_COLORS.BALL, flatShading: true})
        )
        return
    }

    if(ball.type === Consts.BALL_TYPES.ORNAMENT1) {
        let points = [];
        for (let i = 0; i <= 16; i++) {
            points.push(new Vector2(Math.sin(i * 0.195) * rad, i * rad / 7));
        }
        var geometry = new LatheBufferGeometry(points);
        geometry.center()
        ball.obj = new Mesh(geometry, new MeshStandardMaterial({
            color: 'white',
            metalness: 0.3,
            roughness: 0.3,
            map: ball.tex
        }))
        return
    }

    if(ball.type === Consts.BALL_TYPES.ORNAMENT2) {
        const geo = new Geometry()
        geo.merge(new SphereGeometry(rad,32))
        const stem = new CylinderGeometry(rad/4,rad/4,0.5,8)
        stem.translate(0,rad/4,0)
        geo.merge(stem)
        ball.obj = new Mesh(geo, new MeshStandardMaterial({
            color: 'white',
            metalness: 0.3,
            roughness: 0.3,
            map: ball.tex,
        }))
        return
    }

    throw new Error("unknown ball type",ball.type)
}
function generateBlockTextures() {
    const materials = {}
    const textures = {}
    {
        const canvas = document.createElement('canvas')
        canvas.width = 128
        canvas.height = 128
        const c = canvas.getContext('2d')

        //white background
        c.fillStyle = 'white'
        c.fillRect(0,0,canvas.width, canvas.height)


        //lower left for the sides
        c.save()
        c.translate(0,canvas.height/2)
        c.fillStyle = 'red'
        c.fillRect(canvas.width/8*1.5, 0, canvas.width/8, canvas.height/2)
        c.restore()

        //upper left for the bottom and top
        c.save()
        c.translate(0,0)
        c.fillStyle = 'red'
        c.fillRect(canvas.width/8*1.5, 0, canvas.width/8, canvas.height/2)
        c.fillStyle = 'red'
        c.fillRect(0,canvas.height/8*1.5, canvas.width/2, canvas.height/8)
        c.restore()

        c.fillStyle = 'black'
        // c.fillRect(0,canvas.height/2,canvas.width,1)
        // c.fillRect(canvas.width/2,0,1,canvas.height)

        const tex = new CanvasTexture(canvas)
        textures.present1 = tex

        materials[Consts.BLOCK_TYPES.BLOCK] = new MeshStandardMaterial({
            color: 'white',
            metalness: 0.0,
            roughness: 1.0,
            // wireframe: true,
            map:textures.present1,
        })
    }

    {
        const canvas = document.createElement('canvas')
        canvas.width = 128
        canvas.height = 128
        const c = canvas.getContext('2d')

        //white background
        c.fillStyle = 'white'
        c.fillRect(0,0,canvas.width, canvas.height)
        for(let x=0; x<canvas.width; x++) {
            for(let y =0; y<canvas.height; y++) {
                let p = Math.random()*255
                p = Math.max(p,200)
                // if(p < 128) p = 128
                c.fillStyle = `rgb(${0.5},${p},${p})`
                c.fillRect(x,y,1,1)
            }
        }

        const tex = new CanvasTexture(canvas)
        materials[Consts.BLOCK_TYPES.WALL] = new MeshLambertMaterial({
            color:'white',
            map:tex
        })
    }

    {
        const canvas = document.createElement('canvas')
        canvas.width = 128
        canvas.height = 128
        const c = canvas.getContext('2d')

        //white background
        c.fillStyle = '#55aaff'
        c.fillRect(0,0,canvas.width, canvas.height)
        c.fillStyle = 'white'
        const w = 128
        const h = 128
        c.fillRect(0,0,3,h)
        c.fillRect(w-4,0,3,h)
        c.fillRect(0,0,w,3)
        c.fillRect(0,h-3,w,3)
        c.fillRect(w/2-1,0,3,h)
        c.fillRect(0, h/2-1,w,3)

        const tex = new CanvasTexture(canvas)
        materials[Consts.BLOCK_TYPES.CRYSTAL] = new MeshStandardMaterial({
            color: 'white',
            metalness: 0.0,
            roughness: 1.0,
            // wireframe: true,
            map:tex,
        })
    }


    // this.materials[BLOCK_TYPES.CRYSTAL] = new MeshLambertMaterial({color:'aqua'})
    materials[Consts.BLOCK_TYPES.FLOOR] = new MeshLambertMaterial({color:'gray'})
    // this.materials[BLOCK_TYPES.WALL] = new MeshLambertMaterial({color:'red'})
    return materials
}
