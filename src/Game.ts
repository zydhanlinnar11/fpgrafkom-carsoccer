import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import spawnFourWall, { createWall } from './wall'
import createPlane, { PlaneSize } from './plane'
import Ball from './Object/Ball'
import createLight from './light'
import createChaseCam from './chaseCam'
import cannonDebugger from 'cannon-es-debugger'
import Octane from './Object/Octane'
const DEBUG = false

const loadGame = async () => {
  const scene = new THREE.Scene()
  const sizeFactor = 0.6
  const planeSize: PlaneSize = {
    width: 105 * sizeFactor,
    height: 68 * sizeFactor,
  }

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  const { chaseCam, chaseCamPivot } = createChaseCam(scene)

  const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('.webgl'),
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  const world = new CANNON.World()
  world.gravity.set(0, -9.82, 0)

  const WALL_HEIGHT = 40
  createLight(scene, { x: 0, y: WALL_HEIGHT / 2, z: 0 })
  createPlane(scene, world, planeSize)
  spawnFourWall(scene, world, planeSize, WALL_HEIGHT)
  createWall(
    scene,
    world,
    { x: planeSize.width, y: 1, z: planeSize.height },
    { x: 0, y: WALL_HEIGHT, z: 0 }
  )
  const ball = await Ball.createBallInstance(scene, world, {
    x: 0,
    y: 1.5,
    z: 0,
  })

  const vehicle = await Octane.createCarInstance(
    scene,
    world,
    {
      x: -3,
      y: 1,
      z: 0,
    },
    chaseCam
  )
  const keyMap: { [id: string]: boolean } = {}
  const onDocumentKey = (e: KeyboardEvent) =>
    (keyMap[e.key] = e.type === 'keydown')

  document.addEventListener('keydown', onDocumentKey, false)
  document.addEventListener('keyup', onDocumentKey, false)

  window.addEventListener('resize', onWindowResize, false)
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
  }

  const clock = new THREE.Clock()
  let delta

  if (DEBUG) cannonDebugger(scene, world.bodies)

  const v = new THREE.Vector3()

  function animate() {
    requestAnimationFrame(animate)

    delta = Math.min(clock.getDelta(), 0.1)
    world.step(delta)

    // Copy coordinates from Cannon to Three.js
    ball.update()
    vehicle.update()
    if (vehicle) {
      vehicle.setZeroTorque()
      if (keyMap['w'] || keyMap['ArrowUp']) vehicle.accelerate()
      if (keyMap['s'] || keyMap['ArrowDown']) vehicle.reverse()
      if (keyMap['a'] || keyMap['ArrowLeft']) vehicle.turnLeft()
      if (keyMap['d'] || keyMap['ArrowRight']) vehicle.turnRight()
      camera.lookAt(vehicle.getChassis().position)
    }

    chaseCamPivot.getWorldPosition(v)
    if (v.y < 1) {
      v.y = 1
    }
    camera.position.lerpVectors(camera.position, v, 0.05)

    render()
  }

  function render() {
    renderer.render(scene, camera)
  }

  animate()
}

export default loadGame
