import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import Object3DGLTF from './interface/Object3DGLTF'
import createWall from './wall'
import createPlane, { PlaneSize } from './plane'
import spawnBall from './ball'

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

const light = new THREE.PointLight(0xffffff, 1.4)
light.position.set(0, 50, 0)
scene.add(light)
light.castShadow = true

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
const chaseCam = new THREE.Object3D()
chaseCam.position.set(3, 0, 0)
const chaseCamPivot = new THREE.Object3D()
chaseCamPivot.position.set(-8, 0, 4)
chaseCam.add(chaseCamPivot)
scene.add(chaseCam)

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('.webgl'),
})
renderer.setSize(window.innerWidth, window.innerHeight)
// renderer.shadowMap.enabled = true
// renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)

//ground

let ball: Object3DGLTF | null = null
let ballBody: CANNON.Body | null = null

createPlane(scene, world, planeSize)
createWall(scene, world, planeSize)
spawnBall(scene, world, (retBall: Object3DGLTF, retBallBody: CANNON.Body) => {
  ball = retBall
  ballBody = retBallBody
})

let octane: Object3DGLTF | null = null
let octaneBody: CANNON.Body | null = null
let octaneRF: Object3DGLTF | null = null
let octaneRFBody: CANNON.Body | null = null
let octaneLF: Object3DGLTF | null = null
let octaneLFBody: CANNON.Body | null = null
let octaneRB: Object3DGLTF | null = null
let octaneRBBody: CANNON.Body | null = null
let octaneLB: Object3DGLTF | null = null
let octaneLBBody: CANNON.Body | null = null
let vehicle: CANNON.RigidVehicle | null = null

