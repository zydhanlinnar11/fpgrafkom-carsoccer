import Object3DGLTF from '../interface/Object3DGLTF'
import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import Coordinate from '../interface/Coordinate'
import { Vec3 } from 'cannon-es'
import Ball from './Ball'

export default class Goal {
  private static BACK_GOAL_DIMENSION = [0.01, 5, 13.5]
  private static SIDE_GOAL_DIMENSION = [3, Goal.BACK_GOAL_DIMENSION[1], 0.1]
  private goal: Object3DGLTF
  private backGoalBody: CANNON.Body

  constructor(
    scene: THREE.Scene,
    world: CANNON.World,
    goalGLTF: Object3DGLTF,
    { x, y, z }: Coordinate,
    rotation: number
  ) {
    this.goal = goalGLTF
    this.goal.scale.set(0.0275, 0.0275, 0.0275)
    this.goal.rotateZ(rotation)
    this.goal.position.set(x, y, z)
    scene.add(this.goal)

    const backGoalGeometry: THREE.BoxGeometry = new THREE.BoxGeometry(
      ...Goal.BACK_GOAL_DIMENSION
    )
    const backGoalMesh: THREE.Mesh = new THREE.Mesh(
      backGoalGeometry,
      new THREE.MeshPhongMaterial({ opacity: 0, transparent: true })
    )
    backGoalMesh.position.set(
      x + 0.5 * (rotation > 0 ? 1 : -1),
      y + 2.5,
      z - 6.9 * (rotation > 0 ? 1 : -1)
    )
    this.backGoalBody = new CANNON.Body()
    this.backGoalBody.addShape(
      new CANNON.Box(new Vec3(...Goal.BACK_GOAL_DIMENSION.map((d) => d / 2)))
    )
    this.backGoalBody.position.set(
      backGoalMesh.position.x,
      backGoalMesh.position.y,
      backGoalMesh.position.z
    )
    world.addBody(this.backGoalBody)
    scene.add(backGoalMesh)

    const sideGoal1Geometry: THREE.BoxGeometry = new THREE.BoxGeometry(
      ...Goal.SIDE_GOAL_DIMENSION
    )
    const sideGoal1Mesh: THREE.Mesh = new THREE.Mesh(
      sideGoal1Geometry,
      new THREE.MeshPhongMaterial({ opacity: 0, transparent: true })
    )
    sideGoal1Mesh.position.set(x - 0.5 * (rotation > 0 ? 1 : -1), y + 2.5, z)
    const sideGoal1Body = new CANNON.Body()
    sideGoal1Body.addShape(
      new CANNON.Box(new Vec3(...Goal.SIDE_GOAL_DIMENSION.map((d) => d / 2)))
    )
    sideGoal1Body.position.set(
      sideGoal1Mesh.position.x,
      sideGoal1Mesh.position.y,
      sideGoal1Mesh.position.z
    )

    world.addBody(sideGoal1Body)
    scene.add(sideGoal1Mesh)

    const sideGoal2Geometry: THREE.BoxGeometry = new THREE.BoxGeometry(
      ...Goal.SIDE_GOAL_DIMENSION
    )
    const sideGoal2Mesh: THREE.Mesh = new THREE.Mesh(
      sideGoal2Geometry,
      new THREE.MeshPhongMaterial({ opacity: 0, transparent: true })
    )
    sideGoal2Mesh.position.set(
      x - 0.5 * (rotation > 0 ? 1 : -1),
      y + 2.5,
      z - 13.9 * (rotation > 0 ? 1 : -1)
    )
    const sideGoal2Body = new CANNON.Body()
    sideGoal2Body.addShape(
      new CANNON.Box(new Vec3(...Goal.SIDE_GOAL_DIMENSION.map((d) => d / 2)))
    )
    sideGoal2Body.position.set(
      sideGoal2Mesh.position.x,
      sideGoal2Mesh.position.y,
      sideGoal2Mesh.position.z
    )

    world.addBody(sideGoal2Body)
    scene.add(sideGoal2Mesh)
  }

  static async createGoalInstance(
    scene: THREE.Scene,
    world: CANNON.World,
    position: Coordinate,
    rotation: number
  ) {
    const result = await new GLTFLoader().loadAsync('/Goal/scene.gltf')

    return new Goal(
      scene,
      world,
      result.scene.children[0] as Object3DGLTF,
      position,
      rotation
    )
  }

  getBodyID() {
    return this.backGoalBody.id
  }
}
