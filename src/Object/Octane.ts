import Object3DGLTF from '../interface/Object3DGLTF'
import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import Coordinate from '../interface/Coordinate'

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

  private constructor(
    scene: THREE.Scene,
    world: CANNON.World,
    nodes: THREE.Object3D<THREE.Event>[],
    { x, y, z }: Coordinate,
    chaseCam?: THREE.Object3D<THREE.Event>
  ) {
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
        this.wheelOffsets[i][0] + x,
        this.wheelOffsets[i][1] + y,
        this.wheelOffsets[i][2] + z
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
        position: new CANNON.Vec3(...this.wheelOffsets[i]),
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
    chaseCam?: THREE.Object3D<THREE.Event>
  ) {
    const result = await new GLTFLoader().loadAsync('/Octane/scene.gltf')
    const nodes = result.scene.children[0].children[0].children[0].children
    return new Octane(scene, world, nodes, position, chaseCam)
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

    for (let i = 0; i < this.wheels.length; i++) {
      if (this.wheels[i] && this.vehicle?.wheelBodies?.[i]) {
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
    this.vehicle.applyWheelForce(
      Math.abs(this.vehicle.getWheelSpeed(2)) < this.maxSpeed
        ? -this.maxForce
        : 0,
      2
    )
    this.vehicle.applyWheelForce(
      Math.abs(this.vehicle.getWheelSpeed(3)) < this.maxSpeed
        ? -this.maxForce
        : 0,
      3
    )
  }

  reverse() {
    this.vehicle.applyWheelForce(
      Math.abs(this.vehicle.getWheelSpeed(2)) < this.maxSpeed
        ? this.maxForce / 2
        : 0,
      2
    )
    this.vehicle.applyWheelForce(
      Math.abs(this.vehicle.getWheelSpeed(3)) < this.maxSpeed
        ? this.maxForce / 2
        : 0,
      3
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
}
