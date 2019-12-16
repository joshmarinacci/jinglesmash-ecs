import {
    AudioLoader,
    AudioListener,
    Audio
} from "./node_modules/three/build/three.module.js"

import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {ThreeScene} from './three.js'


export class SoundEffect {
}

export class PlaySoundEffect {

}

export class AudioSystem extends System {
    execute(delta) {
        this.queries.three.added.forEach(ent => {
            this.listener = new AudioListener()
            this.loader = new AudioLoader()
            const core = ent.getMutableComponent(ThreeScene)
            core.camera.add(this.listener)
        })
        this.queries.sounds.added.forEach(ent => {
            const effect = ent.getMutableComponent(SoundEffect)
            const sound = new Audio(this.listener)
            effect.sound = sound
            this.loader.load(effect.src,(buffer) => {
                sound.setBuffer(buffer)
                if(effect.loop) {
                    sound.setLoop(true)
                }
                if(effect.autoPlay) {
                    console.log("starting to play",effect.src)
                    sound.play()
                }
            })
            /*
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

             */
        })
        this.queries.playing.added.forEach(ent => {
            const sound = ent.getMutableComponent(SoundEffect)
            sound.sound.play()
            setTimeout(()=>{
                ent.removeComponent(PlaySoundEffect)
            },5)
            // this.playSound(sound)
        })
    }

    // playSound(sound) {
    //     const source = this.context.createBufferSource();
    //     source.buffer = sound.data
    //     source.connect(this.context.destination);
    //     source.start(0)
    //     return source
    // }
}

AudioSystem.queries = {
    three: {
        components: [ThreeScene],
        listen: {
            added: true,
            removed: true
        }
    },
    sounds: {
        components:[SoundEffect],
        listen: {
            added: true,
            removed: true
        }
    },
    playing: {
        components: [SoundEffect, PlaySoundEffect],
        listen: {
            added: true,
            removed: true

        }
    }
}
