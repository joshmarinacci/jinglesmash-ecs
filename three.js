import {World, System} from "./node_modules/ecsy/build/ecsy.module.js"
import {Consts, Globals} from './common'

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
                three: {components: [ThreeScene]}
            }
        }
    }

    execute(delta) {
        this.events.three.added.forEach(this.initScene)
    }
    initScene(ent) {
        const s3 = ent.getComponent(ThreeScene)
        //init the scene
        //create DIV for the canvas
        const container = document.createElement( 'div' );
        document.body.appendChild( container );
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 100 );
        renderer = new THREE.WebGLRenderer( { antialias: true } );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.gammaOutput = true
        renderer.vr.enabled = true;
        container.appendChild( renderer.domElement );
        this.vrmanager = new VRManager(renderer)

        // initContent(scene,camera,renderer)

        window.addEventListener( 'resize', ()=>{
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize( window.innerWidth, window.innerHeight );
        }, false );

        THREE.DefaultLoadingManager.onStart = (url, loaded, total) => {
            console.log(`loading ${url}.  loaded ${loaded} of ${total}`)
        }
        THREE.DefaultLoadingManager.onLoad = () => {
            console.log(`loading complete`)
            console.log("really setting it up now")
            $('#loading-indicator').style.display = 'none'
        }
        THREE.DefaultLoadingManager.onProgress = (url, loaded, total) => {
            console.log(`prog ${url}.  loaded ${loaded} of ${total}`)
            $("#progress").setAttribute('value',100*(loaded/total))
        }
        THREE.DefaultLoadingManager.onError = (url) => {
            console.log(`error loading ${url}`)
        }
    }

}
