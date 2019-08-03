import {System} from "./node_modules/ecsy/build/ecsy.module.js"

export class SoundEffect {
}

export class AudioSystem extends System {
    init() {
        this.context = new window.AudioContext()
        return {
            queries: {
                sounds: {
                    components:[SoundEffect],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                },
            }
        }
    }

    execute(delta) {
        this.events.sounds.added.forEach(ent => {
            const sound = ent.getMutableComponent(SoundEffect)
            console.log("added a sound",sound)
            return fetch(sound.src,{responseType:'arraybuffer'})
                .then(resp => resp.arrayBuffer())
                .then(arr => {
                    return this.context.decodeAudioData(arr)
                })
                .then(data => {
                    sound.data = data
                    if(sound.autoPlay) {
                        this.playSound(sound)
                    }
                })
        })
    }

    playSound(sound) {
        const source = this.context.createBufferSource();
        source.buffer = sound.data
        source.connect(this.context.destination);
        source.start(0)
        return source
    }
}