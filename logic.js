import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {BaseBall, BaseBlock, BaseRoom, BaseSlingshot, Consts, Globals, LevelInfo} from './common.js'
import {SimpleText, TransitionSphere} from './three.js'
import {Anim, WaitForTime} from './animation.js'
import {WaitForClick} from './mouse.js'
import {loadStructure} from './levels.js'


export class GameLogic extends System {
    execute(delta) {
        const globals = this.queries.globals.results[0].getMutableComponent(Globals)
        const time = performance.now()
        const waited5 = (time - globals.timeOfLastShot > 3000)

        if (globals.playing && globals.physicsActive && globals.collisionsActive) {
            const crystals = this.queries.blocks.results.filter(ent => {
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
    }

    clickToRestartLevel() {
        this.waitForClick(()=>{
            this.resetLevelSettings()
        })
    }

    clickToStartNextLevel() {
        this.waitForClick(()=>{
            this.startNextLevel()
        })
    }

    loseLevel() {
        console.log("you lost. must restart the level")
        const globals = this.queries.globals.results[0].getMutableComponent(Globals)
        globals.physicsActive = false
        globals.collisionsActive = false
        globals.playing = false
        globals.transition.getComponent(TransitionSphere).obj.visible = true
        globals.transition.addComponent(Anim, {prop: 'opacity',
            from: 0.0, to: 1.0, duration: 0.5,
            onDone:()=>this.clickToRestartLevel() })
        globals.instructions.getMutableComponent(SimpleText).obj.visible = true
        globals.instructions.getMutableComponent(SimpleText).setText("try again")
    }

    winLevel() {
        const globals = this.queries.globals.results[0].getMutableComponent(Globals)
        globals.physicsActive = false
        globals.collisionsActive = false
        globals.playing = false
        globals.balls = 3
        globals.transition.getComponent(TransitionSphere).obj.visible = true
        globals.transition.addComponent(Anim, {prop: 'opacity',
            from: 0.0, to: 1.0, duration: 0.5,
            onDone:()=> this.clickToStartNextLevel()})
        globals.instructions.getMutableComponent(SimpleText).obj.visible = true
        globals.instructions.getMutableComponent(SimpleText).setText("You won.\nNext Level")
    }

    wonGame() {
        console.log("you won the game")
        const globals = this.queries.globals.results[0].getMutableComponent(Globals)
        globals.playing = false
        globals.balls = 3
        globals.levelIndex = -1
        globals.transition.getComponent(TransitionSphere).obj.visible = true
        globals.transition.addComponent(Anim, {prop: 'opacity',
            from: 0.0, to: 1.0, duration: 0.5,
            onDone:()=> this.clickToStartNextLevel()})
        globals.instructions.getMutableComponent(SimpleText).obj.visible = true
        globals.instructions.getMutableComponent(SimpleText).setText("You won the game")
    }

    waitForTime(number, f) {
        const wait = this.world.createEntity()
        wait.addComponent(WaitForTime, { duration:number,callback: f})
    }

    waitForClick(f) {
        const click2 = this.world.createEntity()
        click2.addComponent(WaitForClick, {callback: f})
    }

    resetLevelSettings() {
        const globals = this.queries.globals.results[0].getMutableComponent(Globals)
        this.queries.balls.results.slice().forEach(ent => ent.removeComponent(BaseBall))
        this.queries.blocks.results.slice().forEach(ent => ent.removeComponent(BaseBlock))
        // this.queries.slingshots.results.slice().forEach(ent => ent.getMutableComponent(BaseSlingshot))
        globals.balls = 3
        globals.playing = true
        this.queries.rooms.results.slice().forEach(ent => ent.removeComponent(BaseRoom))
        globals.transition.addComponent(Anim, {prop: 'opacity', from: 1.0, to: 0.0, duration: 0.5, onDone:()=>{
                globals.transition.getComponent(TransitionSphere).obj.visible = false
            }})
        globals.instructions.getMutableComponent(SimpleText).obj.visible = false
        //stagger starting physics then collisions so the scene can settle first
        this.waitForTime(0.5,()=>{
            loadStructure(Consts.LEVEL_NAMES[globals.levelIndex],this.world).then(()=>{
                globals.physicsActive = true
                this.waitForTime(1.8,()=>{
                    globals.collisionsActive = true
                })
            })
        })
    }

    startNextLevel() {
        const globals = this.queries.globals.results[0].getMutableComponent(Globals)
        globals.levelIndex += 1
        if (globals.levelIndex >= Consts.LEVEL_NAMES.length) {
            this.wonGame()
        } else {
            //remove the old level
            this.queries.levels.results.slice().forEach(ent => ent.removeComponent(LevelInfo))
            this.resetLevelSettings()
        }
    }
}

GameLogic.queries = {
    globals: {components: [Globals]},
    blocks: {components: [BaseBlock]},
    balls: {components: [BaseBall]},
    rooms: {components: [BaseRoom]},
    levels: {components: [LevelInfo]},
    slingshots: {components: [BaseSlingshot]},
}
