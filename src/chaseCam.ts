import * as THREE from 'three'

export default function createChaseCam(scene: THREE.Scene) {
  const chaseCam = new THREE.Object3D()
  chaseCam.position.set(3, 0, 0)
  const chaseCamPivot = new THREE.Object3D()
  chaseCamPivot.position.set(-8, 0, 4)
  chaseCam.add(chaseCamPivot)
  scene.add(chaseCam)
  return { chaseCam, chaseCamPivot }
}
