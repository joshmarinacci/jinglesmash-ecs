import {System} from "./node_modules/ecsy/build/ecsy.module.js"

export class SoundEffect {
}

export class PlaySoundEffect {

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
                playing: {
                    components: [SoundEffect, PlaySoundEffect],
                    events: {
                        added: {event: 'EntityAdded'},
                        removed: {event: 'EntityRemoved'}
                    }
                }
            }
        }
    }

    execute(delta) {
        this.events.sounds.added.forEach(ent => {
            const sound = ent.getMutableComponent(SoundEffect)
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
        this.events.playing.added.forEach(ent => {
            const sound = ent.getMutableComponent(SoundEffect)
            setTimeout(()=>{
                ent.removeComponent(PlaySoundEffect)
            },5)
            this.playSound(sound)
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