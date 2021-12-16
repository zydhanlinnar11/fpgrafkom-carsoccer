import Object3DGLTF from '../interface/Object3DGLTF'
import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import Coordinate from '../interface/Coordinate'

export default class Goal {
  private goal: Object3DGLTF

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
}
