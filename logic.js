import {
    BoxGeometry,
    CanvasTexture,
    CylinderGeometry,
    Geometry,
    LatheBufferGeometry,
    Mesh,
    MeshLambertMaterial,
    MeshPhongMaterial,
    MeshStandardMaterial,
    RepeatWrapping,
    SphereGeometry,
    Vector2,
    Vector3
} from "./node_modules/three/build/three.module.js"
import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {Consts, pickOneValue} from './common.js'
import {SimpleText, ThreeScene} from './three'
import {ParticlesGroup} from './particles.js'
import {Globals} from './common.js'
import {Block} from './physics.js'
import {Anim} from './animation.js'
import {WaitForClick} from './mouse.js'


export class GameLogic extends System {
    init() {
        return {
            queries: {
                globals: {components:[Globals]},
                blocks: {components: [Block]},
            }
        }
    }
    execute(delta) {
        const globals = this.queries.globals[0].getMutableComponent(Globals)
        if(globals.playing) {
            if (this.queries.blocks.length <= 0) {
                console.log("the blocks are all gone")
                return this.winLevel()
            } else {
                // console.log('still playing')
            }
            if(globals.balls <= 0) {
                return this.loseLevel()
            }
        }
    }

    loseLevel() {
        console.log("you lost. must restart the level")
        const globals = this.queries.globals[0].getMutableComponent(Globals)
        globals.playing = false
        globals.balls = 3
        globals.transition.addComponent(Anim, {prop: 'opacity', from: 0.0, to: 1.0, duration: 0.5})
        globals.instructions.getMutableComponent(SimpleText).obj.visible = true
        globals.instructions.getMutableComponent(SimpleText).setText("try again")
        const click2 = this.world.createEntity()
        click2.addComponent(WaitForClick, {
            callback: () => {
                console.log('waiting for another click')
                const globals = this.queries.globals[0].getMutableComponent(Globals)
                globals.balls = 3
                globals.playing = true
                globals.transition.addComponent(Anim,{prop:'opacity',from:1.0,to:0.0,duration:0.5})
                globals.instructions.getMutableComponent(SimpleText).obj.visible = false
            }
        })
    }
}