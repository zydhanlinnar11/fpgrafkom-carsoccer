import * as CANNON from 'cannon-es'
import * as THREE from 'three'

export interface PlaneSize {
  width: number
  height: number
}

export default function createPlane(
  scene: THREE.Scene,
  world: CANNON.World,
  planeSize: PlaneSize
) {
  const groundMaterial = new CANNON.Material('groundMaterial')
  groundMaterial.friction = 0.25
  groundMaterial.restitution = 0.25

  const grassTexture = new THREE.TextureLoader().load('/grass.webp')
  grassTexture.wrapS = THREE.RepeatWrapping
  grassTexture.wrapT = THREE.RepeatWrapping
  grassTexture.repeat.set(32, 32)
  const groundGeometry: THREE.PlaneGeometry = new THREE.PlaneGeometry(
    planeSize.width,
    planeSize.height
  )
  const groundMesh: THREE.Mesh = new THREE.Mesh(
    groundGeometry,
    new THREE.MeshPhongMaterial({ color: 0xffffff, map: grassTexture })
  )
  groundMesh.rotateX(-Math.PI / 2)
  groundMesh.receiveShadow = true
  scene.add(groundMesh)
  const groundShape = new CANNON.Box(
    new CANNON.Vec3(planeSize.width / 2, 1, planeSize.height / 2)
  )
  const groundBody = new CANNON.Body({ mass: 0, material: groundMaterial })
  groundBody.addShape(groundShape)
  groundBody.position.set(0, -1, 0)
  world.addBody(groundBody)
}
