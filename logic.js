import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {BaseBall, BaseBlock, BaseRoom, BaseSlingshot, Consts, Globals} from './common.js'
import {SimpleText, TransitionSphere} from './three.js'
import {Anim, WaitForTime} from './animation.js'
import {WaitForClick} from './mouse.js'
import {LevelInfo, loadStructure} from './levels.js'


export class GameLogic extends System {
    init() {
        return {
            queries: {
                globals: {components: [Globals]},
                blocks: {components: [BaseBlock]},
                balls: {components: [BaseBall]},
                rooms: {components: [BaseRoom]},
                levels: {components: [LevelInfo]},
                slingshots: {components: [BaseSlingshot]},
            }
        }
    }

    execute(delta) {
        const globals = this.queries.globals[0].getMutableComponent(Globals)
        const time = performance.now()
        const waited5 = (time - globals.timeOfLastShot > 3000)

        if (globals.playing && globals.physicsActive && globals.collisionsActive) {
            const crystals = this.queries.blocks.filter(ent => {
                return ent.getComponent(BaseBlock).physicsType === Consts.BLOCK_TYPES.CRYSTAL
            })
            if (crystals.length <= 0 && waited5) {
                return this.winLevel()
            } else {
                // console.log('still playing')
            }
            if (globals.balls <= 0 && waited5) {
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
        globals.transition.getComponent(TransitionSphere).obj.visible = true
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
        globals.transition.getComponent(TransitionSphere).obj.visible = true
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
        globals.levelIndex = -1
        globals.transition.getComponent(TransitionSphere).obj.visible = true
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
        this.queries.balls.slice().forEach(ent => ent.removeComponent(BaseBall))
        this.queries.blocks.slice().forEach(ent => ent.removeComponent(BaseBlock))
        // this.queries.slingshots.slice().forEach(ent => ent.getMutableComponent(BaseSlingshot))
        globals.balls = 3
        globals.playing = true
        this.queries.rooms.slice().forEach(ent => ent.removeComponent(BaseRoom))
        globals.transition.addComponent(Anim, {prop: 'opacity', from: 1.0, to: 0.0, duration: 0.5, onDone:()=>{
                globals.transition.getComponent(TransitionSphere).obj.visible = false
            }})
        globals.instructions.getMutableComponent(SimpleText).obj.visible = false
        this.doWait(0.5,()=>{
            loadStructure(Consts.LEVEL_NAMES[globals.levelIndex],this.world).then(()=>{
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
