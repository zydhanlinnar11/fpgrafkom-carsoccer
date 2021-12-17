import Object3DGLTF from '../interface/Object3DGLTF'
import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import Coordinate from '../interface/Coordinate'
import { Vec3 } from 'cannon-es'

export default class Octane {
  private octane: Object3DGLTF | null = null
  private wheels: Object3DGLTF[] | null = [] as Object3DGLTF[]
  private vehicle: CANNON.RigidVehicle | null = null
  private maxForce = 10
  private maxSteerVal = Math.PI / 16
  private wheelOffsets = [
    [1.1, -0.25, 0.6],
    [1.1, -0.25, -0.6],
    [-0.5, -0.25, -0.6],
    [-0.5, -0.25, 0.6],
  ]
  private maxSpeed = 20
  private reverseOrientation
  private initBodyPos: CANNON.Vec3
  private initBodyQuarternion: CANNON.Quaternion
  private initWheelPos: CANNON.Vec3[] = []
  private initWheelQuarternion: CANNON.Quaternion[] = []
  private hasBeenReset: boolean = false

  private constructor(
    scene: THREE.Scene,
    world: CANNON.World,
    nodes: THREE.Object3D<THREE.Event>[],
    { x, y, z }: Coordinate,
    chaseCam?: THREE.Object3D<THREE.Event>,
    reverseOrientation: boolean = false
  ) {
    this.reverseOrientation = reverseOrientation
    this.octane = nodes[0] as Object3DGLTF
    this.octane.traverse((child: Object3DGLTF) => {
      if (child.isMesh) {
        child.material.metalness = 0
      }
    })
    for (let i = 1; i < nodes.length; i++) {
      nodes[i].scale.set(2, 2, 2)
      nodes[i].castShadow = true
      this.wheels.push(nodes[i] as Object3DGLTF)
    }

    this.octane.scale.set(2, 2, 2)
    this.octane.castShadow = true
    this.octane.position.set(x, y, z)
    scene.add(this.octane)
    if (chaseCam) this.octane.add(chaseCam)

    const octaneShape = new CANNON.Box(new CANNON.Vec3(1.1, 0.3125, 0.375))
    const octaneBody = new CANNON.Body({ mass: 1 })
    octaneBody.addShape(octaneShape, new CANNON.Vec3(0, 0.418, 0))
    octaneBody.position.set(x, y, z)

    this.vehicle = new CANNON.RigidVehicle({
      chassisBody: octaneBody,
    })
    world.addBody(this.vehicle.chassisBody)

    const axis = new CANNON.Vec3(0, 0, 1)
    const down = new CANNON.Vec3(0, 0, -1)
    const quat = new CANNON.Quaternion()
    quat.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2)

