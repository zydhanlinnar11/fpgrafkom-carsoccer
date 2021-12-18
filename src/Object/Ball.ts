import Object3DGLTF from '../interface/Object3DGLTF'
import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import Coordinate from '../interface/Coordinate'
import { Vec3 } from 'cannon-es'

export default class Ball {
  private ball: Object3DGLTF
  private ballBody: CANNON.Body
  private collisionHandlerCallback: (
    collidedWith: CANNON.Body,
    ball: Ball
  ) => void
  private hasBeenReset: boolean
  private initBallPos: CANNON.Vec3
  private initBallQuarternion: CANNON.Quaternion

  // This shouldn't be used outside this class
  private constructor(
    scene: THREE.Scene,
    world: CANNON.World,
    ballGLTF: Object3DGLTF,
    { x, y, z }: Coordinate,
    colissionHandlerCallback: (collidedWith: CANNON.Body, ball: Ball) => void
  ) {
    this.ball = ballGLTF
    this.ball.scale.set(1.5, 1.5, 1.5)
    this.ball.traverse((child: Object3DGLTF) => {
      if (child.isMesh) {
        child.castShadow = true
      }
    })
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
    colissionHandlerCallback: (collidedWith: CANNON.Body, ball: Ball) => void
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
    this.collisionHandlerCallback(e.body, this)
  }

  resetPosition() {
    if (!this.hasBeenReset) {
      this.initBallPos = new Vec3(
        this.ballBody.initPosition.x,
        this.ballBody.initPosition.y,
        this.ballBody.initPosition.z
      )
      this.initBallQuarternion = new CANNON.Quaternion(
        this.ballBody.initQuaternion.x,
        this.ballBody.initQuaternion.y,
        this.ballBody.initQuaternion.z,
        this.ballBody.initQuaternion.w
      )
    }
    this.ballBody.position = new Vec3(
      this.initBallPos.x,
      this.initBallPos.y,
      this.initBallPos.z
    )
    this.ballBody.quaternion = new CANNON.Quaternion(
      this.initBallQuarternion.x,
      this.initBallQuarternion.y,
      this.initBallQuarternion.z,
      this.initBallQuarternion.w
    )
    this.ballBody.velocity.setZero()
    this.ballBody.angularVelocity.setZero()
    this.hasBeenReset = true
  }

  getBall() {
    return this.ball
  }

  updatePositionFromNetwork(position: THREE.Vector3) {
    this.ballBody.position.set(position.x, position.y, position.z)
  }

  updateQuarternionFromNetwork(quaternion: THREE.Quaternion) {
    this.ballBody.quaternion.set(
      quaternion.x,
      quaternion.y,
      quaternion.z,
      quaternion.w
    )
  }
}
