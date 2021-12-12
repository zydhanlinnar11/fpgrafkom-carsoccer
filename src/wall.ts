import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { PlaneSize } from './plane'

export default function createWall(
  scene: THREE.Scene,
  world: CANNON.World,
  planeSize: PlaneSize
) {
  const wallMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff })
  const WALL_HEIGHT = 35
  const WALL_THICKNESS = 1

  // front back wall
  const WALL_SIZE1 = [planeSize.width, WALL_HEIGHT, WALL_THICKNESS]
  const wall1Geometry: THREE.PlaneGeometry = new THREE.BoxGeometry(
    ...WALL_SIZE1
  )
  const wall1Mesh: THREE.Mesh = new THREE.Mesh(wall1Geometry, wallMaterial)
  wall1Mesh.position.z = -planeSize.height / 2
  scene.add(wall1Mesh)
  const wall1Shape = new CANNON.Box(
    new CANNON.Vec3(...WALL_SIZE1.map((size) => size / 2))
  )
  const wall1 = new CANNON.Body({ mass: 0 })
  wall1.addShape(wall1Shape)
  wall1.position.x = wall1Mesh.position.x
  wall1.position.y = wall1Mesh.position.y
  wall1.position.z = wall1Mesh.position.z
  world.addBody(wall1)

  const wall2Geometry: THREE.PlaneGeometry = new THREE.BoxGeometry(
    ...WALL_SIZE1
  )
  const wall2Mesh: THREE.Mesh = new THREE.Mesh(wall2Geometry, wallMaterial)
  wall2Mesh.position.z = planeSize.height / 2
  scene.add(wall2Mesh)
  const wall2Shape = new CANNON.Box(
    new CANNON.Vec3(...WALL_SIZE1.map((size) => size / 2))
  )
  const wall2 = new CANNON.Body({ mass: 0 })
  wall2.addShape(wall2Shape)
  wall2.position.x = wall2Mesh.position.x
  wall2.position.y = wall2Mesh.position.y
  wall2.position.z = wall2Mesh.position.z
  wall2Mesh.rotateY(Math.PI)
  world.addBody(wall2)

  // left right wall
  const WALL_SIZE2 = [WALL_THICKNESS, WALL_HEIGHT, planeSize.height]

  const wall3Geometry: THREE.PlaneGeometry = new THREE.BoxGeometry(
    ...WALL_SIZE2
  )
  const wall3Mesh: THREE.Mesh = new THREE.Mesh(wall3Geometry, wallMaterial)
  wall3Mesh.position.x = planeSize.width / 2
  scene.add(wall3Mesh)
  const wall3Shape = new CANNON.Box(
    new CANNON.Vec3(...WALL_SIZE2.map((size) => size / 2))
  )
  const wall3 = new CANNON.Body({ mass: 0 })
  wall3.addShape(wall3Shape)
  wall3.position.x = wall3Mesh.position.x
  wall3.position.y = wall3Mesh.position.y
  wall3.position.z = wall3Mesh.position.z
  world.addBody(wall3)

  const wall4Geometry: THREE.PlaneGeometry = new THREE.BoxGeometry(
    ...WALL_SIZE2
  )
  const wall4Mesh: THREE.Mesh = new THREE.Mesh(wall4Geometry, wallMaterial)
  wall4Mesh.position.x = -planeSize.width / 2
  scene.add(wall4Mesh)
  const wall4Shape = new CANNON.Box(
    new CANNON.Vec3(...WALL_SIZE2.map((size) => size / 2))
  )
  const wall4 = new CANNON.Body({ mass: 0 })
  wall4.addShape(wall4Shape)
  wall4.position.x = wall4Mesh.position.x
  wall4.position.y = wall4Mesh.position.y
  wall4.position.z = wall4Mesh.position.z
  world.addBody(wall4)
}
