import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import spawnFourWall, { createWall } from './wall'
import createPlane, { PlaneSize } from './plane'
import Ball from './Object/Ball'
import createLight from './light'
import createChaseCam from './chaseCam'
import cannonDebugger from 'cannon-es-debugger'
import Octane from './Object/Octane'
import Goal from './Object/Goal'
const DEBUG = false

export default class Game {
  private static sizeFactor = 0.6
  private static planeSize: PlaneSize = {
    width: 105 * Game.sizeFactor,
    height: 68 * Game.sizeFactor,
  }
  private static WALL_HEIGHT = 40
  private keyMap: { [id: string]: boolean }

  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private world: CANNON.World
  private chaseCamPivot: THREE.Object3D<THREE.Event>
  private ball: Ball
  private player1Car: Octane
  private player2Car: Octane
  private camera: THREE.Camera
  private clock: THREE.Clock
  private delta: number

  private constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    world: CANNON.World,
    chaseCamPivot: THREE.Object3D<THREE.Event>,
    ball: Ball,
    player1Car: Octane,
    camera: THREE.Camera,
    player2Car?: Octane,
    player1Goal?: Goal,
    player2Goal?: Goal
  ) {
    this.world = world
    this.renderer = renderer
    this.scene = scene
    this.chaseCamPivot = chaseCamPivot
    this.ball = ball
    this.player1Car = player1Car
    this.player2Car = player2Car
    this.camera = camera
    this.keyMap = {}
    this.clock = new THREE.Clock()
    localStorage.clear()
  }

  static async createGameInstance(
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera
  ) {
    const world = new CANNON.World()
    const scene = new THREE.Scene()
    const { chaseCam, chaseCamPivot } = createChaseCam(scene)
    const player1Goal = await Goal.createGoalInstance(
      scene,
      world,
      {
        x: -Game.planeSize.width / 2 + 4,
        y: 0,
        z: -7,
      },
      -Math.PI / 2
    )
    const player2Goal = await Goal.createGoalInstance(
      scene,
      world,
      {
        x: Game.planeSize.width / 2 - 4,
        y: 0,
        z: 7,
      },
      Math.PI / 2
    )

    const ballCollisionHandler = (collidedWith: CANNON.Body) => {
      if (
        player2Goal.getBodyID() !== collidedWith.id &&
        player1Goal.getBodyID() !== collidedWith.id
      )
        return
      if (player2Goal.getBodyID() === collidedWith.id) {
        let newScore = localStorage.getItem('p1-score') as unknown as number
        newScore++
        document.getElementById('p1-score').innerText = newScore.toString()
        localStorage.setItem('p1-score', newScore.toString())
      }
    }

    const ball = await Ball.createBallInstance(
      scene,
      world,
      {
        x: 0,
        y: 1.5,
        z: 0,
      },
      ballCollisionHandler
    )
    const player1Car = await Octane.createCarInstance(
      scene,
      world,
      {
        x: -6,
        y: 1,
        z: 0,
      },
      chaseCam
    )
    const player2Car = await Octane.createCarInstance(scene, world, {
      x: 6,
      y: 1,
      z: 0,
    })

    world.gravity.set(0, -9.82, 0)
    createLight(scene, { x: 0, y: Game.WALL_HEIGHT / 2, z: 0 })
    createPlane(scene, world, Game.planeSize)
    spawnFourWall(scene, world, Game.planeSize, Game.WALL_HEIGHT)
    createWall(
      scene,
      world,
      { x: Game.planeSize.width, y: 1, z: Game.planeSize.height },
      { x: 0, y: Game.WALL_HEIGHT, z: 0 }
    )

    return new Game(
      renderer,
      scene,
      world,
      chaseCamPivot,
      ball,
      player1Car,
      camera,
      player2Car
    )
  }

  inputHandler = (e: KeyboardEvent) => {
    this.keyMap[e.key] = e.type === 'keydown'
  }

  animate() {
    requestAnimationFrame(() => this.animate())
    document.addEventListener('keydown', this.inputHandler, false)
    document.addEventListener('keyup', this.inputHandler, false)

    if (DEBUG) cannonDebugger(this.scene, this.world.bodies)

    const v = new THREE.Vector3()

    this.delta = Math.min(this.clock.getDelta(), 0.1)
    this.world.step(this.delta)

    // Copy coordinates from Cannon to Three.js
    this.ball.update()
    this.player1Car.update()
    this.player2Car.update()
    if (this.player1Car) {
      this.player1Car.setZeroTorque()
      if (this.keyMap['w'] || this.keyMap['ArrowUp'])
        this.player1Car.accelerate()
      if (this.keyMap['s'] || this.keyMap['ArrowDown'])
        this.player1Car.reverse()
      if (this.keyMap['a'] || this.keyMap['ArrowLeft'])
        this.player1Car.turnLeft()
      if (this.keyMap['d'] || this.keyMap['ArrowRight'])
        this.player1Car.turnRight()
      this.camera.lookAt(this.player1Car.getChassis().position)
    }

    this.chaseCamPivot.getWorldPosition(v)
    if (v.y < 1) {
      v.y = 1
    }
    this.camera.position.lerpVectors(this.camera.position, v, 0.05)

    this.render()
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }
}
