import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import Object3DGLTF from './interface/Object3DGLTF'
import createWall from './wall'
import createPlane, { PlaneSize } from './plane'
import spawnBall from './ball'
import createLight from './light'
import createChaseCam from './chaseCam'
import { Vec3 } from 'cannon-es'

/**
 * Adds Three.js primitives into the scene where all the Cannon bodies and shapes are.
 * @class CannonDebugRenderer
 * @param {THREE.Scene} scene
 * @param {CANNON.World} world
 * @param {object} [options]
 */
// @ts-ignore
THREE.CannonDebugRenderer = function (scene, world, options) {
  options = options || {}

  this.scene = scene
  this.world = world

  this._meshes = []

  this._material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true,
  })
  this._sphereGeometry = new THREE.SphereGeometry(1)
  this._boxGeometry = new THREE.BoxGeometry(1, 1, 1)
  this._planeGeometry = new THREE.PlaneGeometry(10, 10, 10, 10)
  this._cylinderGeometry = new THREE.CylinderGeometry(1, 1, 10, 10)
}

// @ts-ignore
THREE.CannonDebugRenderer.prototype = {
  tmpVec0: new CANNON.Vec3(),
  tmpVec1: new CANNON.Vec3(),
  tmpVec2: new CANNON.Vec3(),
  tmpQuat0: new CANNON.Vec3(),

  update: function () {
    var bodies = this.world.bodies
    var meshes = this._meshes
    var shapeWorldPosition = this.tmpVec0
    var shapeWorldQuaternion = this.tmpQuat0

    var meshIndex = 0

    for (var i = 0; i !== bodies.length; i++) {
      var body = bodies[i]

      for (var j = 0; j !== body.shapes.length; j++) {
        var shape = body.shapes[j]

        this._updateMesh(meshIndex, body, shape)

        var mesh = meshes[meshIndex]

        if (mesh) {
          // Get world position
          body.quaternion.vmult(body.shapeOffsets[j], shapeWorldPosition)
          body.position.vadd(shapeWorldPosition, shapeWorldPosition)

          // Get world quaternion
          body.quaternion.mult(body.shapeOrientations[j], shapeWorldQuaternion)

          // Copy to meshes
          mesh.position.copy(shapeWorldPosition)
          mesh.quaternion.copy(shapeWorldQuaternion)
        }

        meshIndex++
      }
    }

    for (var i = meshIndex; i < meshes.length; i++) {
      var mesh = meshes[i]
      if (mesh) {
        this.scene.remove(mesh)
      }
    }

    meshes.length = meshIndex
  },

  // @ts-ignore
  _updateMesh: function (index, body, shape) {
    var mesh = this._meshes[index]
    if (!this._typeMatch(mesh, shape)) {
      if (mesh) {
        this.scene.remove(mesh)
      }
      mesh = this._meshes[index] = this._createMesh(shape)
    }
    this._scaleMesh(mesh, shape)
  },

  // @ts-ignore
  _typeMatch: function (mesh, shape) {
    if (!mesh) {
      return false
    }
    var geo = mesh.geometry
    return (
      (geo instanceof THREE.SphereGeometry && shape instanceof CANNON.Sphere) ||
      (geo instanceof THREE.BoxGeometry && shape instanceof CANNON.Box) ||
      (geo instanceof THREE.PlaneGeometry && shape instanceof CANNON.Plane) ||
      (geo.id === shape.geometryId &&
        shape instanceof CANNON.ConvexPolyhedron) ||
      (geo.id === shape.geometryId && shape instanceof CANNON.Trimesh) ||
      (geo.id === shape.geometryId && shape instanceof CANNON.Heightfield)
    )
  },

  // @ts-ignore
  _createMesh: function (shape) {
    var mesh
    var material = this._material

    switch (shape.type) {
      case CANNON.Shape.types.SPHERE:
        mesh = new THREE.Mesh(this._sphereGeometry, material)
        break

      case CANNON.Shape.types.BOX:
        mesh = new THREE.Mesh(this._boxGeometry, material)
        break

      case CANNON.Shape.types.PLANE:
        mesh = new THREE.Mesh(this._planeGeometry, material)
        break

      case CANNON.Shape.types.CONVEXPOLYHEDRON:
        // Create mesh
        // @ts-ignore
        var geo = new THREE.Geometry()

        // Add vertices
        for (var i = 0; i < shape.vertices.length; i++) {
          var v = shape.vertices[i]
          geo.vertices.push(new THREE.Vector3(v.x, v.y, v.z))
        }

        for (var i = 0; i < shape.faces.length; i++) {
          var face = shape.faces[i]

          // add triangles
          var a = face[0]
          for (var j = 1; j < face.length - 1; j++) {
            var b = face[j]
            var c = face[j + 1]
            // @ts-ignore
            geo.faces.push(new THREE.Face3(a, b, c))
          }
        }
        geo.computeBoundingSphere()
        geo.computeFaceNormals()

        mesh = new THREE.Mesh(geo, material)
        shape.geometryId = geo.id
        break

      case CANNON.Shape.types.TRIMESH:
        // @ts-ignore
        var geometry = new THREE.Geometry()
        var v0 = this.tmpVec0
        var v1 = this.tmpVec1
        var v2 = this.tmpVec2
        for (var i = 0; i < shape.indices.length / 3; i++) {
          shape.getTriangleVertices(i, v0, v1, v2)
          geometry.vertices.push(
            new THREE.Vector3(v0.x, v0.y, v0.z),
            new THREE.Vector3(v1.x, v1.y, v1.z),
            new THREE.Vector3(v2.x, v2.y, v2.z)
          )
          var j = geometry.vertices.length - 3
          // @ts-ignore
          geometry.faces.push(new THREE.Face3(j, j + 1, j + 2))
        }
        geometry.computeBoundingSphere()
        geometry.computeFaceNormals()
        mesh = new THREE.Mesh(geometry, material)
        shape.geometryId = geometry.id
        break

      case CANNON.Shape.types.HEIGHTFIELD:
        // @ts-ignore
        var geometry = new THREE.Geometry()

        var v0 = this.tmpVec0
        var v1 = this.tmpVec1
        var v2 = this.tmpVec2
        for (var xi = 0; xi < shape.data.length - 1; xi++) {
          for (var yi = 0; yi < shape.data[xi].length - 1; yi++) {
            for (var k = 0; k < 2; k++) {
              shape.getConvexTrianglePillar(xi, yi, k === 0)
              v0.copy(shape.pillarConvex.vertices[0])
              v1.copy(shape.pillarConvex.vertices[1])
              v2.copy(shape.pillarConvex.vertices[2])
              v0.vadd(shape.pillarOffset, v0)
              v1.vadd(shape.pillarOffset, v1)
              v2.vadd(shape.pillarOffset, v2)
              geometry.vertices.push(
                new THREE.Vector3(v0.x, v0.y, v0.z),
                new THREE.Vector3(v1.x, v1.y, v1.z),
                new THREE.Vector3(v2.x, v2.y, v2.z)
              )
              var i = geometry.vertices.length - 3
              // @ts-ignore
              geometry.faces.push(new THREE.Face3(i, i + 1, i + 2))
            }
          }
        }
        geometry.computeBoundingSphere()
        geometry.computeFaceNormals()
        mesh = new THREE.Mesh(geometry, material)
        shape.geometryId = geometry.id
        break
    }

    if (mesh) {
      this.scene.add(mesh)
    }

    return mesh
  },

  // @ts-ignore
  _scaleMesh: function (mesh, shape) {
    switch (shape.type) {
      case CANNON.Shape.types.SPHERE:
        var radius = shape.radius
        mesh.scale.set(radius, radius, radius)
        break

      case CANNON.Shape.types.BOX:
        mesh.scale.copy(shape.halfExtents)
        mesh.scale.multiplyScalar(2)
        break

      case CANNON.Shape.types.CONVEXPOLYHEDRON:
        mesh.scale.set(1, 1, 1)
        break

      case CANNON.Shape.types.TRIMESH:
        mesh.scale.copy(shape.scale)
        break

      case CANNON.Shape.types.HEIGHTFIELD:
        mesh.scale.set(1, 1, 1)
        break
    }
  },
}

