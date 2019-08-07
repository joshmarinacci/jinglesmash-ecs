import {
    BackSide,
    CanvasTexture,
    DefaultLoadingManager,
    Group,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial,
    PerspectiveCamera,
    PlaneGeometry,
    Scene,
    SphereGeometry,
    TextureLoader,
    WebGLRenderer
} from "./node_modules/three/build/three.module.js"
import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {$} from './common.js'

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
        this.stage = null
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
                },
                skyboxes: {
                    components: [SkyBox],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                },
                transitions: {
                    components: [TransitionSphere],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                },
                texts: {
                    components: [SimpleText],
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

        const sc = this.queries.three[0].getMutableComponent(ThreeScene)
        this.events.skyboxes.added.forEach(ent => {
            sc.scene.add(ent.getComponent(SkyBox).obj)
        })

        this.events.transitions.added.forEach(ent => {
            const sp = ent.getMutableComponent(TransitionSphere)
            this.setupTransitionSphere(sp,sc)
        })

        this.events.texts.added.forEach(ent => {
            const st = ent.getMutableComponent(SimpleText)
            sc.scene.add(st.obj)
        })
    }

    initScene(ent) {
        const app = ent.getMutableComponent(ThreeScene)
        //init the scene
        //create DIV for the canvas
        const container = document.createElement( 'div' );
        document.body.appendChild( container );
        app.scene = new Scene();
        app.camera = new PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 100 );
        app.renderer = new WebGLRenderer( { antialias: true } );
        app.renderer.setPixelRatio( window.devicePixelRatio );
        app.renderer.setSize( window.innerWidth, window.innerHeight );
        app.renderer.gammaOutput = true
        app.renderer.vr.enabled = true;
        container.appendChild( app.renderer.domElement );

        window.addEventListener( 'resize', ()=>{
            app.camera.aspect = window.innerWidth / window.innerHeight;
            app.camera.updateProjectionMatrix();
            app.renderer.setSize( window.innerWidth, window.innerHeight );
        }, false );

        DefaultLoadingManager.onStart = (url, loaded, total) => {
            console.log(`loading ${url}.  loaded ${loaded} of ${total}`)
        }
        DefaultLoadingManager.onLoad = () => {
            // console.log(`loading complete`)
            // console.log("really setting it up now")
            $('#loading-indicator').style.display = 'none'
        }
        DefaultLoadingManager.onProgress = (url, loaded, total) => {
            console.log(`prog ${url}.  loaded ${loaded} of ${total}`)
            $("#progress").setAttribute('value',100*(loaded/total))
        }
        DefaultLoadingManager.onError = (url) => {
            console.log(`error loading ${url}`)
        }

        app.stage = new Group()
        app.scene.add(app.stage)
        app.stage.position.z = -5
    }

    setupTransitionSphere(sp, sc) {
        sp.obj = new Mesh(
            new SphereGeometry(4),
            new MeshLambertMaterial({color:'red', side: BackSide, transparent:true, opacity:1.0})
        )
        sc.scene.add(sp.obj)
    }
}

export class SkyBox {
    copy(src) {
        if(!src.src) return
        this.obj = new Mesh(
            new SphereGeometry(50),
            new MeshBasicMaterial({
                color:'white',
                map:new TextureLoader().load(src.src),
                side: BackSide
            })
        )
    }
}

export class TransitionSphere {

}

export class SimpleText {
    constructor() {

    }
    copy({
             width = 1,
             height = 1,
             density = 128,
             color = 'black',
             backgroundColor = 'gray',
             text = "foo",
             fontHeight
         }) {
        this.density = density
        this.htmlCanvas = document.createElement('canvas')
        this.htmlCanvas.width = this.density*width
        this.htmlCanvas.height = this.density*height
        this.canvas_texture = new CanvasTexture(this.htmlCanvas)
        this.obj = new Mesh(
            new PlaneGeometry(width,height),
            new MeshLambertMaterial({map:this.canvas_texture})
        )
        this.fontHeight = this.density/3.5
        if(fontHeight) this.fontHeight = fontHeight
        this.color = color
        this.backgroundColor = backgroundColor
        this.text = text
        this.font = `${this.fontHeight}px sans-serif`
        this.setText(this.text)
    }

    setText(str) {
        const ctx = this.htmlCanvas.getContext('2d')
        ctx.fillStyle = this.backgroundColor
        ctx.fillRect(0,0,this.htmlCanvas.width, this.htmlCanvas.height)
        ctx.font = this.font
        ctx.fillStyle = this.color
        const lines = str.split("\n")
        const top = (this.fontHeight*lines.length)/2+this.htmlCanvas.height/2 - lines.length*this.fontHeight/2
        lines.forEach((line,i) => {
            const metrics = ctx.measureText(line)
            ctx.fillText(line,
                this.htmlCanvas.width/2-metrics.width/2,
                top+i*this.fontHeight
            )
            this.canvas_texture.needsUpdate = true
        })
    }

}