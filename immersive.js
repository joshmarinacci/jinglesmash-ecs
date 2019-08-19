import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {ThreeBall, ThreeScene, ThreeSlingshot} from './three.js'
import {
    BufferGeometry,
    CylinderGeometry,
    Float32BufferAttribute,
    Line,
    LineBasicMaterial,
    Mesh,
    MeshStandardMaterial,
    NormalBlending,
    Object3D,
    RepeatWrapping,
    TextureLoader,
    Vector3
} from "./node_modules/three/build/three.module.js"
import {WaitForClick} from './mouse.js'
import {BaseBall, BaseSlingshot, Consts, Globals, toRad} from './common.js'
import {LevelInfo} from './levels.js'
import {PhysicsBall} from './physics.js'
import {PlaySoundEffect} from './audio.js'


function printError(err) {
    console.log(err)
}

export const VR_DETECTED = "detected"
export const VR_CONNECTED = "connected"
export const VR_DISCONNECTED = "disconnected"
export const VR_PRESENTCHANGE = "presentchange"
export const VR_ACTIVATED = "activated"


export class VRMode {

}


export class VRManager {
    constructor(renderer) {
        this.device = null
        this.renderer = renderer
        if(!this.renderer) throw new Error("VR Manager requires a valid ThreeJS renderer instance")
        this.listeners = {}

        if ('xr' in navigator) {
            console.log("has webxr")
            navigator.xr.requestDevice().then((device) => {
                device.supportsSession({immersive: true, exclusive: true /* DEPRECATED */})
                    .then(() => {
                        this.device = device
                        this.fire(VR_DETECTED,{})
                    })
                    .catch(printError);

            }).catch(printError);
        } else if ('getVRDisplays' in navigator) {
            console.log("has webvr")

            window.addEventListener( 'vrdisplayconnect', ( event ) => {
                this.device = event.display
                this.fire(VR_CONNECTED)
            }, false );

            window.addEventListener( 'vrdisplaydisconnect', ( event )  => {
                this.fire(VR_DISCONNECTED)
            }, false );

            window.addEventListener( 'vrdisplaypresentchange', ( event ) => {
                console.log("got present change on device. ",this.device.isPresenting)
                this.fire(VR_PRESENTCHANGE,{isPresenting:this.device.isPresenting})
            }, false );

            window.addEventListener( 'vrdisplayactivate',  ( event ) => {
                this.device = event.display
                this.device.requestPresent([{source:this.renderer.domElement}])
                this.fire(VR_ACTIVATED)
            }, false );

            navigator.getVRDisplays()
                .then( ( displays ) => {
                    console.log("vr scanned. found ", displays.length, 'displays')
                    if ( displays.length > 0 ) {

                        // showEnterVR( displays[ 0 ] );
                        console.log("found vr",displays[0])
                        this.device = displays[0]
                        this.fire(VR_DETECTED,{})

                    } else {
                        console.log("no vr at all")
                        // showVRNotFound();
                    }

                } ).catch(printError);

        } else {
            // no vr
            console.log("no vr at all")
        }
    }

    addEventListener(type, cb) {
        if(!this.listeners[type]) this.listeners[type] = []
        this.listeners[type].push(cb)
    }
    fire(type,evt) {
        if(!evt) evt = {}
        evt.type = type
        console.log("Firing",type,JSON.stringify(evt))
        if(!this.listeners[type]) this.listeners[type] = []
        this.listeners[type].forEach(cb => cb(evt))
    }

    enterVR() {
        if(!this.device) {
            console.warn("tried to connect VR on an invalid device")
            return
        }
        console.log("entering VR")
        const prom = this.renderer.vr.setDevice( this.device );
        console.log('promise is',prom)

        if(this.device.isPresenting) {
            this.device.exitPresent()
        } else {
            this.device.requestPresent([{source: this.renderer.domElement}]);
        }
    }

}


export class VRController {
    constructor() {
        this.vrcontroller = null
        this.slingshot = null
    }

}
export class ImmersiveInputSystem extends System {
    init() {
        return {
            queries:{
                three: {
                    components: [ThreeScene],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                },
                controllers: {
                    components: [VRController],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                },
                slingshots: {
                    components: [BaseSlingshot, ThreeSlingshot, VRController],
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
        if(globals.inputMode !== Consts.INPUT_MODES.VR) return

        this.events.controllers.added.forEach(ent => {
            const three = this.queries.three[0].getComponent(ThreeScene)
            const controller = ent.getMutableComponent(VRController)
            controller.vrcontroller = three.renderer.vr.getController(controller.index)
            controller.vrcontroller.addEventListener('selectstart', this.controllerSelectStart.bind(this));
            controller.vrcontroller.addEventListener('selectend', (evt)=>{
                if(this.queries.waits.length>0) {
                    //see if we should block right now
                    this.queries.waits.forEach(ent => {
                        const waiter = ent.getMutableComponent(WaitForClick)
                        if (waiter.callback) waiter.callback()
                        ent.removeComponent(WaitForClick)
                    })
                } else {
                    this.controllerSelectEnd(ent)
                }
            });

            // const level = this.queries.levels[0].getComponent(LevelInfo)
            ent.addComponent(BaseSlingshot, {ballType:Consts.BALL_TYPES.PLAIN})
            ent.addComponent(ThreeSlingshot)
            this.makeImmersiveSlingshot(ent)
            controller.vrcontroller.add(ent.getMutableComponent(ThreeSlingshot).obj)
            three.scene.add(controller.vrcontroller)
        })
    }
    controllerSelectEnd(ent) {
        const globals = this.queries.globals[0].getMutableComponent(Globals)
        if(globals.balls <= 0) return
        globals.balls += -1

        const three = this.queries.three[0].getComponent(ThreeScene)

        const ball = this.world.createEntity()
        const endPoint = new Vector3(0,0,-1)
        const conn = ent.getComponent(VRController)
        conn.vrcontroller.localToWorld(endPoint)
        three.stage.worldToLocal(endPoint)
        const dirPoint = new Vector3(0,0,-1)
        dirPoint.applyQuaternion(conn.vrcontroller.quaternion)
        dirPoint.normalize()
        dirPoint.multiplyScalar(15)

        const level = this.queries.levels[0].getComponent(LevelInfo)
        ball.addComponent(BaseBall, {
            position: endPoint,
            velocity: dirPoint,
            radius: level.ballRadius
        })
        ball.addComponent(ThreeBall)
        ball.addComponent(PhysicsBall)
        globals.click.addComponent(PlaySoundEffect)


    }

    controllerSelectStart(evt) {
    }

    makeLaser() {
        const geometry = new BufferGeometry()
        geometry.addAttribute('position', new Float32BufferAttribute([0, 0, 0, 0, 0, -5], 3));
        geometry.addAttribute('color', new Float32BufferAttribute([1.0, 0.5, 0.5, 0, 0, 0], 3));

        const material = new LineBasicMaterial({
            vertexColors: false,
            color: 0x880000,
            linewidth: 5,
            blending: NormalBlending
        })

        return new Line(geometry, material)
    }


    makeImmersiveSlingshot(ent) {
        const base = ent.getMutableComponent(BaseSlingshot)
        const thr = ent.getMutableComponent(ThreeSlingshot)
        const geo = new CylinderGeometry(0.05,0.05,1.0,16)
        geo.rotateX(toRad(-90))
        geo.translate(0,0,-0.5)

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
        const globals = this.queries.globals[0].getMutableComponent(Globals)
        // thr.ball = generateBallMesh(base.ballType, 0.25, globals)
        // thr.obj.add(thr.ball)
    }
}