    for (let i = 0; i < this.wheels.length; i++) {
      this.wheels[i].position.set(
        this.wheelOffsets[i][0] * (this.reverseOrientation ? -1 : 1) + x,
        this.wheelOffsets[i][1] * (this.reverseOrientation ? -1 : 1) + y,
        this.wheelOffsets[i][2] * (this.reverseOrientation ? -1 : 1) + z
      )
      scene.add(this.wheels[i])
      const wheelShape = new CANNON.Sphere(0.35)
      const wheelBody = new CANNON.Body({ mass: 1 })
      wheelBody.addShape(wheelShape, new CANNON.Vec3(0, 0, 0))
      wheelBody.position.set(
        this.wheels[i].position.x,
        this.wheels[i].position.y,
        this.wheels[i].position.z
      )
      this.vehicle.addWheel({
        body: wheelBody,
        position: new CANNON.Vec3(
          ...this.wheelOffsets[i].map(
            (offset, index) =>
              offset * (this.reverseOrientation && index !== 1 ? -1 : 1)
          )
        ),
        axis,
        direction: down,
      })

      world.addBody(this.vehicle.wheelBodies[i])
      world.addConstraint(this.vehicle.constraints[i])
      this.vehicle.wheelBodies[i].angularDamping = 0.3
    }
  }

  static async createCarInstance(
    scene: THREE.Scene,
    world: CANNON.World,
    position: Coordinate,
    chaseCam?: THREE.Object3D<THREE.Event>,
    reverseOrientation: boolean = false
  ) {
    const result = await new GLTFLoader().loadAsync('/Octane/scene.gltf')
    const nodes = result.scene.children[0].children[0].children[0].children
    return new Octane(
      scene,
      world,
      nodes,
      position,
      chaseCam,
      reverseOrientation
    )
  }

  update() {
    // Copy coordinates from Cannon to Three.js
    this.octane.position.set(
      this.vehicle.chassisBody.position.x,
      this.vehicle.chassisBody.position.y,
      this.vehicle.chassisBody.position.z
    )
    this.octane.quaternion.set(
      this.vehicle.chassisBody.quaternion.x,
      this.vehicle.chassisBody.quaternion.y,
      this.vehicle.chassisBody.quaternion.z,
      this.vehicle.chassisBody.quaternion.w
    )
    this.octane.rotateX(-Math.PI / 2)
    if (this.reverseOrientation) this.octane.rotateZ(Math.PI)
    // console.log(this.octane.quaternion)

    for (let i = 0; i < this.wheels.length; i++) {
      this.wheels[i].position.set(
        this.vehicle.wheelBodies[i].position.x,
        this.vehicle.wheelBodies[i].position.y,
        this.vehicle.wheelBodies[i].position.z
      )
      this.wheels[i].quaternion.set(
        this.vehicle.wheelBodies[i].quaternion.x,
        this.vehicle.wheelBodies[i].quaternion.y,
        this.vehicle.wheelBodies[i].quaternion.z,
        this.vehicle.wheelBodies[i].quaternion.w
      )
      this.wheels[i].rotateX(-Math.PI / 2)
    }
  }

  setZeroTorque() {
    this.vehicle.setSteeringValue(0, 0)
    this.vehicle.setSteeringValue(0, 1)
  }

  setZeroTurn() {
    this.vehicle.applyWheelForce(0, 2)
    this.vehicle.applyWheelForce(0, 3)
  }

  accelerate() {
    for (let i = 2; i <= 3; i++)
      this.vehicle.applyWheelForce(
        Math.abs(this.vehicle.getWheelSpeed(i)) < this.maxSpeed
          ? -this.maxForce * (this.reverseOrientation ? -1 : 1)
          : 0,
        i
      )
  }

  reverse() {
    for (let i = 2; i <= 3; i++)
      this.vehicle.applyWheelForce(
        Math.abs(this.vehicle.getWheelSpeed(i)) < this.maxSpeed
          ? (this.maxForce * (this.reverseOrientation ? -1 : 1)) / 2
          : 0,
        i
      )
  }

  turnLeft() {
    this.vehicle.setSteeringValue(this.maxSteerVal, 0)
    this.vehicle.setSteeringValue(this.maxSteerVal, 1)
  }

  turnRight() {
    this.vehicle.setSteeringValue(-this.maxSteerVal, 0)
    this.vehicle.setSteeringValue(-this.maxSteerVal, 1)
  }

  getChassis() {
    return this.octane
  }

  resetPosition() {
    if (!this.hasBeenReset) {
      this.initBodyPos = new Vec3(
        this.vehicle.chassisBody.initPosition.x,
        this.vehicle.chassisBody.initPosition.y,
        this.vehicle.chassisBody.initPosition.z
      )
      this.initBodyQuarternion = new CANNON.Quaternion(
        this.vehicle.chassisBody.initQuaternion.x,
        this.vehicle.chassisBody.initQuaternion.y,
        this.vehicle.chassisBody.initQuaternion.z,
        this.vehicle.chassisBody.initQuaternion.w
      )
    }
    this.vehicle.chassisBody.position = new Vec3(
      this.initBodyPos.x,
      this.initBodyPos.y,
      this.initBodyPos.z
    )
    this.vehicle.chassisBody.quaternion = new CANNON.Quaternion(
      this.initBodyQuarternion.x,
      this.initBodyQuarternion.y,
      this.initBodyQuarternion.z,
      this.initBodyQuarternion.w
    )
    this.vehicle.chassisBody.velocity.setZero()
    this.vehicle.chassisBody.angularVelocity.setZero()

    for (let i = 0; i < this.wheels.length; i++) {
      if (!this.hasBeenReset) {
        this.initWheelPos.push(
          new Vec3(
            this.vehicle.wheelBodies[i].initPosition.x,
            this.vehicle.wheelBodies[i].initPosition.y,
            this.vehicle.wheelBodies[i].initPosition.z
          )
        )
        this.initWheelQuarternion.push(
          new CANNON.Quaternion(
            this.vehicle.wheelBodies[i].initQuaternion.x,
            this.vehicle.wheelBodies[i].initQuaternion.y,
            this.vehicle.wheelBodies[i].initQuaternion.z,
            this.vehicle.wheelBodies[i].initQuaternion.w
          )
        )
      }
      this.vehicle.wheelBodies[i].position = new Vec3(
        this.initWheelPos[i].x,
        this.initWheelPos[i].y,
        this.initWheelPos[i].z
      )
      this.vehicle.wheelBodies[i].quaternion = new CANNON.Quaternion(
        this.initWheelQuarternion[i].x,
        this.initWheelQuarternion[i].y,
        this.initWheelQuarternion[i].z,
        this.initWheelQuarternion[i].w
      )
      this.vehicle.wheelBodies[i].velocity.setZero()
      this.vehicle.wheelBodies[i].angularVelocity.setZero()
    }
    console.log('reset')
    this.hasBeenReset = true
  }
}
