import {
    BackSide,
    CanvasTexture,
    CylinderGeometry,
    DefaultLoadingManager,
    Geometry,
    Group,
    LatheBufferGeometry,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial,
    MeshPhongMaterial,
    MeshStandardMaterial,
    PerspectiveCamera,
    PlaneGeometry,
    RepeatWrapping,
    Scene,
    SphereGeometry,
    TextureLoader,
    Vector2,
    WebGLRenderer
} from "./node_modules/three/build/three.module.js"
import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {$, BaseBall, Consts, pickOneValue} from './common.js'

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
        this.textures = generateBallTextures()

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
                stats: {
                    components: [VRStats],
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
                },
                balls: {
                    components: [BaseBall, ThreeBall],
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

        this.events.stats.added.forEach(ent => this.setupVRStats(ent.getMutableComponent(VRStats),sc))
        this.queries.stats.forEach(ent => this.redrawVRStats(ent.getMutableComponent(VRStats),sc))

        this.events.balls.added.forEach(ent => this.setupBall(ent))
        this.queries.balls.forEach(ent => this.syncBall(ent))
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


    setupVRStats(stats,sc) {
        stats.canvas = document.createElement('canvas')
        stats.width = 256
        stats.height = 128
        stats.canvas.width = stats.width
        stats.canvas.height = stats.height
        stats.lastDraw = 0
        stats.ctex = new CanvasTexture(stats.canvas)
        stats.obj = new Mesh(
            new PlaneGeometry(1,0.5),
            new MeshBasicMaterial({map:stats.ctex})
        )
        stats.obj.position.z = -2
        stats.obj.position.y = 2
        stats.obj.position.x = -2
        stats.obj.material.depthTest = false
        stats.obj.material.depthWrite = false
        sc.scene.add(stats.obj)
        stats.obj.renderOrder = 1000
        stats.customProps = {}
    }

    redrawVRStats(stats,sc) {
        const time = performance.now()
        if(time - stats.lastDraw > 1000) {
            const fps = ((sc.renderer.info.render.frame - stats.lastFrame)*1000)/(time-stats.lastDraw)
            const c = stats.canvas.getContext('2d')
            c.fillStyle = 'white'
            c.fillRect(0, 0, stats.canvas.width, stats.canvas.height)
            c.fillStyle = 'black'
            c.font = '16pt sans-serif'
            c.fillText(`calls: ${sc.renderer.info.render.calls}`, 3, 20)
            c.fillText(`tris : ${sc.renderer.info.render.triangles}`, 3, 40)
            c.fillText(`fps : ${fps.toFixed(2)}`,3,60)
            Object.keys(stats.customProps).forEach((key,i) => {
                const val = stats.customProps[key]
                c.fillText(`${key} : ${val}`,3,80+i*20)
            })
            stats.obj.material.map.needsUpdate = true
            stats.lastDraw = performance.now()
            stats.lastFrame = sc.renderer.info.render.frame
        }
    }

    setupBall(ent) {
        const base = ent.getComponent(BaseBall)
        const thr = ent.getMutableComponent(ThreeBall)
        thr.tex = pickOneValue(this.textures)
        thr.type = pickOneValue(Consts.BALL_TYPES)
        generateBallMesh(base,thr)
        thr.obj.castShadow = true
        thr.obj.position.copy(base.position)
        const sc = this.queries.three[0].getComponent(ThreeScene)
        sc.stage.add(thr.obj)
    }

    syncBall(ent) {
        const thr = ent.getMutableComponent(ThreeBall)
        const base = ent.getMutableComponent(BaseBall)
        thr.obj.position.copy(base.position)
        thr.obj.quaternion.copy(base.quaternion)
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


export class VRStats {
    constructor() {
    }
}

export class ThreeBall {
    constructor() {
        this.obj = null
        this.tex = null
        this.type = null
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
function generateBallMesh(base,ball) {
    const rad = base.radius

    if(ball.type === Consts.BALL_TYPES.PLAIN) {
        ball.obj = new Mesh(
            new SphereGeometry(rad,6,5),
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
