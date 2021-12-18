import * as THREE from 'three'

export default function createLight(
  scene: THREE.Scene,
  pos: { x: number; y: number; z: number }
) {
  const light = new THREE.PointLight(0xffffff, 0.4)
  light.position.set(pos.x, pos.y, pos.z)
  scene.add(light)

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.castShadow = true;
  dirLight.position.set(pos.x, pos.y/2, pos.z)
  dirLight.shadow.mapSize.width = 512;
  dirLight.shadow.mapSize.height = 512;

  dirLight.shadow.camera.near = 5;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -32;
  dirLight.shadow.camera.right = 32;
  dirLight.shadow.camera.top = 23;
  dirLight.shadow.camera.bottom = -23;
  scene.add(dirLight)
  
  const hemiLight = new THREE.HemisphereLight(0xffeeb1, 0x080820, 1);
  scene.add(hemiLight);

  return light
}
