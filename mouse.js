import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {ThreeBall, ThreeScene} from './three.js'
import {
    CylinderGeometry,
    DoubleSide,
    Mesh,
    MeshLambertMaterial,
    MeshStandardMaterial,
    Object3D,
    Raycaster,
    RepeatWrapping,
    SphereGeometry,
    TextureLoader,
    Vector2,
    Vector3
} from "./node_modules/three/build/three.module.js"
import {BaseBall, BaseSlingshot, Consts, Globals, toRad} from './common.js'
import {PlaySoundEffect} from './audio.js'
import {PhysicsBall} from './physics.js'
import {LevelInfo} from './levels.js'
import {generateBallMesh} from './gfxutils.js'


export class MouseState {
    constructor() {
        this.position = new Vector3()
        this.mouseSphere = new Mesh(
            new SphereGeometry(0.1),
            new MeshLambertMaterial({color:'red', transparent:true, opacity:1.0})
        )
        this.raycaster = new Raycaster()
        this.pressed = false
    }
}

export class MouseSlingshot {

}

export class MouseInputSystem extends System {
    init() {
        return {
            queries: {
                three: {
                    components: [ThreeScene],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                },
                mouse: {
                    components: [MouseState],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                },
                slingshots: {
                    components: [BaseSlingshot, MouseSlingshot],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                },
                waits: {
                    components: [WaitForClick]
                },
                globals: {
                    components: [Globals]
                },
                levels:{
                    components:[LevelInfo],
                    events: {
                        added: {event: 'EntityAdded'},
                        removed: {event: 'EntityRemoved'}
                    }
                }
            }
        }
    }
    execute(delta) {
        if(this.queries.globals.length < 1) return
        const globals = this.queries.globals[0].getComponent(Globals)
        if(globals.inputMode !== Consts.INPUT_MODES.MOUSE) return
        //hook up the mouse events
        this.events.mouse.added.forEach(ent => {
            const three = this.queries.three[0].getMutableComponent(ThreeScene)
            const mouse = ent.getMutableComponent(MouseState)
            mouse.position.set(0,1.5,5)
            three.scene.add(mouse.mouseSphere)

            const inputSphere = new Mesh(
                new SphereGeometry(2),
                new MeshLambertMaterial({color:'blue', side:DoubleSide, transparent:true, opacity:0.0})
            )
            inputSphere.position.copy(three.camera.position)
            three.scene.add(inputSphere)

            three.renderer.domElement.addEventListener('mousemove',(e)=>{
                const mouseInput = new Vector2()
                const bounds = three.renderer.domElement.getBoundingClientRect()
                mouseInput.x = ((e.clientX - bounds.left) / bounds.width) * 2 - 1
                mouseInput.y = -((e.clientY - bounds.top) / bounds.height) * 2 + 1
                mouse.raycaster.setFromCamera(mouseInput, three.camera)
                const intersects = mouse.raycaster.intersectObjects([inputSphere], false)
                if(intersects.length >= 1) {
                    const first = intersects[0]
                    mouse.mouseSphere.position.copy(first.point)
                    this.queries.slingshots.forEach(ent => {
                        const base = ent.getMutableComponent(BaseSlingshot)
                        base.target.copy(first.point)
                    })
                }
            })

            three.renderer.domElement.addEventListener('mousedown',(e)=>{
                mouse.pressed = true
                this.queries.slingshots.forEach(ent => {
                    const slingshot = ent.getMutableComponent(BaseSlingshot)
                    slingshot.pressed = true
                })
            })
            three.renderer.domElement.addEventListener('mouseup',(e)=>{
                this.queries.slingshots.forEach(ent => {
                    const slingshot = ent.getMutableComponent(BaseSlingshot)
                    slingshot.pressed = false
                })
                mouse.pressed = false
                if(this.queries.waits.length>0) {
                    //see if we should block right now
                    this.queries.waits.forEach(ent => {
                        const waiter = ent.getMutableComponent(WaitForClick)
                        if (waiter.callback) waiter.callback()
                        ent.removeComponent(WaitForClick)
                    })
                } else {
                    const pos = mouse.mouseSphere.getWorldPosition()
                    three.stage.worldToLocal(pos)

                    const slingshot = this.queries.slingshots[0].getComponent(MouseSlingshot)
                    const delta = new Vector3()
                    delta.copy(mouse.mouseSphere.getWorldPosition())
                    delta.sub(slingshot.obj.getWorldPosition())
                    delta.normalize()
                    delta.multiplyScalar(10)
                    this.fireBall(pos,delta)
                }
            })

            const slingshot = this.world.createEntity()
            slingshot.addComponent(BaseSlingshot, {ballType:Consts.BALL_TYPES.ORNAMENT1})
            slingshot.addComponent(MouseSlingshot)
            this.setupMouseSlingshot(slingshot)

        })

        //update the mouse indicator
        this.queries.mouse.forEach(ent => {
            const mouse = ent.getMutableComponent(MouseState)
            if(globals.immersive === true) {
                mouse.mouseSphere.visible = false
            }

            const mat = mouse.mouseSphere.material
            if(mouse.pressed) {
                mat.opacity = Math.max(mat.opacity - 0.01,0.0)
            } else {
                mat.opacity = Math.min(mat.opacity + 0.10,1.0)
            }
        })

        this.queries.slingshots.forEach(ent => {
            const thr = ent.getMutableComponent(MouseSlingshot)
            const base = ent.getMutableComponent(BaseSlingshot)
            thr.obj.lookAt(base.target)
        })
    }

    fireBall(pos,delta) {
        const globals = this.queries.globals[0].getMutableComponent(Globals)
        if(globals.balls <= 0) return
        globals.balls += -1

        const level = this.queries.levels[0].getComponent(LevelInfo)

        const ball = this.world.createEntity()
        ball.addComponent(BaseBall, {
            position: pos,
            velocity: delta,
            radius:level.ballRadius,
            type:level.ballType,
        })
        ball.addComponent(ThreeBall)
        ball.addComponent(PhysicsBall)
        globals.click.addComponent(PlaySoundEffect)
    }

    getStage() {
        return this.queries.three[0].getComponent(ThreeScene).stage
    }

    setupMouseSlingshot(ent) {
        const globals = this.queries.globals[0].getComponent(Globals)
        const base = ent.getMutableComponent(BaseSlingshot)
        const thr = ent.getMutableComponent(MouseSlingshot)
        const geo = new CylinderGeometry(0.05,0.05,1.0,16)
        geo.rotateX(toRad(-90))
        geo.translate(0,0,0.5)

        const tex = new TextureLoader().load('./textures/candycane.png')
        tex.wrapS = RepeatWrapping
        tex.wrapT = RepeatWrapping
        tex.repeat.set(1,10)

        const cylinder = new Mesh(geo,new MeshStandardMaterial({
            color:'white',
            metalness:0.3,
            roughness:0.3,
            map:tex}))

        thr.obj = new Object3D()
        thr.obj.add(cylinder)
        thr.ball = generateBallMesh(base.ballType, 0.25, globals)
        thr.obj.add(thr.ball)
        thr.obj.position.z = 4
        thr.obj.position.y = 1.5
        this.getStage().add(thr.obj)
    }
}

export class WaitForClick {
    constructor() {
        this.callback = null //function to be called when the click happens
    }
}