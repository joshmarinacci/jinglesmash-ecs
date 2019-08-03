import {World, System} from "./node_modules/ecsy/build/ecsy.module.js"
import {Globals} from './common'

class ThreeScene {
    constructor() {
        this.scene = null
        this.camera = null
        this.renderer = null
    }
}
class ThreeSystem extends System {
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
    }

}


function setupGame() {
    const world = new World();

    world.registerSystem(ThreeSystem)



    const s3 = world.createEntity()
    s3.addComponent(Globals)
    s3.addComponent(ThreeScene)

    s3.renderer.setRendererAnimationCallback(()=> {
        const delta = clock.getDelta();
        const elapsedTime = clock.elapsedTime;
        world.execute(delta, elapsedTime)
        renderer.render(scene, camera)
    })


}

setupGame(s3)

