import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {SimpleText, TransitionSphere} from './three.js'

function lerp(from, to, t) {
    return from + (to-from)*t
}


export class Anim {
    constructor() {
        this.started = false
        this.startTime = null
    }
}

export class AnimationSystem extends System {
    init() {
        return {
            queries: {
                anims: {
                    components: [Anim],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                }
            }
        }
    }

    execute(delta) {
        this.events.anims.added.forEach(ent => {
            console.log('adding anim')
            const anim = ent.getMutableComponent(Anim)
            anim.startTime = performance.now()/1000
            anim.started = true
            console.log(anim)
        })
        this.queries.anims.forEach(ent => {
            const anim = ent.getMutableComponent(Anim)
            const soFar = performance.now()/1000 - anim.startTime


            if(soFar > anim.duration) {
                console.log("done")
                ent.removeComponent(Anim)
            } else {
                const t = soFar/anim.duration
                const nv = lerp(anim.from,anim.to,t)
                const obj = this.getComponentObject(ent)
                obj.material.opacity = nv
            }

        })
    }

    getComponentObject(ent) {
        if(ent.hasComponent(TransitionSphere)) return ent.getMutableComponent(TransitionSphere).obj
        if(ent.hasComponent(SimpleText)) return ent.getMutableComponent(SimpleText).obj
        throw new Error("unknown three object component")
    }
}