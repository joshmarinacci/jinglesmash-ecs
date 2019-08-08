import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {GPUParticleSystem} from './gpu_particles.js'
import {AdditiveBlending, Color, TextureLoader, Vector3, NormalBlending} from "./node_modules/three/build/three.module.js"
import {remap} from './common.js'
import {ThreeScene} from './three.js'


export class ParticlesGroup {
    constructor() {
        this.position = new Vector3(0,0,0)
    }
}

export class ParticlesSystem extends System {
    init() {
        this.totalTime = 0
        this.pendingParticles = []
        const options = {
            maxParticles: 10000,
            position: new Vector3(0,0,0),
            positionRandomness: 0.0,
            baseVelocity: new Vector3(0.0, 0.0, 0.0),
            velocity: new Vector3(0.0, 0.0, 0.0),
            velocityRandomness: 0.3,
            acceleration: new Vector3(0.0,0.0,0.0),
            color: new Color(1.0,0.5,0.5),
            endColor: new Color(1.0,1.0,1.0),
            colorRandomness: 0.0,
            lifetime: 0.5,
            fadeIn: 0.1,
            fadeOut: 0.1,
            size: 30,
            sizeRandomness: 1.0,
            particleSpriteTex: new TextureLoader().load('./textures/spark.png'),
            blending: NormalBlending,
            onTick:(system,time) => {
                this.pendingParticles.forEach(v => {
                    options.position.copy(v)
                    for (let i = 0; i < 10; i++) {
                        const v = 3.0
                        options.velocity.x = remap(Math.random(),0,1,-v,v)
                        options.velocity.y = remap(Math.random(),0,1,-v,v)
                        options.velocity.z = remap(Math.random(),0,1,-v,v)
                        system.spawnParticle(options);
                    }
                })
                this.pendingParticles = []
            }
        }
        this.psystem = new GPUParticleSystem(options)
        return {
            queries: {
                three: {
                    components: [ThreeScene],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                },
                groups: {
                    components: [ParticlesGroup],
                    events: {
                        added: {event:'EntityAdded'},
                        removed: {event:'EntityRemoved'}
                    }
                }
            }
        }
    }

    execute(delta) {
        this.totalTime += delta

        this.events.three.added.forEach(ent => {
            const three = ent.getMutableComponent(ThreeScene)
            if (!three.scene) return
            three.stage.add(this.psystem)
        })

        this.events.groups.added.forEach(ent => {
            const group = ent.getMutableComponent(ParticlesGroup)
            this.pendingParticles.push(group.position)
        })
        this.psystem.update(this.totalTime)
    }
}