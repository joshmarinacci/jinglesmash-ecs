import {World, System} from "./node_modules/ecsy/build/ecsy.module.js"
import {Consts, Globals} from './common'
import {AudioSystem} from './audio'
import {ThreeSystem} from './three'
import {LevelLoaderSystem} from './levels'
import {PhysicsSystem} from './physics'

function setupLights() {
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    //set the background color of the scene
    scene.background = new THREE.Color( 0xcccccc );

    //a standard light
    const light = new THREE.DirectionalLight( 0xffffff, 0.5 );
    light.castShadow = true
    light.shadow.mapSize.width = 512
    light.shadow.mapSize.height = 512
    light.shadow.camera.right = 10
    light.shadow.camera.top = 10
    light.position.set( 0, 1, 0.5 ).normalize();
    light.userData.skipRaycast = true
    scene.add( light );

    const ambient = new THREE.AmbientLight(0xffffff,0.5)
    ambient.userData.skipRaycast = true
    scene.add(ambient)
}

function initBackground() {
    const sky = world.createEntity()
    sky.addComponent(SkyBox,'./textures/sky2.jpg')

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


    // const tex = game.texture_loader.load('./textures/candycane.png')
    // tex.wrapS = THREE.RepeatWrapping
    // tex.wrapT = THREE.RepeatWrapping
    // tex.repeat.set(8,8)

    // const background = new THREE.Group()
    const background = world.createEntity()
    background.addComponent(ThreeGroup)


    const candyCones = new THREE.Geometry()
    candyCones.merge(new THREE.ConeGeometry(1,10,16,8).translate(-22,5,0))
    candyCones.merge(new THREE.ConeGeometry(1,10,16,8).translate(22,5,0))
    candyCones.merge(new THREE.ConeGeometry(1,10,16,8).translate(7,5,-30))
    candyCones.merge(new THREE.ConeGeometry(1,10,16,8).translate(-13,5,-20))
    const mesh1 = new THREE.Mesh(candyCones,new THREE.MeshLambertMaterial({ color:'white', map:tex,}))
    background.getMutableComponent(ThreeGroup).add(mesh1)

    const greenCones = new THREE.Geometry()
    greenCones.merge(new THREE.ConeGeometry(1,5,16,8).translate(-15,2,-5))
    greenCones.merge(new THREE.ConeGeometry(1,5,16,8).translate(-8,2,-28))
    greenCones.merge(new THREE.ConeGeometry(1,5,16,8).translate(-8.5,0,-25))
    greenCones.merge(new THREE.ConeGeometry(1,5,16,8).translate(15,2,-5))
    greenCones.merge(new THREE.ConeGeometry(1,5,16,8).translate(14,0,-3))
    const mesh2 = new THREE.Mesh(greenCones,new THREE.MeshLambertMaterial({color:'green', map:tex,}))
    background.getMutableComponent(ThreeGroup).add(mesh2)


    const dome_geo = new THREE.Geometry()
    //left
    dome_geo.merge(new THREE.SphereGeometry(6).translate(-20,-4,0))
    dome_geo.merge(new THREE.SphereGeometry(10).translate(-25,-5,-10))
    //right
    dome_geo.merge(new THREE.SphereGeometry(10).translate(30,-5,-10))
    dome_geo.merge(new THREE.SphereGeometry(6).translate(27,-3,2))

    //front
    dome_geo.merge(new THREE.SphereGeometry(15).translate(0,-6,-40))
    dome_geo.merge(new THREE.SphereGeometry(7).translate(-15,-3,-30))
    dome_geo.merge(new THREE.SphereGeometry(4).translate(7,-1,-25))

    //back
    dome_geo.merge(new THREE.SphereGeometry(15).translate(0,-6,40))
    dome_geo.merge(new THREE.SphereGeometry(7).translate(-15,-3,30))
    dome_geo.merge(new THREE.SphereGeometry(4).translate(7,-1,25))

    const mesh3 = new THREE.Mesh(dome_geo,new THREE.MeshLambertMaterial({color:'white'}))
    background.getMutableComponent(ThreeGroup).add(mesh3)

    // background.position.set(0,0,0)
    // background.userData.skipRaycast = true

    // scene.add(background)
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
    const world = new World();

    world.registerSystem(ThreeSystem)
    world.registerSystem(AudioSystem)
    world.registerSystem(LevelLoaderSystem)
    world.registerSystem(PhysicsSystem)

    const game = world.createEntity()
    game.addComponent(Globals)
    game.addComponent(ThreeScene)

    game.getMutableComponent(ThreeScene).renderer.setRendererAnimationCallback(()=> {
        const delta = clock.getDelta();
        const elapsedTime = clock.elapsedTime;
        world.execute(delta, elapsedTime)
        renderer.render(scene, camera)
    })

    setupLights()
    setupGame()
    setupAudio()
    setupGui()
}

setupGame()

