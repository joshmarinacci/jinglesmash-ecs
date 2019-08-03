import {World, System} from "./node_modules/ecsy/build/ecsy.module.js"
import {Consts} from './common'

export class Ball {

}

export class PhysicsSystem extends System {

    handleCollision(e) {
        // if(game.blockService.ignore_collisions) return
        //ignore tiny collisions
        if(Math.abs(e.contact.getImpactVelocityAlongNormal() < 1.0)) return

        //when ball hits moving block,
        if(e.body.jtype === Consts.BLOCK_TYPES.BALL) {
            if( e.target.jtype === Consts.BLOCK_TYPES.WALL) {
                const sound = this.world.createEntity()
                sound.addComponent(PlaySound,{name:'click'})
            }
            if (e.target.jtype === Consts.BLOCK_TYPES.BLOCK) {
                //hit a block, just make the thunk sound
                sound.addComponent(PlaySound,{name:'click'})
            }
        }

        //if crystal hits anything and the impact was strong enought
        if(e.body.jtype === Consts.BLOCK_TYPES.CRYSTAL || e.target.jtype === Consts.BLOCK_TYPES.CRYSTAL) {
            if(Math.abs(e.contact.getImpactVelocityAlongNormal() >= 2.0)) {
                return destroyCrystal(e.target)
            }
        }
        // console.log(`collision: body ${e.body.jtype} target ${e.target.jtype}`)
    }


}