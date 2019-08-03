import {
    RepeatWrapping,
    Color,
    DirectionalLight,
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
    PCFSoftShadowMap,
    PerspectiveCamera,
    WebGLRenderer,
    DefaultLoadingManager,
    Group,
    ConeGeometry,
    Geometry,
    TextureLoader,
    AmbientLight,
    SphereGeometry,
} from "./node_modules/three/build/three.module.js"
import {World, System} from "./node_modules/ecsy/build/ecsy.module.js"
import {Consts, Globals} from './common'
import {AudioSystem} from './audio'
import {ThreeScene, ThreeSystem, ThreeGroup} from './three'
import {LevelInfo, LevelLoaderSystem} from './levels'
import {BlockSystem, PhysicsSystem} from './physics'
import {
    Clock,

} from "./node_modules/three/build/three.module.js"


const $$ = (sel) => document.querySelectorAll(sel)
const on = (elem, type, cb) => elem.addEventListener(type,cb)
const rand = (min,max) => Math.random()*(max-min) + min

let game
let world

function setupLights() {
    const core = game.getMutableComponent(ThreeScene)
    const renderer = core.renderer

    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = PCFSoftShadowMap

    //set the background color of the scene
    core.scene.background = new Color( 0xcccccc );

    //a standard light
    const light = new DirectionalLight( 0xffffff, 0.5 );
    light.castShadow = true
    light.shadow.mapSize.width = 512
    light.shadow.mapSize.height = 512
    light.shadow.camera.right = 10
    light.shadow.camera.top = 10
    light.position.set( 0, 1, 0.5 ).normalize();
    light.userData.skipRaycast = true
    core.scene.add( light );

    const ambient = new AmbientLight(0xffffff,0.5)
    ambient.userData.skipRaycast = true
    core.scene.add(ambient)
}

function setupBackground() {
    const core = game.getMutableComponent(ThreeScene)
    const sky = world.createEntity()
    // sky.addComponent(SkyBox,'./textures/sky2.jpg')

    /*
    //background image
    if(DEBUG.SKYBOX) {
        const sky = new THREE.Mesh(
            new THREE.SphereGeometry(50),
            new THREE.MeshBasicMaterial({
                color:'white',
                map:game.texture_loader.load('./textures/sky2.jpg'),
                side: THREE.BackSide
            })
        )
        sky.userData.skipRaycast = true
        scene.add(sky)
    }
     */


    const tex = new TextureLoader().load('./textures/candycane.png')
    tex.wrapS = RepeatWrapping
    tex.wrapT = RepeatWrapping
    tex.repeat.set(8,8)

    // const background = new THREE.Group()
    const background = world.createEntity()
    background.addComponent(ThreeGroup)

    const candyCones = new Geometry()
    candyCones.merge(new ConeGeometry(1,10,16,8).translate(-22,5,0))
    candyCones.merge(new ConeGeometry(1,10,16,8).translate(22,5,0))
    candyCones.merge(new ConeGeometry(1,10,16,8).translate(7,5,-30))
    candyCones.merge(new ConeGeometry(1,10,16,8).translate(-13,5,-20))
    const mesh1 = new Mesh(candyCones,new MeshLambertMaterial({ color:'white', map:tex}))
    background.getMutableComponent(ThreeGroup).group.add(mesh1)

    const greenCones = new Geometry()
    greenCones.merge(new ConeGeometry(1,5,16,8).translate(-15,2,-5))
    greenCones.merge(new ConeGeometry(1,5,16,8).translate(-8,2,-28))
    greenCones.merge(new ConeGeometry(1,5,16,8).translate(-8.5,0,-25))
    greenCones.merge(new ConeGeometry(1,5,16,8).translate(15,2,-5))
    greenCones.merge(new ConeGeometry(1,5,16,8).translate(14,0,-3))
    const mesh2 = new Mesh(greenCones,new MeshLambertMaterial({color:'green', map:tex}))
    background.getMutableComponent(ThreeGroup).group.add(mesh2)

    const dome_geo = new Geometry()
    //left
    dome_geo.merge(new SphereGeometry(6).translate(-20,-4,0))
    dome_geo.merge(new SphereGeometry(10).translate(-25,-5,-10))
    //right
    dome_geo.merge(new SphereGeometry(10).translate(30,-5,-10))
    dome_geo.merge(new SphereGeometry(6).translate(27,-3,2))

    //front
    dome_geo.merge(new SphereGeometry(15).translate(0,-6,-40))
    dome_geo.merge(new SphereGeometry(7).translate(-15,-3,-30))
    dome_geo.merge(new SphereGeometry(4).translate(7,-1,-25))

    //back
    dome_geo.merge(new SphereGeometry(15).translate(0,-6,40))
    dome_geo.merge(new SphereGeometry(7).translate(-15,-3,30))
    dome_geo.merge(new SphereGeometry(4).translate(7,-1,25))

    const mesh3 = new Mesh(dome_geo,new MeshLambertMaterial({color:'white'}))
    background.getMutableComponent(ThreeGroup).group.add(mesh3)

    core.scene.add(background.getMutableComponent(ThreeGroup).group)
}

