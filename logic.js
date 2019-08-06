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
import {SimpleText, ThreeScene} from './three.js'
import {ParticlesGroup} from './particles.js'
import {Globals} from './common.js'
import {Block} from './physics.js'
import {Anim} from './animation.js'
import {WaitForClick} from './mouse.js'
import {PhysicsBall} from './physics.js'
import {LevelInfo} from './levels.js'
import {WaitForTime} from './animation.js'
import {loadStructure} from './levels.js'


export class GameLogic extends System {
    init() {
        return {
            queries: {
                globals: {components: [Globals]},
                blocks: {components: [Block]},
                balls: {components: [PhysicsBall]},
                levels: {components: [LevelInfo]}
            }
        }
    }

    execute(delta) {
        const globals = this.queries.globals[0].getMutableComponent(Globals)
        if (globals.playing && globals.physicsActive && globals.collisionsActive) {
            const crystals = this.queries.blocks.filter(ent => {
                return ent.getComponent(Block).physicsType === Consts.BLOCK_TYPES.CRYSTAL
            })
            if (crystals.length <= 0) {
                return this.winLevel()
            } else {
                // console.log('still playing')
            }
            if (globals.balls < 0) {
                return this.loseLevel()
            }
        }

        if (globals.restart) {
            // globals.physicsActive = true
            globals.restart = false
            this.resetLevelSettings(globals)
        }
        if (globals.nextLevel) {
            globals.nextLevel = false
            globals.levelIndex += 1
            if (globals.levelIndex >= Consts.LEVEL_NAMES.length) {
                this.wonGame()
            } else {
                //remove the old level
                this.queries.levels.slice().forEach(ent => ent.removeComponent(LevelInfo))
                this.resetLevelSettings(globals)
            }
        }
    }

    loseLevel() {
        console.log("you lost. must restart the level")
        const globals = this.queries.globals[0].getMutableComponent(Globals)
        globals.physicsActive = false
        globals.collisionsActive = false
        globals.playing = false
        globals.transition.addComponent(Anim, {prop: 'opacity', from: 0.0, to: 1.0, duration: 0.5})
        globals.instructions.getMutableComponent(SimpleText).obj.visible = true
        globals.instructions.getMutableComponent(SimpleText).setText("try again")
        this.waitForClick(()=>{
            this.queries.globals[0].getMutableComponent(Globals).restart = true
        })
    }

    winLevel() {
        const globals = this.queries.globals[0].getMutableComponent(Globals)
        globals.physicsActive = false
        globals.collisionsActive = false
        globals.playing = false
        globals.balls = 3
        globals.transition.addComponent(Anim, {prop: 'opacity', from: 0.0, to: 1.0, duration: 0.5})
        globals.instructions.getMutableComponent(SimpleText).obj.visible = true
        globals.instructions.getMutableComponent(SimpleText).setText("You won.\nNext Level")
        const click = this.world.createEntity()
        click.addComponent(WaitForClick, {
            callback: () => {
                this.queries.globals[0].getMutableComponent(Globals).nextLevel = true
            }
        })
    }

    wonGame() {
        console.log("you won the game")
        const globals = this.queries.globals[0].getMutableComponent(Globals)
        globals.playing = false
        globals.balls = 3
        globals.transition.addComponent(Anim, {prop: 'opacity', from: 0.0, to: 1.0, duration: 0.5})
        globals.instructions.getMutableComponent(SimpleText).obj.visible = true
        globals.instructions.getMutableComponent(SimpleText).setText("You won the game")
        const click = this.world.createEntity()
        click.addComponent(WaitForClick, {
            callback: () => {
                this.queries.globals[0].getMutableComponent(Globals).nextLevel = true
            }
        })
    }

    doWait(number, f) {
        const wait = this.world.createEntity()
        wait.addComponent(WaitForTime, { duration:number,callback: f})
    }

    resetLevelSettings(globals) {
        globals.balls = 3
        globals.playing = true
        globals.removeBalls = true
        globals.removeBlocks = true
        globals.transition.addComponent(Anim, {prop: 'opacity', from: 1.0, to: 0.0, duration: 0.5})
        globals.instructions.getMutableComponent(SimpleText).obj.visible = false
        this.doWait(0.5,()=>{
            // console.log('adding level')
            const l2 = this.world.createEntity()
            l2.addComponent(LevelInfo, {name: Consts.LEVEL_NAMES[globals.levelIndex]})
            const info = l2.getMutableComponent(LevelInfo)
            loadStructure(info,this.world).then(()=>{
                console.log("got the next level")
                //turn on physics
                globals.physicsActive = true
                this.doWait(1.8,()=>{
                    console.log("doing collisions")
                    globals.collisionsActive = true
                })
            })
        })
    }

    waitForClick(f) {
        const click2 = this.world.createEntity()
        click2.addComponent(WaitForClick, {callback: f})
    }
}
