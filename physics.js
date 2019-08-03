import {BoxGeometry, Mesh, MeshLambertMaterial, Vector3} from "./node_modules/three/build/three.module.js"
import {System} from "./node_modules/ecsy/build/ecsy.module.js"
import {Consts} from './common.js'

export class Ball {

}

export class BlockSystem extends System {
    init() {
        return {
            queries: {
                blocks: { components:[Block]}
            }
        }
    }
    execute(delta) {
        this.queries.blocks.forEach(ent => {
            const block = ent.getMutableComponent(Block)
            block.obj.position.copy(block.position)
            block.obj.rotation.copy(block.rotation)
        })
    }
}

export class Block {
    constructor() {
        this.position = new Vector3(0,0,0)
        this.rotation = new Vector3(0,0,0)
        this.width = 1
        this.height = 2
        this.depth = 1
        this.obj = new Mesh(
            new BoxGeometry(this.width,this.height,this.depth),
            new MeshLambertMaterial({color:'green'})
        )
        this.obj.castShadow = true
        // this.obj.userData.clickable = true
        this.obj.userData.block = this
        this.physicsType = Consts.BLOCK_TYPES.BLOCK
        this.body = null
    }
    copy(src) {
        this.rebuildGeometry()
        // this.rebuildMaterial()
    }

    set(name, value) {
        if(name === 'width' || name === 'height' || name === 'depth') {
            this[name] = value
            this.rebuildGeometry()
            return
        }
        if(name === 'position') {
            this.position.copy(value)
            this.obj.position.copy(value)
            return
        }
        if(name === 'rotation') {
            this.rotation.copy(value)
            this.obj.rotation.setFromVector3(value,'XYZ')
            return
        }
        if(name === 'physicstype') return this.physicsType = value
        throw new Error(`unknown property to set ${name}`)
    }


    rebuildGeometry() {
        this.obj.geometry = new BoxGeometry(this.width,this.height,this.depth)
        // if(this.geometryModifier !== null && this.physicsType === BLOCK_TYPES.BLOCK) this.geometryModifier(this.obj.geometry)
        // if(this.body) {
        //     this.body.userData.block = null
        //     pworld.removeBody(this.body)
        // }
        /*
        let type = CANNON.Body.DYNAMIC
        if(this.physicsType === Consts.BLOCK_TYPES.WALL) {
            type = CANNON.Body.KINEMATIC
        }
        this.body = new CANNON.Body({
            mass: 1,//kg
            type: type,
            position: new CANNON.Vec3(this.position.x,this.position.y,this.position.z),
            shape: new CANNON.Box(new CANNON.Vec3(this.width/2,this.height/2,this.depth/2)),
            // material: wallMaterial,
        })
        this.body.quaternion.setFromEuler(this.rotation.x,this.rotation.y,this.rotation.z,'XYZ')
        this.body.jtype = this.physicsType
        this.body.userData = {}
        this.body.userData.block = this
        pworld.addBody(this.body)
         */
    }
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