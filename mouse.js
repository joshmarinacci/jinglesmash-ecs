import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {ThreeBall, ThreeScene, ThreeSlingshot} from './three.js'
import {
    DoubleSide,
    Mesh,
    MeshLambertMaterial,
    Raycaster,
    SphereGeometry,
    Vector2,
    Vector3
} from "./node_modules/three/build/three.module.js"
import {BaseBall, BaseSlingshot, Globals} from './common.js'
import {PlaySoundEffect} from './audio.js'
import {PhysicsBall} from './physics.js'
import {LevelInfo} from './levels.js'


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
                    components: [BaseSlingshot, ThreeSlingshot],
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

                    const slingshot = this.queries.slingshots[0].getComponent(ThreeSlingshot)
                    const delta = new Vector3()
                    delta.copy(mouse.mouseSphere.getWorldPosition())
                    delta.sub(slingshot.obj.getWorldPosition())
                    delta.normalize()
                    delta.multiplyScalar(10)
                    this.fireBall(pos,delta)
                }
            })
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

        this.events.levels.added.forEach(ent => {
            const level = ent.getComponent(LevelInfo)
            const slingshot = this.world.createEntity()
            slingshot.addComponent(BaseSlingshot, {ballType:level.ballType})
        })
        this.queries.slingshots.forEach(ent => {
            const thr = ent.getMutableComponent(ThreeSlingshot)
            const base = ent.getMutableComponent(BaseSlingshot)
            thr.obj.lookAt(base.target)
        })
        this.events.levels.removed.forEach(ent => {
            ent.removeComponent(BaseSlingshot)
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
}

export class WaitForClick {
    constructor() {
        this.callback = null //function to be called when the click happens
    }
}