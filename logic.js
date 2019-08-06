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
        if (globals.playing && !globals.levelLoading) {
            const crystals = this.queries.blocks.filter(ent => {
                return ent.getComponent(Block).physicsType === Consts.BLOCK_TYPES.CRYSTAL
            })
            if (crystals.length <= 0) {
                return this.winLevel()
            } else {
                // console.log('still playing')
            }
            if (globals.balls <= 0) {
                return this.loseLevel()
            }
        }

        if (globals.restart) {
            globals.restart = false
            globals.balls = 3
            globals.playing = true
            globals.transition.addComponent(Anim, {prop: 'opacity', from: 1.0, to: 0.0, duration: 0.5})
            globals.instructions.getMutableComponent(SimpleText).obj.visible = false
            globals.removeBalls = true
            globals.removeBlocks = true
        }
        if (globals.nextLevel) {
            globals.nextLevel = false
            globals.levelIndex += 1
            if (globals.levelIndex >= Consts.LEVEL_NAMES.length) {
                this.wonGame()
            } else {
                this.queries.levels.forEach(ent => {
                    const level = ent.getMutableComponent(LevelInfo)
                    ent.removeComponent(LevelInfo)
                })
                const l2 = this.world.createEntity()
                l2.addComponent(LevelInfo, {name: Consts.LEVEL_NAMES[globals.levelIndex]})
                globals.transition.addComponent(Anim, {prop: 'opacity', from: 1.0, to: 0.0, duration: 0.5})
                globals.instructions.getMutableComponent(SimpleText).obj.visible = false
                globals.balls = 3
                globals.playing = true
                globals.removeBalls = true
                globals.removeBlocks = true
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
                this.queries.globals[0].getMutableComponent(Globals).restart = true
            }
        })
    }

    winLevel() {
        const globals = this.queries.globals[0].getMutableComponent(Globals)
        globals.playing = false
        globals.levelLoading = true
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
}
