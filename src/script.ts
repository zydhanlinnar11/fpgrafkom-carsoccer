import * as THREE from 'three'
import Game, { GameOption } from './Game'
import './styles.css'

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

  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)
  window.addEventListener('resize', onWindowResize, false)
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  const game = await Game.createGameInstance(renderer, camera, options)

  game.animate()
}

function hideMenuAndLaunchGame(options?: GameOption) {
  document.getElementById('scoreboard-section').classList.remove('hidden')
  document.getElementById('scoreboard-section').classList.add('flex')

  document.getElementById('game-canvas').classList.remove('hidden')
  document.getElementById('game-canvas').classList.add('flex')

  document.getElementById('main-menu-section').classList.remove('flex')
  document.getElementById('main-menu-section').classList.add('hidden')

  launchGame(options)
}

document.getElementById('solo-button').addEventListener('click', () => {
  hideMenuAndLaunchGame({ soloMode: true })
})
