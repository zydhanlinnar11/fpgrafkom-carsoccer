import Object3DGLTF from './interface/Object3DGLTF'
import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

export default function spawnBall(
  scene: THREE.Scene,
  world: CANNON.World,
  callback: (ball: Object3DGLTF, ballBody: CANNON.Body) => void
) {
  new GLTFLoader().load('/Ball/scene.gltf', function (result) {
    const ball = result.scene.children[0] as Object3DGLTF
    ball.scale.set(1.5, 1.5, 1.5)
    ball.castShadow = true
    ball.position.x = 0
    ball.position.y = 1.5
    ball.position.z = 0
    scene.add(ball)

    const ballBody = new CANNON.Body({ mass: 0.0000000001 })
    ballBody.addShape(new CANNON.Sphere(1.5))
    ballBody.position.x = ball.position.x
    ballBody.position.y = ball.position.y
    ballBody.position.z = ball.position.z
    world.addBody(ballBody)

    callback(ball, ballBody)
  })
}
