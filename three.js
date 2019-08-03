import {
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

import {World, System} from "./node_modules/ecsy/build/ecsy.module.js"
import {$, Consts, Globals} from './common.js'



export class ThreeGroup {
    constructor() {
        this.group = new Group()
    }
}
export class ThreeScene {
    constructor() {
        this.scene = null
        this.camera = null
        this.renderer = null
    }
}
export class ThreeSystem extends System {
    init() {
        return {
            queries: {
                three: {
                    components: [ThreeScene],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                }
            }
        }
    }

    execute(delta) {
        this.events.three.added.forEach(this.initScene)
    }
    initScene(ent) {
        console.log("initting the scene")
        const app = ent.getMutableComponent(ThreeScene)
        //init the scene
        //create DIV for the canvas
        const container = document.createElement( 'div' );
        document.body.appendChild( container );
        app.scene = new Scene();
        app.camera = new PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 100 );
        app.camera.position.z = 5
        app.camera.position.y = 1.5
        app.renderer = new WebGLRenderer( { antialias: true } );
        app.renderer.setPixelRatio( window.devicePixelRatio );
        app.renderer.setSize( window.innerWidth, window.innerHeight );
        app.renderer.gammaOutput = true
        // app.renderer.vr.enabled = true;
        container.appendChild( app.renderer.domElement );
        // this.vrmanager = new VRManager(renderer)

        // initContent(scene,camera,renderer)

        window.addEventListener( 'resize', ()=>{
            console.log("rexizing")
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize( window.innerWidth, window.innerHeight );
        }, false );

        DefaultLoadingManager.onStart = (url, loaded, total) => {
            console.log(`loading ${url}.  loaded ${loaded} of ${total}`)
        }
        DefaultLoadingManager.onLoad = () => {
            console.log(`loading complete`)
            console.log("really setting it up now")
            $('#loading-indicator').style.display = 'none'
        }
        DefaultLoadingManager.onProgress = (url, loaded, total) => {
            console.log(`prog ${url}.  loaded ${loaded} of ${total}`)
            $("#progress").setAttribute('value',100*(loaded/total))
        }
        DefaultLoadingManager.onError = (url) => {
            console.log(`error loading ${url}`)
        }
    }

}
