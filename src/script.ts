import * as THREE from 'three'
import Game, { GameOption } from './Game'
import './styles.css'
import { io } from 'socket.io-client'
import { PRODUCTION } from './Config'

const launchGame = async (options?: GameOption) => {
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )

  const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('.webgl'),
  })
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)
  window.addEventListener('resize', onWindowResize, false)
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  document.getElementById('scoreboard-section').classList.remove('hidden')
  document.getElementById('scoreboard-section').classList.add('flex')

  document.getElementById('game-canvas').classList.remove('hidden')
  document.getElementById('game-canvas').classList.add('flex')

  const game = await Game.createGameInstance(renderer, camera, options)

  game.animate()
}

export const hideMainMenu = () => {
  document.getElementById('main-menu-section').classList.remove('flex')
  document.getElementById('main-menu-section').classList.add('hidden')
}

export const showMainMenu = () => {
  document.getElementById('main-menu-section').classList.remove('hidden')
  document.getElementById('main-menu-section').classList.add('flex')
}

export const hideCreateRoomMenu = () => {
  document.getElementById('create-room-section').classList.remove('flex')
  document.getElementById('create-room-section').classList.add('hidden')
}

export const showCreateRoomMenu = () => {
  document.getElementById('create-room-section').classList.remove('hidden')
  document.getElementById('create-room-section').classList.add('flex')
}

function hideMenuAndLaunchGame(options?: GameOption) {
  showMainMenu()

  launchGame(options)
}

document.getElementById('solo-button').addEventListener('click', () => {
  hideMenuAndLaunchGame({ soloMode: true })
})

const socket = io(
  PRODUCTION ? 'https://api.fp-grafkom.zydhan.xyz' : 'http://10.11.11.11:3000'
)

let waitingForFriend = false

document
  .getElementById('cancel-room-creation-button')
  .addEventListener('click', () => {
    socket.emit(
      'delete-room',
      document.getElementById('created-room-id').innerText,
      () => {
        hideCreateRoomMenu()
        showMainMenu()
        waitingForFriend = false
      }
    )
  })

socket.on('somebody-joined', (roomID: string) => {
  if (!waitingForFriend) return
  hideMenuAndLaunchGame({
    soloMode: false,
    socket,
    isFirstPlayer: true,
    roomID,
  })
})

document.getElementById('create-room-button').addEventListener('click', () => {
  if (socket.disconnected) socket.connect()
  socket.emit('create-room', (roomID: string) => {
    waitingForFriend = true
    document.getElementById('created-room-id').innerText = roomID
    hideMainMenu()
    showCreateRoomMenu()
  })
})

document.getElementById('copy-room-id').addEventListener('click', () => {
  navigator.clipboard.writeText(
    document.getElementById('created-room-id').innerText
  )
})

export const hideJoinRoomMenu = () => {
  document.getElementById('join-room-section').classList.remove('flex')
  document.getElementById('join-room-section').classList.add('hidden')
}

export const showJoinRoomMenu = () => {
  document.getElementById('join-room-section').classList.remove('hidden')
  document.getElementById('join-room-section').classList.add('flex')
}

document.getElementById('join-room-button').addEventListener('click', () => {
  hideMainMenu()
  showJoinRoomMenu()
})

document
  .getElementById('cancel-room-join-button')
  .addEventListener('click', () => {
    document.getElementById('join-room-error-msg').innerText = ''
    hideJoinRoomMenu()
    showMainMenu()
  })

document
  .getElementById('join-room-section')
  .addEventListener('submit', (e: SubmitEvent) => {
    e.preventDefault()
    document.getElementById('join-room-error-msg').innerText = ''
    const roomID = (
      document.getElementById('room-id-input') as HTMLInputElement
    ).value
    socket.emit('join-room', roomID, (status: boolean, message: string) => {
      if (!status) {
        document.getElementById('join-room-error-msg').innerText = message
        return
      }
      hideMenuAndLaunchGame({
        soloMode: false,
        socket,
        isFirstPlayer: false,
        roomID,
      })
      console.log(status, message)
    })
  })

export const hideHowToPlayMenu = () => {
  document.getElementById('how-to-play-section').classList.remove('flex')
  document.getElementById('how-to-play-section').classList.add('hidden')
}

export const showHowToPlayMenu = () => {
  document.getElementById('how-to-play-section').classList.remove('hidden')
  document.getElementById('how-to-play-section').classList.add('flex')
}

document.getElementById('how-to-play-button').addEventListener('click', () => {
  hideMainMenu()
  showHowToPlayMenu()
})

document
  .getElementById('back-to-menu-button-from-how-to')
  .addEventListener('click', () => {
    hideHowToPlayMenu()
    showMainMenu()
  })
