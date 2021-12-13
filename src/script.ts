import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import Object3DGLTF from './interface/Object3DGLTF'
import spawnFourWall, { createWall } from './wall'
import createPlane, { PlaneSize } from './plane'
import spawnBall from './ball'
import createLight from './light'
import createChaseCam from './chaseCam'
import cannonDebugger from 'cannon-es-debugger'
const DEBUG = false

const scene = new THREE.Scene()
const planeSize: PlaneSize = { width: 157.5, height: 102 }

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

let ball: Object3DGLTF | null = null
let ballBody: CANNON.Body | null = null
const WALL_HEIGHT = 40
const light = createLight(scene, { x: 0, y: WALL_HEIGHT / 2, z: 0 })

createPlane(scene, world, planeSize)
spawnFourWall(scene, world, planeSize, WALL_HEIGHT)
createWall(
  scene,
  world,
  { x: planeSize.width, y: 1, z: planeSize.height },
  { x: 0, y: WALL_HEIGHT, z: 0 }
)
spawnBall(scene, world, (retBall: Object3DGLTF, retBallBody: CANNON.Body) => {
  ball = retBall
  ballBody = retBallBody
})

let octane: Object3DGLTF | null = null
let wheels: Object3DGLTF[] | null = [] as Object3DGLTF[]
let vehicle: CANNON.RigidVehicle | null = null

new GLTFLoader().load('/Car/scene.gltf', function (result) {
  const nodes = result.scene.children[0].children[0].children[0].children
  octane = nodes[0] as Object3DGLTF
  for (let i = 1; i < nodes.length; i++) {
    nodes[i].scale.set(2, 2, 2)
    nodes[i].castShadow = true
    wheels.push(nodes[i] as Object3DGLTF)
  }

  octane.scale.set(2, 2, 2)
  octane.castShadow = true
  octane.position.set(-3, 1, 0)
  scene.add(octane)
  octane.add(chaseCam)

  const octaneShape = new CANNON.Box(new CANNON.Vec3(1.1, 0.3125, 0.375))
  const octaneBody = new CANNON.Body({ mass: 1 })
  octaneBody.addShape(octaneShape, new CANNON.Vec3(0, 0.418, 0))
  octaneBody.position.set(
    octane.position.x,
    octane.position.y,
    octane.position.z
  )

  vehicle = new CANNON.RigidVehicle({
    chassisBody: octaneBody,
  })
  world.addBody(vehicle.chassisBody)

  const axis = new CANNON.Vec3(0, 0, 1)
  const down = new CANNON.Vec3(0, 0, -1)
  const quat = new CANNON.Quaternion()
  const translation = new CANNON.Vec3(0, 0, 0)
  quat.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2)

  wheels[0].position.set(-1.9, 0.75, 0.6)
  wheels[1].position.set(-1.9, 0.75, -0.6)
  wheels[2].position.set(-3.5, 0.75, 0.6)
  wheels[3].position.set(-3.5, 0.75, -0.6)

  for (let i = 0; i < wheels.length; i++) {
    scene.add(wheels[i])
    const wheelShape = new CANNON.Cylinder(0.35, 0.35, 0.35, 100)
    wheelShape.transformAllPoints(translation, quat)
    const wheelBody = new CANNON.Body({ mass: 1 })
    wheelBody.addShape(wheelShape, new CANNON.Vec3(0, 0, 0))
    wheelBody.position.set(
      wheels[i].position.x,
      wheels[i].position.y,
      wheels[i].position.z
    )
    vehicle.addWheel({
      body: wheelBody,
      position: new CANNON.Vec3(
        wheels[i].position.x - octane.position.x,
        wheels[i].position.y - octane.position.y,
        (wheels[i].position.z - octane.position.z) * (i <= 1 ? 1 : -1)
      ),
      axis,
      direction: down,
    })

    world.addBody(vehicle.wheelBodies[i])
    world.addConstraint(vehicle.constraints[i])
    vehicle.wheelBodies[i].angularDamping = 0.3
  }
})

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
  if (ball) {
    ball.position.set(
      ballBody.position.x,
      ballBody.position.y,
      ballBody.position.z
    )
    ball.quaternion.set(
      ballBody.quaternion.x,
      ballBody.quaternion.y,
      ballBody.quaternion.z,
      ballBody.quaternion.w
    )
  }

  if (octane && vehicle?.chassisBody) {
    octane.position.set(
      vehicle.chassisBody.position.x,
      vehicle.chassisBody.position.y,
      vehicle.chassisBody.position.z
    )
    octane.quaternion.set(
      vehicle.chassisBody.quaternion.x,
      vehicle.chassisBody.quaternion.y,
      vehicle.chassisBody.quaternion.z,
      vehicle.chassisBody.quaternion.w
    )
    octane.rotateX(-Math.PI / 2)
  }

  for (let i = 0; wheels && i < wheels.length; i++) {
    if (wheels[i] && vehicle?.wheelBodies?.[i]) {
      wheels[i].position.set(
        vehicle.wheelBodies[i].position.x,
        vehicle.wheelBodies[i].position.y,
        vehicle.wheelBodies[i].position.z
      )
      wheels[i].quaternion.set(
        vehicle.wheelBodies[i].quaternion.x,
        vehicle.wheelBodies[i].quaternion.y,
        vehicle.wheelBodies[i].quaternion.z,
        vehicle.wheelBodies[i].quaternion.w
      )
      wheels[i].rotateX(-Math.PI / 2)
    }
  }

  const maxSteerVal = Math.PI / 16
  const maxForce = 10
  if (vehicle) {
    vehicle.setSteeringValue(0, 0)
    vehicle.setSteeringValue(0, 1)
    vehicle.applyWheelForce(0, 2)
    vehicle.applyWheelForce(0, 3)
    if (keyMap['w'] || keyMap['ArrowUp']) {
      vehicle.applyWheelForce(
        Math.abs(vehicle.getWheelSpeed(2)) < 26.25 ? -maxForce : 0,
        2
      )
      vehicle.applyWheelForce(
        Math.abs(vehicle.getWheelSpeed(3)) < 26.25 ? -maxForce : 0,
        3
      )
    }
    if (keyMap['s'] || keyMap['ArrowDown']) {
      vehicle.applyWheelForce(
        Math.abs(vehicle.getWheelSpeed(2)) < 26.25 ? maxForce / 2 : 0,
        2
      )
      vehicle.applyWheelForce(
        Math.abs(vehicle.getWheelSpeed(3)) < 26.25 ? maxForce / 2 : 0,
        3
      )
    }
    if (keyMap['a'] || keyMap['ArrowLeft']) {
      vehicle.setSteeringValue(maxSteerVal, 0)
      vehicle.setSteeringValue(maxSteerVal, 1)
    }
    if (keyMap['d'] || keyMap['ArrowRight']) {
      vehicle.setSteeringValue(-maxSteerVal, 0)
      vehicle.setSteeringValue(-maxSteerVal, 1)
    }

    camera.lookAt(octane.position)
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
