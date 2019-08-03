import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {ThreeScene} from './three'
import {BoxGeometry,
    Mesh, MeshLambertMaterial,
    SphereGeometry,
    Raycaster,
    Vector2,
    DoubleSide,
    Vector3} from "./node_modules/three/build/three.module.js"


class MouseState {
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
            }
        }
    }
    execute(delta) {
        /*
        on load, add target indicator
        on mouse move
            move target indicator
        on mouse down
            increase tension by moving the ball back
        on mouse release
            fire the ball into the scene
         */

        this.events.three.added.forEach(ent => {
            const three = ent.getMutableComponent(ThreeScene)
            if (!three.scene) return
            ent.addComponent(MouseState)
        })
        this.events.mouse.added.forEach(ent => {
            const three = this.queries.three[0].getMutableComponent(ThreeScene)
            const mouse = ent.getMutableComponent(MouseState)
            mouse.position.set(0,1.5,5)
            three.scene.add(mouse.mouseSphere)

            const inputSphere = new Mesh(
                new SphereGeometry(2),
                new MeshLambertMaterial({color:'blue', side:DoubleSide, transparent:true, opacity:0.0})
            )
            inputSphere.position.set(0,1.5,5)
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
                }
            })

            three.renderer.domElement.addEventListener('mousedown',(e)=>{
                mouse.pressed = true
            })
            three.renderer.domElement.addEventListener('mouseup',(e)=>{
                mouse.pressed = false
            })
        })

        this.queries.mouse.forEach(ent => {
            const mouse = ent.getMutableComponent(MouseState)
            const mat = mouse.mouseSphere.material
            if(mouse.pressed) {
                mat.opacity = Math.max(mat.opacity - 0.01,0.0)
            } else {
                mat.opacity = Math.min(mat.opacity + 0.10,1.0)
            }
        })
    }
}