new GLTFLoader().load('/Car/scene.gltf', function (result) {
  const nodes = result.scene.children[0].children[0].children[0].children
  octane = nodes[0] as Object3DGLTF
  octaneRF = nodes[1] as Object3DGLTF
  octaneLF = nodes[2] as Object3DGLTF
  octaneRB = nodes[3] as Object3DGLTF
  octaneLB = nodes[4] as Object3DGLTF

  octane.scale.set(2, 2, 2)
  octane.castShadow = true
  octane.position.x = -3
  octane.position.y = 1
  octane.position.z = 0
  scene.add(octane)
  octane.add(chaseCam)

  const octaneShape = new CANNON.Box(new CANNON.Vec3(1.1, 0.3125, 0.375))
  octaneBody = new CANNON.Body({ mass: 1 })
  octaneBody.addShape(octaneShape, new CANNON.Vec3(0, 0.418, 0))
  octaneBody.position.x = octane.position.x
  octaneBody.position.y = octane.position.y
  octaneBody.position.z = octane.position.z

  vehicle = new CANNON.RigidVehicle({
    chassisBody: octaneBody,
  })
  // vehicle.addToWorld(world)
  world.addBody(vehicle.chassisBody)

  var axisWidth = 2.75
  const axis = new CANNON.Vec3(0, 0, 1)

  octaneRF.scale.set(2, 2, 2)
  octaneRF.castShadow = true
  octaneRF.position.x = -1.9
  octaneRF.position.y = 0.75
  octaneRF.position.z = 0.6
  scene.add(octaneRF)
  const down = new CANNON.Vec3(0, 0, -1)

  const quat = new CANNON.Quaternion()
  const translation = new CANNON.Vec3(0, 0, 0)
  quat.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)

  const octaneRFShape = new CANNON.Cylinder(0.35, 0.35, 0.5, 100)
  octaneRFShape.transformAllPoints(translation, quat)
  octaneRFBody = new CANNON.Body({ mass: 1 })
  octaneRFBody.addShape(octaneRFShape, new CANNON.Vec3(0, 0, 0))
  octaneRFBody.position.x = octaneRF.position.x
  octaneRFBody.position.y = octaneRF.position.y
  octaneRFBody.position.z = octaneRF.position.z
  vehicle.addWheel({
    body: octaneRFBody,
    position: new CANNON.Vec3(1.1, -0.25, 0.6),
    axis: new CANNON.Vec3(0, 0, 1),
    direction: down,
  })

  world.addBody(vehicle.wheelBodies[0])
  world.addConstraint(vehicle.constraints[0])

  octaneLF.scale.set(2, 2, 2)
  octaneLF.castShadow = true
  octaneLF.position.x = -1.9
  octaneLF.position.y = 0.75
  octaneLF.position.z = -0.6
  scene.add(octaneLF)

  const octaneLFShape = new CANNON.Cylinder(0.35, 0.35, 0.5, 100)
  octaneLFShape.transformAllPoints(translation, quat)
  octaneLFBody = new CANNON.Body({ mass: 1 })
  octaneLFBody.addShape(octaneLFShape, new CANNON.Vec3(0, 0, 0))
  octaneLFBody.position.x = octaneLF.position.x
  octaneLFBody.position.y = octaneLF.position.y
  octaneLFBody.position.z = octaneLF.position.z
  vehicle.addWheel({
    body: octaneLFBody,
    position: new CANNON.Vec3(1.1, -0.25, -0.6),
    axis: axis,
    direction: down,
  })

  world.addBody(vehicle.wheelBodies[1])
  world.addConstraint(vehicle.constraints[1])

  octaneRB.scale.set(2, 2, 2)
  octaneRB.castShadow = true
  octaneRB.position.x = -3.5
  octaneRB.position.y = 0.75
  octaneRB.position.z = 0.6
  scene.add(octaneRB)

  const octaneRBShape = new CANNON.Cylinder(0.35, 0.35, 0.5, 100)
  octaneRBShape.transformAllPoints(translation, quat)
  octaneRBBody = new CANNON.Body({ mass: 1 })
  octaneRBBody.addShape(octaneRBShape, new CANNON.Vec3(0, 0, 0))
  octaneRBBody.position.x = octaneRB.position.x
  octaneRBBody.position.y = octaneRB.position.y
  octaneRBBody.position.z = octaneRB.position.z
  vehicle.addWheel({
    body: octaneRBBody,
    position: new CANNON.Vec3(-0.5, -0.25, 0.6),
    axis: new CANNON.Vec3(0, 0, 1),
    direction: down,
  })

  world.addBody(vehicle.wheelBodies[2])
  world.addConstraint(vehicle.constraints[2])

  octaneLB.scale.set(2, 2, 2)
  octaneLB.castShadow = true
  octaneLB.position.x = -3.5
  octaneLB.position.y = 0.75
  octaneLB.position.z = -0.6
  scene.add(octaneLB)

  const octaneLBShape = new CANNON.Cylinder(0.35, 0.35, 0.5, 100)
  octaneLBShape.transformAllPoints(translation, quat)
  octaneLBBody = new CANNON.Body({ mass: 1 })
  octaneLBBody.addShape(octaneLBShape, new CANNON.Vec3(0, 0, 0))
  octaneLBBody.position.x = octaneLB.position.x
  octaneLBBody.position.y = octaneLB.position.y
  octaneLBBody.position.z = octaneLB.position.z
  vehicle.addWheel({
    body: octaneLBBody,
    position: new CANNON.Vec3(-0.5, -0.25, -0.6),
    axis: axis,
    direction: down,
  })

  world.addBody(vehicle.wheelBodies[3])
  world.addConstraint(vehicle.constraints[3])
  for (var i = 0; i < vehicle.wheelBodies.length; i++) {
    vehicle.wheelBodies[i].angularDamping = 0.1
  }
})

const keyMap: { [id: string]: boolean } = {}
const onDocumentKey = (e: KeyboardEvent) => {
  keyMap[e.key] = e.type === 'keydown'
}

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

// @ts-ignore
const cannonDebugRenderer = new THREE.CannonDebugRenderer(scene, world)