const scene = new THREE.Scene()
const planeSize: PlaneSize = { width: 157.5, height: 102 }

const light = createLight(scene)

const camera = new THREE.PerspectiveCamera(
  75,
  (window.innerWidth - 40) / (window.innerHeight - 40),
  0.1,
  1000
)
const { chaseCam, chaseCamPivot } = createChaseCam(scene)

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('.webgl'),
})
renderer.setSize(window.innerWidth - 40, window.innerHeight - 40)
// renderer.shadowMap.enabled = true
// renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)

let ball: Object3DGLTF | null = null
let ballBody: CANNON.Body | null = null

createPlane(scene, world, planeSize)
createWall(scene, world, planeSize)
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
  quat.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)

  wheels[0].position.set(-1.9, 0.75, 0.6)
  wheels[1].position.set(-1.9, 0.75, -0.6)
  wheels[2].position.set(-3.5, 0.75, 0.6)
  wheels[3].position.set(-3.5, 0.75, -0.6)

  for (let i = 0; i < wheels.length; i++) {
    scene.add(wheels[i])
    const wheelShape = new CANNON.Cylinder(0.35, 0.35, 0.5, 100)
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
  camera.aspect = (window.innerWidth - 40) / (window.innerHeight - 40)
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth - 40, window.innerHeight - 40)
  render()
}

const clock = new THREE.Clock()
let delta

// @ts-ignore
const cannonDebugRenderer = new THREE.CannonDebugRenderer(scene, world)

const v = new THREE.Vector3()

function animate() {
  requestAnimationFrame(animate)

  // helper.update()

  delta = Math.min(clock.getDelta(), 0.1)
  world.step(delta)

  cannonDebugRenderer.update()

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
      vehicle.applyWheelForce(-maxForce, 2)
      vehicle.applyWheelForce(-maxForce, 3)
    }
    if (keyMap['s'] || keyMap['ArrowDown']) {
      vehicle.applyWheelForce(maxForce, 2)
      vehicle.applyWheelForce(maxForce, 3)
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
