import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {ThreeScene} from './three.js'
import {
    BoxGeometry,
    BufferGeometry,
    Float32BufferAttribute,
    Line,
    LineBasicMaterial,
    Mesh,
    MeshLambertMaterial,
    NormalBlending
} from "./node_modules/three/build/three.module.js"
import {WaitForClick} from './mouse.js'


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


export class VRController {}
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
                waits: {
                    components: [WaitForClick]
                },
            }
        }
    }

    execute(delta) {
        this.events.three.added.forEach(ent => {
            console.log("connected to THREE")
            const three = ent.getMutableComponent(ThreeScene)
            console.log('three has controllers',three.renderer.vr)
            this.world.createEntity().addComponent(VRController,{index:0})
            this.world.createEntity().addComponent(VRController,{index:1})
        })

        this.events.controllers.added.forEach(ent => {
            console.log('setting up a controller')
            const three = this.queries.three[0].getComponent(ThreeScene)
            const controller = ent.getMutableComponent(VRController)
            controller.vrcontroller = three.renderer.vr.getController(controller.index)
            controller.vrcontroller.addEventListener('selectstart', this.controllerSelectStart.bind(this));
            controller.vrcontroller.addEventListener('selectend', this.controllerSelectEnd.bind(this));
            controller.vrcontroller.add(this.makeLaser())

            controller.vrcontroller.add(new Mesh(
                new BoxGeometry(0.5,0.5,0.5),
                new MeshLambertMaterial({color:'green'})
                ))
        })
/*
        this.queries.controllers.forEach(ent => {
            const c = ent.getMutableComponent(VRController)
            if(!c.vrcontroller.visible) {
                console.log("hidden")
                return
            }
            if(!controller.visible) return
            const dir = new THREE.Vector3(0, 0, -1)
            dir.applyQuaternion(c.quaternion)
            this.raycaster.set(c.position, dir)
            this._processMove()

        })*/

    }
    controllerSelectEnd(evt) {
        console.log("selected")
        if(this.queries.waits.length>0) {
            //see if we should block right now
            this.queries.waits.forEach(ent => {
                const waiter = ent.getMutableComponent(WaitForClick)
                if (waiter.callback) waiter.callback()
                ent.removeComponent(WaitForClick)
            })
        }
    }

    controllerSelectStart(evt) {
        console.log('unselected')
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
}
