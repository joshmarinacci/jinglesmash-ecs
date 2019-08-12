import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {SimpleText, ThreeBlock, TransitionSphere} from './three.js'

export const LERP_TYPES = {
    LINEAR:'linear',
    ELASTIC:'elastic'
}

function easeOutElastic(t) {
    const p = 0.3
    return Math.pow(2,-10*t) * Math.sin((t-p/4)*(2*Math.PI)/p) + 1;
}
function easeLinear(from,to,t) {
    return (to - from) * t + from
}


export class Anim {
    constructor() {
        this.startTime = null
        this.lerp = "linear"
        this.delay = 0.0
        this.duration = 1.0
        this.prop = 'foo'
        this.onDone = null
    }
    copy({
         prop='foo',
         lerp='linear',
         from=0,
         to=1.0,
         duration=1.0,
         delay=0.0,
         onDone=null
      }) {
        this.prop = prop
        this.lerp = lerp
        this.from = from
        this.to = to
        this.duration = duration
        this.delay = delay
        this.onDone = onDone
    }
}

function lerp(anim,from,to,t) {
    if(anim.lerp === LERP_TYPES.LINEAR)  return easeLinear(from,to,t)
    if(anim.lerp === LERP_TYPES.ELASTIC) return easeLinear(from,to,easeOutElastic(t))
    return easeLinear(from,to,t)
}

export class WaitForTime {
    constructor() {
        this.startTime = null
        this.callback = null
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
                },
                waits: {
                    components: [WaitForTime],
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
            const anim = ent.getMutableComponent(Anim)
            anim.startTime = performance.now()/1000
        })
        this.queries.anims.forEach(ent => {
            const anim = ent.getMutableComponent(Anim)
            const soFar = performance.now()/1000 - anim.startTime - anim.delay
            if(soFar < 0) return

            const obj = this.getComponentObject(ent)

            const t = soFar/anim.duration
            if(t > 1.0) {
                const nv = lerp(anim, anim.from, anim.to, 1.0)
                this.setObjectProperty(anim, obj, nv)
                if(anim.onDone) anim.onDone()
                ent.removeComponent(Anim)
            } else {
                const nv = lerp(anim, anim.from, anim.to, t)
                this.setObjectProperty(anim, obj, nv)
            }

        })

        this.events.waits.added.forEach(ent => {
            const wait = ent.getMutableComponent(WaitForTime)
            wait.startTime = performance.now()/1000
        })

        this.queries.waits.forEach(ent => {
            const wait = ent.getMutableComponent(WaitForTime)
            const soFar = performance.now()/1000 - wait.startTime
            if(soFar > wait.duration) {
                if(wait.callback) wait.callback()
                ent.removeComponent(WaitForTime)
            }

        })
    }

    getComponentObject(ent) {
        if(ent.hasComponent(TransitionSphere)) return ent.getMutableComponent(TransitionSphere).obj
        if(ent.hasComponent(SimpleText)) return ent.getMutableComponent(SimpleText).obj
        if(ent.hasComponent(ThreeBlock)) return ent.getMutableComponent(ThreeBlock).obj
        console.error(`id ${ent.id} has`)
        Object.keys(ent._components).forEach(c => console.log('comp:',c))
        console.error(ent)

        throw new Error("unknown three object component")
    }

    setObjectProperty(anim, obj, nv) {
        if(anim.prop === 'opacity') {
            obj.material.opacity = nv
            return
        }
        if(anim.prop === 'scale') {
            obj.scale.set(nv,nv,nv)
            return
        }
        throw new Error(`don't know how to set the property ${anim.prop}`)

    }
}