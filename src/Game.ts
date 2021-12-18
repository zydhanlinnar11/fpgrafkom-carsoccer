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
import Skybox from './Skybox'
import { hideCreateRoomMenu, hideJoinRoomMenu, showMainMenu } from './script'
import { Socket } from 'socket.io-client'
const DEBUG = false

interface NetworkPositionInfo {
  score: {
    [player: string]: number
  }
  position: {
    p1: {
      chassis: THREE.Vector3
      wheels: THREE.Vector3[]
    }
    p2: {
      chassis: THREE.Vector3
      wheels: THREE.Vector3[]
    }
    ball: THREE.Vector3
  }
  quarternion: {
    p1: {
      chassis: THREE.Quaternion
      wheels: THREE.Quaternion[]
    }
    p2: {
      chassis: THREE.Quaternion
      wheels: THREE.Quaternion[]
    }
    ball: THREE.Quaternion
  }
}

export interface GameOption {
  soloMode?: boolean
  socket?: Socket
  isFirstPlayer?: boolean
  roomID?: string
}

export default class Game {
  private static sizeFactor = 0.6
  private static planeSize: PlaneSize = {
    width: 105 * Game.sizeFactor,
    height: 68 * Game.sizeFactor,
  }
  private static WALL_HEIGHT = 40
  private keyMap: { [id: string]: boolean }
  private remoteKeyMap: {
    player?: 'p1' | 'p2'
    keyMap: { [id: string]: boolean }
  }
  private remotePos: NetworkPositionInfo

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
  private loopAnimNum?: number
  private options?: GameOption = { soloMode: false }
  private gameStart = false
  private serverTick: number = 0

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
    player2Goal?: Goal,
    options?: GameOption
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
    this.remoteKeyMap = { keyMap: {} }
    this.clock = new THREE.Clock()
    this.remotePos = null