const v = new THREE.Vector3()
let thrusting = false

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

  if (octane && vehicle.chassisBody) {
    octane.position.set(
      octaneBody.position.x,
      octaneBody.position.y,
      octaneBody.position.z
    )
    octane.quaternion.set(
      octaneBody.quaternion.x,
      octaneBody.quaternion.y,
      octaneBody.quaternion.z,
      octaneBody.quaternion.w
    )
    octane.rotateX(-Math.PI / 2)
  }

  if (octaneRF && octaneRFBody) {
    octaneRF.position.set(
      octaneRFBody.position.x,
      octaneRFBody.position.y,
      octaneRFBody.position.z
    )
    octaneRF.quaternion.set(
      octaneRFBody.quaternion.x,
      octaneRFBody.quaternion.y,
      octaneRFBody.quaternion.z,
      octaneRFBody.quaternion.w
    )
    octaneRF.rotateX(-Math.PI / 2)
  }

  if (octaneLF && octaneLFBody) {
    octaneLF.position.set(
      octaneLFBody.position.x,
      octaneLFBody.position.y,
      octaneLFBody.position.z
    )
    octaneLF.quaternion.set(
      octaneLFBody.quaternion.x,
      octaneLFBody.quaternion.y,
      octaneLFBody.quaternion.z,
      octaneLFBody.quaternion.w
    )
    octaneLF.rotateX(-Math.PI / 2)
  }

  if (octaneRB && octaneRBBody) {
    octaneRB.position.set(
      octaneRBBody.position.x,
      octaneRBBody.position.y,
      octaneRBBody.position.z
    )
    octaneRB.quaternion.set(
      octaneRBBody.quaternion.x,
      octaneRBBody.quaternion.y,
      octaneRBBody.quaternion.z,
      octaneRBBody.quaternion.w
    )
    octaneRB.rotateX(-Math.PI / 2)
  }

  if (octaneLB && octaneLBBody) {
    octaneLB.position.set(
      octaneLBBody.position.x,
      octaneLBBody.position.y,
      octaneLBBody.position.z
    )
    octaneLB.quaternion.set(
      octaneLBBody.quaternion.x,
      octaneLBBody.quaternion.y,
      octaneLBBody.quaternion.z,
      octaneLBBody.quaternion.w
    )
    octaneLB.rotateX(-Math.PI / 2)
  }

  thrusting = false
  const maxSteerVal = Math.PI / 16
  const maxForce = 10
  if (vehicle) {
    vehicle.setSteeringValue(0, 0)
    vehicle.setSteeringValue(0, 1)
    vehicle.applyWheelForce(0, 2)
    vehicle.applyWheelForce(0, 3)
  }
  // octaneRFConstraint.axisA.set(0, 0, octaneRFConstraint.axisA.z)
  // octaneLFConstraint.axisA.set(0, 0, octaneRFConstraint.axisA.z)
  if (keyMap['w'] || keyMap['ArrowUp']) {
    thrusting = true
    if (vehicle) {
      vehicle.applyWheelForce(-maxForce, 2)
      vehicle.applyWheelForce(-maxForce, 3)
      // let torque = new Vec3()
      // vehicle.wheelAxes[0].scale(100, torque)
      // vehicle.wheelBodies[0].vectorToWorldFrame(torque, torque)

      // vehicle.wheelBodies[0].torque.vadd(torque, vehicle.wheelBodies[0].torque)
      // console.log(torque)
    }
  }
  if (keyMap['s'] || keyMap['ArrowDown']) {
    thrusting = true
    if (vehicle) {
      vehicle.applyWheelForce(maxForce, 2)
      vehicle.applyWheelForce(maxForce, 3)
    }
  }
  if (keyMap['a'] || keyMap['ArrowLeft']) {
    if (vehicle) {
      vehicle.setSteeringValue(maxSteerVal, 0)
      vehicle.setSteeringValue(maxSteerVal, 1)
    }
  }
  if (keyMap['d'] || keyMap['ArrowRight']) {
    if (vehicle) {
      vehicle.setSteeringValue(-maxSteerVal, 0)
      vehicle.setSteeringValue(-maxSteerVal, 1)
    }
  }
  if (keyMap[' ']) {
  }

  if (!thrusting) {
    //not going forward or backwards so gradually slow down
  }

  if (octane) camera.lookAt(octane.position)

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
