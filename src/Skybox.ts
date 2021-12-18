import * as THREE from 'three'

export default function Skybox(
    scene: THREE.Scene,
){
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
    "skybox/2/px.webp",
    "skybox/2/nx.webp",
    "skybox/2/py.webp",
    "skybox/2/ny.webp",
    "skybox/2/pz.webp",
    "skybox/2/nz.webp",
    ]);
    scene.background = texture;

    // Create cube render target
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128, {
        format: THREE.RGBFormat,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
    });
    
    // Create cube camera
    const cubeCamera = new THREE.CubeCamera(1, 100000, cubeRenderTarget);
    cubeCamera.position.set(0, 0, 0);
    scene.add(cubeCamera);
}