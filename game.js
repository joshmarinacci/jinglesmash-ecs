import {
    AmbientLight,
    Clock,
    Color,
    ConeGeometry,
    DirectionalLight,
    Geometry,
    Mesh,
    MeshLambertMaterial,
    PCFSoftShadowMap,
    RepeatWrapping,
    SphereGeometry,
    TextureLoader,
    Vector3
} from "./node_modules/three/build/three.module.js"
import {World} from "./node_modules/ecsy/build/ecsy.module.js"
import {$, Consts, Globals, on} from './common.js'
import {SoundEffect} from './audio.js'
import {SimpleText, SkyBox, ThreeGroup, ThreeScene, ThreeSystem, TransitionSphere, VRStats} from './three.js'
import {loadStructure} from './levels.js'
import {PhysicsSystem} from './physics.js'
import {MouseInputSystem, MouseState, WaitForClick} from "./mouse.js"
import {ParticlesGroup, ParticlesSystem} from './particles.js'
import {Anim, AnimationSystem, WaitForTime} from './animation.js'
import {GameLogic} from './logic.js'
import {ImmersiveInputSystem, VR_DETECTED, VR_PRESENTCHANGE, VRController, VRManager} from './immersive.js'
import {generateBallTextures} from './gfxutils.js'
import {AudioSystem} from './audio.js'


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
    // light.castShadow = true
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
    game.addComponent(SkyBox,{src:'./textures/sky2.jpg'})



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

function setupAudio(world) {
    const globals = game.getMutableComponent(Globals)
    globals.click = world.createEntity().addComponent(SoundEffect,{name:'click', src:'./sounds/plink.wav'})
    globals.crash = world.createEntity().addComponent(SoundEffect,{name:'crash', src:'./sounds/crash1.wav'})
    globals.thunk = world.createEntity().addComponent(SoundEffect,{name:'thunk', src:'./sounds/thunk.wav'})
    globals.bg = world.createEntity().addComponent(SoundEffect,{name:'bg', src:'./music/sugarplum.mp3',autoPlay:true,loop:true})
}


function setupGui(core) {
    let detected = false
    game.getMutableComponent(Globals).inputMode = Consts.INPUT_MODES.UNSELECTED
    on($("#enter-button"),'click',(e)=> {
        const globals = game.getMutableComponent(Globals)
        e.preventDefault()
        e.stopPropagation()
        if(detected) {
            globals.inputMode = Consts.INPUT_MODES.VR
            core.vrmanager.enterVR()
            //hook up the VR controllers
            world.createEntity().addComponent(VRController,{index:0})
            world.createEntity().addComponent(VRController,{index:1})
        } else {
            console.log("starting without VR")
            $("#overlay").style.visibility = 'hidden'
            //hook up the mouse state component
            globals.inputMode = Consts.INPUT_MODES.MOUSE
            game.addComponent(MouseState)
        }

        loadStructure(Consts.LEVEL_NAMES[globals.levelIndex],world).then(()=>{
            console.log("loaded the level")
        })
    })

    core.vrmanager = new VRManager(core.renderer)
    on(core.vrmanager,VR_DETECTED,()=>{
        detected = true
        $("#enter-button").innerText = "enter vr"
    })
    on(core.vrmanager,VR_PRESENTCHANGE,(e)=>{
        if(e.isPresenting) {
            game.getMutableComponent(Globals).immersive = true
            $("#overlay").style.visibility = 'hidden'
        } else {
            game.getMutableComponent(Globals).immersive = false
            $("#overlay").style.visibility = 'visible'
        }
    })

    $("#enter-button").disabled = false
}

function setupGame() {
    world = new World();

    world.registerSystem(ThreeSystem)
    world.registerSystem(ImmersiveInputSystem)
    world.registerSystem(AudioSystem)
    world.registerSystem(PhysicsSystem)
    world.registerSystem(MouseInputSystem)
    world.registerSystem(ParticlesSystem)
    world.registerSystem(AnimationSystem)
    world.registerSystem(GameLogic)

    world.registerComponent(ThreeScene)

    game = world.createEntity()
    game.addComponent(Globals)
    game.addComponent(ThreeScene)
    game.addComponent(VRStats)


    const globals = game.getMutableComponent(Globals)
    globals.textures = generateBallTextures()
    globals.transition = world.createEntity()
    globals.transition.addComponent(TransitionSphere,{color:'red'})

    //execute one tick to properly init everything
    console.log("doing one tick")
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
    setupAudio(world)
    setupGui(core)




    const parts = world.createEntity()
    parts.addComponent(ParticlesGroup,{position: new Vector3(0,1,-2)})



    globals.instructions = world.createEntity()
    globals.instructions.addComponent(SimpleText,{
        width:2,
        height:1,
        density: 256,
        text:"Jingle Smash\ndestroy blue blocks\nclick to play",
        backgroundColor:'white',
        fontHeight:50,
    })
    const ins = globals.instructions.getMutableComponent(SimpleText)
    ins.obj.position.z = -1.5
    ins.obj.position.y = 1.5

    const click1 = world.createEntity()
    click1.addComponent(WaitForClick,{
        callback:()=>{
            const globals = game.getMutableComponent(Globals)
            globals.balls = 3
            globals.playing = true
            globals.transition.addComponent(Anim,{prop:'opacity',from:1.0,to:0.0,duration:1.5, delay:0.0, onDone:()=>{
                globals.transition.getComponent(TransitionSphere).obj.visible = false
                }})
            globals.instructions.getMutableComponent(SimpleText).obj.visible = false
            world.createEntity().addComponent(WaitForTime,{duration:0.1, callback:()=>{
                    globals.physicsActive = true
                }})
            world.createEntity().addComponent(WaitForTime,{duration:1.1, callback:()=>{
                    globals.collisionsActive = true
                }})
    }})


}

setupGame()

