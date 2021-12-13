import * as THREE from 'three'

export default function createLight(scene: THREE.Scene) {
  const light = new THREE.PointLight(0xffffff, 1.4)
  light.position.set(0, 50, 0)
  light.castShadow = true
  scene.add(light)

  return light
}