function setupAudio() {
    // game.audioService = new AudioService({enabled:DEBUG.AUDIO})
    // game.audioService.load("click","./sounds/plink.wav")
    world.createEntity().addComponent(SoundEffect,{name:'click', src:'./sounds/plink.wav'})
    // game.audioService.load("crash","./sounds/crash1.wav")
    world.createEntity().addComponent(SoundEffect,{name:'crash', src:'./sounds/crash1.wav'})
    // game.audioService.load("thunk","./sounds/thunk.wav")
    world.createEntity().addComponent(SoundEffect,{name:'thunk', src:'./sounds/thunk.wav'})
    // game.audioService.load("bg","./music/sugarplum.mp3")
    //     .then(()=>{
    //         if(!DEBUG.AUDIO) return
    //         game.bg_music = game.audioService.play("bg")
    //         game.bg_music.loop = true
    //     })
    world.createEntity().addComponent(SoundEffect,{name:'bg', src:'./music/sugarplum.mp3',autoPlay:true,loop:true})
}


function setupGui() {
    let detected = false
    on($("#enter-button"),'click',(e)=> {
        e.preventDefault()
        e.stopPropagation()
        //hide the overlay
        $("#overlay").style.visibility = 'hidden'
        //if vr,
        if(detected) {
            // pointer = new Pointer(scene,renderer,camera, pointer_opts)
            vrmanager.enterVR()
        } else {
            // pointer_opts.mouseSimulatesController = true
            // pointer = new Pointer(scene,renderer,camera, pointer_opts)
        }
        // pointer.controller1.userData.skipRaycast = true
        // initFireball()
        // pointer.waitSceneClick(()=>startLevel())
    })

    on(vrmanager,VR_DETECTED,()=>{
        detected = true
        $("#enter-button").innerText = "enter vr"
    })
    $("#enter-button").disabled = false

}

function setupGame() {
    world = new World();

    world.registerSystem(ThreeSystem)
    world.registerSystem(AudioSystem)
    world.registerSystem(LevelLoaderSystem)
    world.registerSystem(PhysicsSystem)
    world.registerSystem(BlockSystem)

    world.registerComponent(ThreeScene)

    game = world.createEntity()
    game.addComponent(Globals)
    game.addComponent(ThreeScene)

    //execute one tick to properly init everything
    world.execute(0.1,0)

    const clock = new Clock();
    const core = game.getMutableComponent(ThreeScene)
    core.renderer.setAnimationLoop(()=> {
        const delta = clock.getDelta();
        const elapsedTime = clock.elapsedTime;
        world.execute(delta, elapsedTime)
        core.renderer.render(core.scene, core.camera)
    })

    setupLights()
    setupBackground()
    // setupGame()
    // setupAudio()
    // setupGui()

    const level1 = world.createEntity()
    level1.addComponent(LevelInfo, {name:'tumble_level1'})
}

setupGame()

