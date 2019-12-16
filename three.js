import {
    BackSide,
    BoxGeometry,
    CanvasTexture,
    CylinderGeometry,
    DefaultLoadingManager,
    DoubleSide,
    Group,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial,
    MeshStandardMaterial,
    Object3D,
    PerspectiveCamera,
    PlaneGeometry,
    RepeatWrapping,
    Scene,
    SphereGeometry,
    TextureLoader,
    Vector3,
    WebGLRenderer
} from "./node_modules/three/build/three.module.js"
import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {$, BaseBall, BaseBlock, BaseRoom, BaseSlingshot, Consts, Globals, MouseSlingshot, toRad} from './common.js'
import {Anim} from './animation.js'
import {generateBallMesh} from './gfxutils.js'

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
        this.materials = generateBlockTextures()
    }

    getStage() {
        return this.queries.three.results[0].getComponent(ThreeScene).stage
    }
    getCamera() {
        return this.queries.three.results[0].getComponent(ThreeScene).camera
    }
    execute(delta) {
        this.queries.three.added.forEach(this.initScene)

        const sc = this.queries.three.results[0].getMutableComponent(ThreeScene)
        this.queries.skyboxes.added.forEach(ent => {
            sc.scene.add(ent.getComponent(SkyBox).obj)
        })

        this.queries.transitions.added.forEach(ent => {
            const sp = ent.getMutableComponent(TransitionSphere)
            this.setupTransitionSphere(sp, sc)
        })

        this.queries.texts.added.forEach(ent => {
            const st = ent.getMutableComponent(SimpleText)
            sc.scene.add(st.obj)
        })


        this.queries.stats.added.forEach(ent => this.setupVRStats(ent.getMutableComponent(VRStats), sc))
        this.queries.stats.results.forEach(ent => this.redrawVRStats(ent.getMutableComponent(VRStats), sc))

        this.queries.balls.added.forEach(ent => this.setupBall(ent))
        this.queries.balls.results.forEach(ent => this.syncBall(ent))
        this.queries.balls.removed.forEach(ent => this.removeBall(ent))

        this.queries.blocks.added.forEach((ent, i) => {
            this.setupBlock(ent)
            //bounce it in
            ent.getComponent(ThreeBlock).obj.scale.set(0.01, 0.01, 0.01)
            ent.addComponent(Anim, {
                prop: 'scale',
                from: 0.01,
                to: 1.0,
                duration: 0.6,
                lerp: 'elastic',
                delay: 0.05 * i
            })
        })
        this.queries.blocks.results.forEach(ent => this.syncBlock(ent))
        this.queries.blocks.removed.forEach(ent => this.removeBlock(ent))

        this.queries.rooms.added.forEach(ent => this.setupRoom(ent))
        this.queries.floors.added.forEach(ent => this.setupFloor(ent))
        this.queries.sides.added.forEach(ent => this.setupCubeSide(ent))


        this.queries.rooms.removed.forEach(ent => {
            this.queries.floors.results.slice().forEach(ent => {
                this.removeFloor(ent)
            })
            this.queries.sides.results.slice().forEach(ent => {
                this.removeCubeSide(ent)
            })
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
        const globals = this.queries.globals.results[0].getMutableComponent(Globals)
        thr.tex = globals.textures[base.type]
        thr.type = base.type
        thr.obj = generateBallMesh(base.type,base.radius,globals)
        thr.obj.castShadow = true
        thr.obj.position.copy(base.position)
        this.getStage().add(thr.obj)
    }

    syncBall(ent) {
        const thr = ent.getMutableComponent(ThreeBall)
        const base = ent.getMutableComponent(BaseBall)
        thr.obj.position.copy(base.position)
        thr.obj.quaternion.copy(base.quaternion)
    }

    removeBall(ent) {
        const thr = ent.getMutableComponent(ThreeBall)
        const sc = this.queries.three.results[0].getComponent(ThreeScene)
        this.getStage().remove(thr.obj)
        ent.removeComponent(ThreeBall)
    }

    setupBlock(ent) {
        const base = ent.getComponent(BaseBlock)
        const thr = ent.getMutableComponent(ThreeBlock)
        const mat = this.materials[base.physicsType]
        thr.obj = new Mesh(
            new BoxGeometry(base.width,base.height,base.depth),
            mat
        )
        thr.obj.castShadow = true
        thr.obj.position.copy(base.position)
        thr.obj.rotation.copy(base.rotation)
        base.quaternion.copy(thr.obj.quaternion)
        this.getStage().add(thr.obj)
    }

    syncBlock(ent) {
        const thr = ent.getMutableComponent(ThreeBlock)
        const base = ent.getMutableComponent(BaseBlock)
        thr.obj.position.copy(base.position)
        thr.obj.quaternion.copy(base.quaternion)
    }

    removeBlock(ent) {
        const thr = ent.getMutableComponent(ThreeBlock)
        this.getStage().remove(thr.obj)
        ent.removeComponent(ThreeBlock)
    }

    setupRoom(ent) {
        const base = ent.getComponent(BaseRoom)
        if(base.type === Consts.ROOM_TYPES.FLOOR) {
            ent.addComponent(ThreeFloor)
        }

        if(base.type === Consts.ROOM_TYPES.CUBE) {
            const size = 5.5
            this.world.createEntity().addComponent(ThreeCubeSide, {axis: new Vector3(0,1,0), angle: toRad(+90), pos:new Vector3(-size,0,0) })
            this.world.createEntity().addComponent(ThreeCubeSide, {axis: new Vector3(0,1,0), angle: toRad(-90), pos:new Vector3(+size,0,0) })
            this.world.createEntity().addComponent(ThreeCubeSide, {axis: new Vector3(1,0,0), angle: toRad(-90), pos:new Vector3(0,-size,0) })
            this.world.createEntity().addComponent(ThreeCubeSide, {axis: new Vector3(1,0,0), angle: toRad(+90), pos:new Vector3(0,+size,0) })
            this.world.createEntity().addComponent(ThreeCubeSide, {axis: new Vector3(1,0,0), angle:  toRad(-0), pos:new Vector3(0,0,-size) })
            this.world.createEntity().addComponent(ThreeCubeSide, {axis: new Vector3(1,0,0), angle: toRad(180), pos:new Vector3(0,0,+size) })
        }
    }

    setupFloor(ent) {
        const thr = ent.getMutableComponent(ThreeFloor)
        thr.obj = new Mesh(
            new PlaneGeometry(100,100,32,32),
            new MeshLambertMaterial({color:Consts.FLOOR_COLOR})
        )
        thr.obj.rotation.x = toRad(-90)
        thr.obj.receiveShadow = true
        this.getStage().add(thr.obj)
    }

    setupCubeSide(ent) {
        console.log("adding a three cube side")
        const thr = ent.getMutableComponent(ThreeCubeSide)
        const floorObj = new Mesh(
            new PlaneGeometry(10,10),
            new MeshLambertMaterial({color:Consts.CUBE_SIDE_COLOR, side: DoubleSide})
        )
        thr.obj = floorObj
        thr.obj.quaternion.setFromAxisAngle(thr.axis,thr.angle);
        thr.obj.position.copy(thr.pos)
        thr.obj.receiveShadow = true
        this.getStage().add(thr.obj)
    }

    removeFloor(ent) {
        const thr = ent.getMutableComponent(ThreeFloor)
        this.getStage().remove(thr.obj)
        ent.removeComponent(ThreeFloor)
    }

    removeCubeSide(ent) {
        const thr = ent.getMutableComponent(ThreeCubeSide)
        const sc = this.queries.three.results[0].getComponent(ThreeScene)
        this.getStage().remove(thr.obj)
        ent.removeComponent(ThreeCubeSide)
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

export class ThreeBlock {
    constructor() {
        this.obj = null
        this.tex = null
        this.type = null
    }
}
export class ThreeFloor {}
export class ThreeCubeSide {}
export class ThreeSlingshot {
    constructor() {
        this.obj = null
    }
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


ThreeSystem.queries = {
    globals: {
        components: [Globals]
    },
    three: {
        components: [ThreeScene],
        listen: {
            added: true,
            removed: true,
        }
    },
    skyboxes: {
        components: [SkyBox],
        listen: {
            added: true,
            removed: true
        }
    },
    transitions: {
        components: [TransitionSphere],
        listen: {
            added: true,
            removed: true
        }
    },
    stats: {
        components: [VRStats],
        listen: {
            added: true,
            removed: true
        }
    },
    texts: {
        components: [SimpleText],
        listen: {
            added: true,
            removed: true
        }
    },
    balls: {
        components: [BaseBall, ThreeBall],
        listen: {
            added: true,
            removed: true
        }
    },
    blocks: {
        components: [BaseBlock, ThreeBlock],
        listen: {
            added: true,
            removed: true
        }
    },
    slingshots: {
        components: [BaseSlingshot, ThreeSlingshot],
        listen: {
            added: true,
            removed: true
        }
    },
    mouseslingshots: {
        components: [BaseSlingshot, MouseSlingshot],
        listen: {
            added: true,
            removed: true
        }
    },
    rooms: {
        components: [BaseRoom],
        listen: {
            added: true,
            removed: true
        }
    },
    floors: {
        components: [ThreeFloor],
        listen: {
            added: true,
            removed: true
        }
    },
    sides: {
        components: [ThreeCubeSide],
        listen: {
            added: true,
            removed: true
        }
    }
}