    this.options = options
    if (this.options?.socket)
      this.options.socket.on('receive-input', this.remoteInputHandler)
    if (this.options?.socket)
      this.options.socket.on('receive-pos', this.remoteUpdatePosHandler)
    document.addEventListener('keydown', this.inputHandler, false)
    document.addEventListener('keyup', this.inputHandler, false)
    localStorage.clear()
    Game.updateScore('p1', Game.getScore('p1'))
    Game.updateScore('p2', Game.getScore('p2'))
    setInterval(() => {
      this.serverTick++
    }, 1)
  }

  static async createGameInstance(
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera,
    options?: GameOption
  ) {
    const world = new CANNON.World()
    const scene = new THREE.Scene()
    Skybox(scene)
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

    // Set Audio
    const audioListener = new THREE.AudioListener()
    camera.add(audioListener)

    const player1Car = await Octane.createCarInstance(
      scene,
      world,
      {
        x: -6,
        y: 1,
        z: 0,
      },
      audioListener,
      options.soloMode || options.isFirstPlayer ? chaseCam : null
    )
    const player2Car = options?.soloMode
      ? null
      : await Octane.createCarInstance(
          scene,
          world,
          {
            x: 6,
            y: 1,
            z: 0,
          },
          audioListener,
          options.soloMode || options.isFirstPlayer ? null : chaseCam,
          true
        )

    const ballCollisionHandler = (collidedWith: CANNON.Body, ball: Ball) => {
      if (
        player2Goal.getBodyID() !== collidedWith.id &&
        player1Goal.getBodyID() !== collidedWith.id
      )
        return
      if (player2Goal.getBodyID() === collidedWith.id)
        Game.updateScore('p1', Game.getScore('p1') + 1)
      if (player1Goal.getBodyID() === collidedWith.id)
        Game.updateScore('p2', Game.getScore('p2') + 1)
      player1Car.resetPosition()
      if (player2Car) player2Car.resetPosition()
      ball.resetPosition()
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

    world.gravity.set(0, -9.82, 0)
    createLight(scene, { x: 0, y: Game.WALL_HEIGHT / 2, z: 0 })
    createPlane(scene, world, Game.planeSize)
    spawnFourWall(scene, world, Game.planeSize, Game.WALL_HEIGHT)
    // createWall(
    //   scene,
    //   world,
    //   { x: Game.planeSize.width, y: 1, z: Game.planeSize.height },
    //   { x: 0, y: Game.WALL_HEIGHT, z: 0 }
    // )

    return new Game(
      renderer,
      scene,
      world,
      chaseCamPivot,
      ball,
      player1Car,
      camera,
      player2Car,
      player1Goal,
      player2Goal,
      options
    )
  }

  static updateScore(player: 'p1' | 'p2', score: number) {
    document.getElementById(`${player}-score`).innerText = JSON.stringify(score)
    localStorage.setItem(`${player}-score`, JSON.stringify(score))
  }

  static getScore(player: 'p1' | 'p2') {
    return (JSON.parse(localStorage.getItem(`${player}-score`)) as number) ?? 0
  }

  inputHandler = (e: KeyboardEvent) => {
    // console.log(this.options.roomID)
    this.keyMap[e.key] = e.type === 'keydown'
    if (!this.options?.soloMode && this.options?.isFirstPlayer)
      this.options?.socket.emit(
        'update-input',
        this.options?.roomID,
        JSON.stringify({ player: 'p1', keyMap: this.keyMap })
      )
    else if (!this.options?.soloMode && !this.options?.isFirstPlayer)
      this.options?.socket.emit(
        'update-input',
        this.options?.roomID,
        JSON.stringify({ player: 'p2', keyMap: this.keyMap })
      )
  }

  remoteInputHandler = (remoteKeyMapStringified: string) => {
    this.remoteKeyMap = JSON.parse(remoteKeyMapStringified)
  }

  remoteUpdatePosHandler = (remotePos: NetworkPositionInfo) => {
    this.remotePos = remotePos
    // console.log(JSON.parse(remotePos))
    Game.updateScore('p1', this.remotePos.score.p1)
    Game.updateScore('p2', this.remotePos.score.p2)
    if (!this.options?.soloMode && this.player2Car) {
      this.player1Car.updatePositionFromNetwork(this.remotePos.position.p1)
      // this.player1Car.updateQuarternionFromNetwork(
      //   this.remotePos.quarternion.p1
      // )
      this.player2Car.updatePositionFromNetwork(this.remotePos.position.p2)
      this.ball.updatePositionFromNetwork(this.remotePos.position.ball)
      // this.ball.updateQuarternionFromNetwork(this.remotePos.quarternion.ball)
      console.log(this.remotePos.quarternion.ball)

      // this.player2Car.updateQuarternionFromNetwork(
      //   this.remotePos.quarternion.p2
      // )
    }
  }

  animate() {
    this.loopAnimNum = requestAnimationFrame(() => this.animate())

    if (DEBUG) cannonDebugger(this.scene, this.world.bodies)

    const v = new THREE.Vector3()

    this.delta = Math.min(this.clock.getDelta(), 0.1)
    this.world.step(this.delta)

    // Copy coordinates from Cannon to Three.js
    this.ball.update()
    const locallyControlledCar =
      this.options?.soloMode || this.options?.isFirstPlayer
        ? this.player1Car
        : this.player2Car
    this.player1Car.update()
    const remotelyControlledCar = this.options?.soloMode
      ? null
      : this.options?.isFirstPlayer
      ? this.player2Car
      : this.player1Car
    this.player1Car.update()
    if (this.player2Car) this.player2Car.update()

    locallyControlledCar.setZeroTorque()
    this.player1Car.playEngineDriveOff()
    if (this.keyMap['w'] || this.keyMap['ArrowUp']){
      locallyControlledCar.accelerate()
      this.player1Car.playEngineDriveForward()
    }
    if (this.keyMap['s'] || this.keyMap['ArrowDown']){
      locallyControlledCar.reverse()
      this.player1Car.playEngineDriveBackward()
    }
    if (this.keyMap['a'] || this.keyMap['ArrowLeft'])
      locallyControlledCar.turnLeft()
    if (this.keyMap['d'] || this.keyMap['ArrowRight'])
      locallyControlledCar.turnRight()
    if (this.keyMap['r']) locallyControlledCar.resetPosition()
    if (this.keyMap['Escape'] && this.loopAnimNum) {
      this.exitGame()
      this.player1Car.soundOff()
    }

    if(!this.gameStart){
      this.player1Car.playStartup()
      this.player1Car.playEngineOn()
      this.gameStart = true
    }

    if (
      remotelyControlledCar &&
      this.options?.isFirstPlayer &&
      this.remoteKeyMap.player !== 'p1'
    ) {
      // console.log(this.remoteKeyMap)
      // console.log(this.remoteKeyMap?.keyMap?.['w'])
      if (this.remoteKeyMap.keyMap['w'] || this.remoteKeyMap.keyMap['ArrowUp'])
        remotelyControlledCar.accelerate()
      if (
        this.remoteKeyMap.keyMap['s'] ||
        this.remoteKeyMap.keyMap['ArrowDown']
      )
        remotelyControlledCar.reverse()
      if (
        this.remoteKeyMap.keyMap['a'] ||
        this.remoteKeyMap.keyMap['ArrowLeft']
      )
        remotelyControlledCar.turnLeft()
      if (
        this.remoteKeyMap.keyMap['d'] ||
        this.remoteKeyMap.keyMap['ArrowRight']
      )
        remotelyControlledCar.turnRight()
      if (this.remoteKeyMap.keyMap['r']) remotelyControlledCar.resetPosition()
      if (this.remoteKeyMap.keyMap['Escape'] && this.loopAnimNum)
        this.exitGame()
      const posInfo: NetworkPositionInfo = {
        score: {
          p1: Game.getScore('p1'),
          p2: Game.getScore('p2'),
        },
        position: {
          p1: {
            chassis: locallyControlledCar.getChassis().position,
            wheels: locallyControlledCar
              .getWheels()
              .map((wheel) => wheel.position),
          },
          p2: {
            chassis: remotelyControlledCar.getChassis().position,
            wheels: remotelyControlledCar
              .getWheels()
              .map((wheel) => wheel.position),
          },
          ball: this.ball.getBall().position,
        },
        quarternion: {
          p1: {
            chassis: locallyControlledCar.getChassis().quaternion,
            wheels: locallyControlledCar
              .getWheels()
              .map((wheel) => wheel.quaternion),
          },
          p2: {
            chassis: remotelyControlledCar.getChassis().quaternion,
            wheels: remotelyControlledCar
              .getWheels()
              .map((wheel) => wheel.quaternion),
          },
          ball: this.ball.getBall().quaternion,
        },
      }
      if (this.options?.socket && this.serverTick >= 10) {
        this.serverTick = 0
        console.log('10ms')
        this.options.socket.emit('update-pos', this.options?.roomID, posInfo)
      }
    }

    this.camera.lookAt(locallyControlledCar.getChassis().position)

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

  exitGame() {
    cancelAnimationFrame(this.loopAnimNum)
    document.getElementById('scoreboard-section').classList.add('hidden')
    document.getElementById('scoreboard-section').classList.remove('flex')

    document.getElementById('game-canvas').classList.add('hidden')
    document.getElementById('game-canvas').classList.remove('flex')
    hideCreateRoomMenu()
    hideJoinRoomMenu()

    showMainMenu()
  }
}
