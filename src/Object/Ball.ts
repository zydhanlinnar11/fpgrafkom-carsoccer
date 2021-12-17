import Object3DGLTF from '../interface/Object3DGLTF'
import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import Coordinate from '../interface/Coordinate'

export default class Ball {
  private ball: Object3DGLTF
  private ballBody: CANNON.Body
  private collisionHandlerCallback: (collidedWith: CANNON.Body) => void

  // This shouldn't be used outside this class
  private constructor(
    scene: THREE.Scene,
    world: CANNON.World,
    ballGLTF: Object3DGLTF,
    { x, y, z }: Coordinate,
    colissionHandlerCallback: (collidedWith: CANNON.Body) => void
  ) {
    this.ball = ballGLTF
    this.ball.scale.set(1.5, 1.5, 1.5)
    this.ball.castShadow = true
    this.ball.position.set(x, y, z)
    scene.add(this.ball)

    this.ballBody = new CANNON.Body({ mass: 0.0000000001 })
    this.ballBody.addShape(new CANNON.Sphere(1.5))
    this.ballBody.position.set(x, y, z)
    world.addBody(this.ballBody)
    this.ballBody.addEventListener('collide', this.collisionHandler)
    this.collisionHandlerCallback = colissionHandlerCallback
  }

  static async createBallInstance(
    scene: THREE.Scene,
    world: CANNON.World,
    position: Coordinate,
    colissionHandlerCallback: (collidedWith: CANNON.Body) => void
  ) {
    const result = await new GLTFLoader().loadAsync('/Ball/scene.gltf')
    return new Ball(
      scene,
      world,
      result.scene.children[0] as Object3DGLTF,
      position,
      colissionHandlerCallback
    )
  }

  update() {
    // Copy coordinates from Cannon to Three.js
    // console.log(this.ball.position)
    this.ball.position.set(
      this.ballBody.position.x,
      this.ballBody.position.y,
      this.ballBody.position.z
    )
    this.ball.quaternion.set(
      this.ballBody.quaternion.x,
      this.ballBody.quaternion.y,
      this.ballBody.quaternion.z,
      this.ballBody.quaternion.w
    )
  }

  collisionHandler = (e: { body: CANNON.Body }) => {
    this.collisionHandlerCallback(e.body)
  }
}
