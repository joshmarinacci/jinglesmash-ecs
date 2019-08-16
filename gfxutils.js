import {
    CanvasTexture,
    CylinderGeometry,
    Geometry,
    LatheBufferGeometry,
    Mesh,
    MeshPhongMaterial,
    MeshStandardMaterial,
    RepeatWrapping,
    SphereGeometry,
    Vector2
} from "./node_modules/three/build/three.module.js"

import {Consts} from './common.js'

export function generateBallMesh(type, radius, globals) {
    const rad = radius

    if(type === Consts.BALL_TYPES.PLAIN) {
        return new Mesh(
            new SphereGeometry(rad,6,5),
            new MeshPhongMaterial({color: Consts.BLOCK_COLORS.BALL, flatShading: true})
        )
    }

    if(type === Consts.BALL_TYPES.ORNAMENT1) {
        let points = [];
        for (let i = 0; i <= 16; i++) {
            points.push(new Vector2(Math.sin(i * 0.195) * rad, i * rad / 7));
        }
        var geometry = new LatheBufferGeometry(points);
        geometry.center()
        return new Mesh(geometry, new MeshStandardMaterial({
            color: 'white',
            metalness: 0.3,
            roughness: 0.3,
            map: globals.textures.ornament1
        }))
    }

    if(type === Consts.BALL_TYPES.ORNAMENT2) {
        const geo = new Geometry()
        geo.merge(new SphereGeometry(rad,32))
        const stem = new CylinderGeometry(rad/4,rad/4,0.5,8)
        stem.translate(0,rad/4,0)
        geo.merge(stem)
        return new Mesh(geo, new MeshStandardMaterial({
            color: 'white',
            metalness: 0.3,
            roughness: 0.3,
            map: globals.textures.ornament2
        }))
    }

    throw new Error("unknown ball type",ball.type)
}

export function generateBallTextures() {
    const textures = {}
    {
        const canvas = document.createElement('canvas')
        canvas.width = 64
        canvas.height = 16
        const c = canvas.getContext('2d')


        c.fillStyle = 'black'
        c.fillRect(0, 0, canvas.width, canvas.height)
        c.fillStyle = 'red'
        c.fillRect(0, 0, 30, canvas.height)
        c.fillStyle = 'white'
        c.fillRect(30, 0, 4, canvas.height)
        c.fillStyle = 'green'
        c.fillRect(34, 0, 30, canvas.height)

        textures.ornament1 = new CanvasTexture(canvas)
        textures.ornament1.wrapS = RepeatWrapping
        textures.ornament1.repeat.set(8, 1)
    }


    {
        const canvas = document.createElement('canvas')
        canvas.width = 128
        canvas.height = 128
        const c = canvas.getContext('2d')
        c.fillStyle = 'black'
        c.fillRect(0,0,canvas.width, canvas.height)

        c.fillStyle = 'red'
        c.fillRect(0, 0, canvas.width, canvas.height/2)
        c.fillStyle = 'white'
        c.fillRect(0, canvas.height/2, canvas.width, canvas.height/2)

        const tex = new CanvasTexture(canvas)
        tex.wrapS = RepeatWrapping
        tex.wrapT = RepeatWrapping
        tex.repeat.set(6,6)
        textures.ornament2 = tex
    }

    return textures

}
