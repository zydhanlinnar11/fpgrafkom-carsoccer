import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { PlaneSize } from './plane'

export function createWall(
  scene: THREE.Scene,
  world: CANNON.World,
  size: { x: number; y: number; z: number },
  pos: { x: number; y: number; z: number },
  color: THREE.ColorRepresentation = 0xffffff
) {
  const wallGeometry: THREE.PlaneGeometry = new THREE.BoxGeometry(
    size.x,
    size.y,
    size.z
  )
  const wallMesh: THREE.Mesh = new THREE.Mesh(
    wallGeometry,
    new THREE.MeshPhongMaterial({ color })
  )
  wallMesh.position.set(pos.x, pos.y, pos.z)
  const wall = new CANNON.Body({ mass: 0 })
  wall.addShape(
    new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2))
  )
  wall.position.set(pos.x, pos.y, pos.z)
  scene.add(wallMesh)
  world.addBody(wall)
}

export default function spawnWall(
  scene: THREE.Scene,
  world: CANNON.World,
  planeSize: PlaneSize,
  height: number
) {
  // front wall
  createWall(
    scene,
    world,
    { x: 1, y: height, z: planeSize.height },
    {
      x: planeSize.width / 2,
      y: height / 2,
      z: 0,
    }
  )

  // back wall
  createWall(
    scene,
    world,
    { x: 1, y: height, z: planeSize.height },
    {
      x: -planeSize.width / 2,
      y: height / 2,
      z: 0,
    }
  )

  // right
  createWall(
    scene,
    world,
    { x: planeSize.width, y: height, z: 1 },
    {
      x: 0,
      y: height / 2,
      z: planeSize.height / 2,
    }
  )

  // left
  createWall(
    scene,
    world,
    { x: planeSize.width, y: height, z: 1 },
    {
      x: 0,
      y: height / 2,
      z: -planeSize.height / 2,
    }
  )
}
