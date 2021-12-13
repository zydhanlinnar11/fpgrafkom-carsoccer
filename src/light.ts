import * as THREE from 'three'

export default function createLight(
  scene: THREE.Scene,
  pos: { x: number; y: number; z: number }
) {
  const light = new THREE.PointLight(0xffffff, 2)
  light.position.set(pos.x, pos.y, pos.z)
  light.castShadow = true
  scene.add(light)

  return light
}
