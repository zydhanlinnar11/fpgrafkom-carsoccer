import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import Object3DGLTF from './interface/Object3DGLTF'
import createWall from './wall'
import createPlane, { PlaneSize } from './plane'
import spawnBall from './ball'
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
let octaneRFConstraint: CANNON.HingeConstraint | null = null
let octaneLF: Object3DGLTF | null = null
let octaneLFBody: CANNON.Body | null = null
let octaneLFConstraint: CANNON.HingeConstraint | null = null
let octaneRB: Object3DGLTF | null = null
let octaneRBBody: CANNON.Body | null = null
let octaneRBConstraint: CANNON.HingeConstraint | null = null
let octaneLB: Object3DGLTF | null = null
let octaneLBBody: CANNON.Body | null = null
let octaneLBConstraint: CANNON.HingeConstraint | null = null

new GLTFLoader().load('/Car/scene.gltf', function (result) {
  const nodes = result.scene.children[0].children[0].children[0].children
  octane = nodes[0] as Object3DGLTF
  octaneRF = nodes[1] as Object3DGLTF
  octaneLF = nodes[2] as Object3DGLTF
  octaneRB = nodes[3] as Object3DGLTF
  octaneLB = nodes[4] as Object3DGLTF

  octane.scale.set(2, 2, 2)
  octane.castShadow = true
  octane.position.x = 3
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
  world.addBody(octaneBody)

  var axisWidth = 2.75
  const axis = new CANNON.Vec3(0, 0, 1)

  octaneRF.scale.set(2, 2, 2)
  octaneRF.castShadow = true
  octaneRF.position.x = 4.1
  octaneRF.position.y = 0.75
  octaneRF.position.z = 0.6
  scene.add(octaneRF)

  const octaneRFShape = new CANNON.Sphere(0.35)
  octaneRFBody = new CANNON.Body({ mass: 1 })
  octaneRFBody.addShape(octaneRFShape, new CANNON.Vec3(0, 0, 0))
  octaneRFBody.position.x = octaneRF.position.x
  octaneRFBody.position.y = octaneRF.position.y
  octaneRFBody.position.z = octaneRF.position.z
  world.addBody(octaneRFBody)

  octaneRFConstraint = new CANNON.HingeConstraint(octaneBody, octaneRFBody, {
    pivotA: new CANNON.Vec3(1.1, -0.25, 0.6),
    axisA: axis,
    pivotB: Vec3.ZERO,
    axisB: axis,
  })
  world.addConstraint(octaneRFConstraint)

  octaneLF.scale.set(2, 2, 2)
  octaneLF.castShadow = true
  octaneLF.position.x = 4.1
  octaneLF.position.y = 0.75
  octaneLF.position.z = -0.6
  scene.add(octaneLF)

  const octaneLFShape = new CANNON.Sphere(0.35)
  octaneLFBody = new CANNON.Body({ mass: 1 })
  octaneLFBody.addShape(octaneLFShape, new CANNON.Vec3(0, 0, 0))
  octaneLFBody.position.x = octaneLF.position.x
  octaneLFBody.position.y = octaneLF.position.y
  octaneLFBody.position.z = octaneLF.position.z
  world.addBody(octaneLFBody)

  octaneLFConstraint = new CANNON.HingeConstraint(octaneBody, octaneLFBody, {
    pivotA: new CANNON.Vec3(1.1, -0.25, -0.6),
    axisA: axis,
    pivotB: Vec3.ZERO,
    axisB: axis,
  })
  world.addConstraint(octaneLFConstraint)

  octaneRB.scale.set(2, 2, 2)
  octaneRB.castShadow = true
  octaneRB.position.x = 2.5
  octaneRB.position.y = 0.75
  octaneRB.position.z = 0.6
  scene.add(octaneRB)

  const octaneRBShape = new CANNON.Sphere(0.35)
  octaneRBBody = new CANNON.Body({ mass: 1 })
  octaneRBBody.addShape(octaneRBShape, new CANNON.Vec3(0, 0, 0))
  octaneRBBody.position.x = octaneRB.position.x
  octaneRBBody.position.y = octaneRB.position.y
  octaneRBBody.position.z = octaneRB.position.z
  world.addBody(octaneRBBody)

  octaneRBConstraint = new CANNON.HingeConstraint(octaneBody, octaneRBBody, {
    pivotA: new CANNON.Vec3(-0.5, -0.25, 0.6),
    axisA: axis,
    pivotB: Vec3.ZERO,
    axisB: axis,
  })
  world.addConstraint(octaneRBConstraint)

  octaneLB.scale.set(2, 2, 2)
  octaneLB.castShadow = true
  octaneLB.position.x = 2.5
  octaneLB.position.y = 0.75
  octaneLB.position.z = -0.6
  scene.add(octaneLB)

  const octaneLBShape = new CANNON.Sphere(0.35)
  octaneLBBody = new CANNON.Body({ mass: 1 })
  octaneLBBody.addShape(octaneLBShape, new CANNON.Vec3(0, 0, 0))
  octaneLBBody.position.x = octaneLB.position.x
  octaneLBBody.position.y = octaneLB.position.y
  octaneLBBody.position.z = octaneLB.position.z
  world.addBody(octaneLBBody)

  octaneLBConstraint = new CANNON.HingeConstraint(octaneBody, octaneLBBody, {
    pivotA: new CANNON.Vec3(-0.5, -0.25, -0.6),
    axisA: axis,
    pivotB: Vec3.ZERO,
    axisB: axis,
  })
  world.addConstraint(octaneLBConstraint)
})

const phongMaterial = new THREE.MeshPhongMaterial()

const wheelMaterial = new CANNON.Material('wheelMaterial')
wheelMaterial.friction = 0.25
wheelMaterial.restitution = 0.25

const carBodyGeometry: THREE.BoxGeometry = new THREE.BoxGeometry(1, 1, 2)
const carBodyMesh: THREE.Mesh = new THREE.Mesh(carBodyGeometry, phongMaterial)
carBodyMesh.position.y = 3
carBodyMesh.castShadow = true
scene.add(carBodyMesh)
// carBodyMesh.add(chaseCam)

const carBodyShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 1))
const carBody = new CANNON.Body({ mass: 10 })
carBody.addShape(carBodyShape)
carBody.position.x = carBodyMesh.position.x
carBody.position.y = carBodyMesh.position.y
carBody.position.z = carBodyMesh.position.z
world.addBody(carBody)

const wheelMass = 1

//front left wheel
const wheelLFGeometry: THREE.CylinderGeometry = new THREE.CylinderGeometry(
  0.33,
  0.33,
  0.2
)
wheelLFGeometry.rotateZ(Math.PI / 2)
const wheelLFMesh: THREE.Mesh = new THREE.Mesh(wheelLFGeometry, phongMaterial)
wheelLFMesh.position.x = -1
wheelLFMesh.position.y = 3
wheelLFMesh.position.z = -1
wheelLFMesh.castShadow = true
scene.add(wheelLFMesh)
const wheelLFShape = new CANNON.Sphere(0.33)
const wheelLFBody = new CANNON.Body({
  mass: wheelMass,
  material: wheelMaterial,
})
wheelLFBody.addShape(wheelLFShape)
wheelLFBody.position.x = wheelLFMesh.position.x
wheelLFBody.position.y = wheelLFMesh.position.y
wheelLFBody.position.z = wheelLFMesh.position.z
world.addBody(wheelLFBody)

//front right wheel
const wheelRFGeometry: THREE.CylinderGeometry = new THREE.CylinderGeometry(
  0.33,
  0.33,
  0.2
)
wheelRFGeometry.rotateZ(Math.PI / 2)
const wheelRFMesh: THREE.Mesh = new THREE.Mesh(wheelRFGeometry, phongMaterial)
wheelRFMesh.position.y = 3
wheelRFMesh.position.x = 1
wheelRFMesh.position.z = -1
wheelRFMesh.castShadow = true
scene.add(wheelRFMesh)
const wheelRFShape = new CANNON.Sphere(0.33)
const wheelRFBody = new CANNON.Body({
  mass: wheelMass,
  material: wheelMaterial,
})
wheelRFBody.addShape(wheelRFShape)
wheelRFBody.position.x = wheelRFMesh.position.x
wheelRFBody.position.y = wheelRFMesh.position.y
wheelRFBody.position.z = wheelRFMesh.position.z
world.addBody(wheelRFBody)

//back left wheel
const wheelLBGeometry: THREE.CylinderGeometry = new THREE.CylinderGeometry(
  0.4,
  0.4,
  0.33
)
wheelLBGeometry.rotateZ(Math.PI / 2)
const wheelLBMesh: THREE.Mesh = new THREE.Mesh(wheelLBGeometry, phongMaterial)
wheelLBMesh.position.y = 3
wheelLBMesh.position.x = -1
wheelLBMesh.position.z = 1
wheelLBMesh.castShadow = true
scene.add(wheelLBMesh)
const wheelLBShape = new CANNON.Sphere(0.4)
const wheelLBBody = new CANNON.Body({
  mass: wheelMass,
  material: wheelMaterial,
})
wheelLBBody.addShape(wheelLBShape)
wheelLBBody.position.x = wheelLBMesh.position.x
wheelLBBody.position.y = wheelLBMesh.position.y
wheelLBBody.position.z = wheelLBMesh.position.z
world.addBody(wheelLBBody)

//back right wheel
const wheelRBGeometry: THREE.CylinderGeometry = new THREE.CylinderGeometry(
  0.4,
  0.4,
  0.33
)
wheelRBGeometry.rotateZ(Math.PI / 2)
const wheelRBMesh: THREE.Mesh = new THREE.Mesh(wheelRBGeometry, phongMaterial)
wheelRBMesh.position.y = 3
wheelRBMesh.position.x = 1
wheelRBMesh.position.z = 1
wheelRBMesh.castShadow = true
scene.add(wheelRBMesh)
const wheelRBShape = new CANNON.Sphere(0.4)
const wheelRBBody = new CANNON.Body({
  mass: wheelMass,
  material: wheelMaterial,
})
wheelRBBody.addShape(wheelRBShape)
wheelRBBody.position.x = wheelRBMesh.position.x
wheelRBBody.position.y = wheelRBMesh.position.y
wheelRBBody.position.z = wheelRBMesh.position.z
world.addBody(wheelRBBody)

const leftFrontAxis = new CANNON.Vec3(1, 0, 0)
const rightFrontAxis = new CANNON.Vec3(1, 0, 0)
const leftBackAxis = new CANNON.Vec3(1, 0, 0)
const rightBackAxis = new CANNON.Vec3(1, 0, 0)

const constraintLF = new CANNON.HingeConstraint(carBody, wheelLFBody, {
  pivotA: new CANNON.Vec3(-1, -0.5, -1),
  axisA: leftFrontAxis,
  maxForce: 0.99,
})
world.addConstraint(constraintLF)
const constraintRF = new CANNON.HingeConstraint(carBody, wheelRFBody, {
  pivotA: new CANNON.Vec3(1, -0.5, -1),
  axisA: rightFrontAxis,
  maxForce: 0.99,
})
world.addConstraint(constraintRF)
const constraintLB = new CANNON.HingeConstraint(carBody, wheelLBBody, {
  pivotA: new CANNON.Vec3(-1, -0.5, 1),
  axisA: leftBackAxis,
  maxForce: 0.99,
})
world.addConstraint(constraintLB)
const constraintRB = new CANNON.HingeConstraint(carBody, wheelRBBody, {
  pivotA: new CANNON.Vec3(1, -0.5, 1),
  axisA: rightBackAxis,
  maxForce: 0.99,
})
world.addConstraint(constraintRB)

//rear wheel drive
constraintLB.enableMotor()
constraintRB.enableMotor()

const keyMap: { [id: string]: boolean } = {}
const onDocumentKey = (e: KeyboardEvent) => {
  keyMap[e.key] = e.type === 'keydown'
}

let forwardVelocity = 0
let rightVelocity = 0

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

  if (octane && octaneBody) {
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

  carBodyMesh.position.set(
    carBody.position.x,
    carBody.position.y,
    carBody.position.z
  )
  carBodyMesh.quaternion.set(
    carBody.quaternion.x,
    carBody.quaternion.y,
    carBody.quaternion.z,
    carBody.quaternion.w
  )

  wheelLFMesh.position.set(
    wheelLFBody.position.x,
    wheelLFBody.position.y,
    wheelLFBody.position.z
  )
  wheelLFMesh.quaternion.set(
    wheelLFBody.quaternion.x,
    wheelLFBody.quaternion.y,
    wheelLFBody.quaternion.z,
    wheelLFBody.quaternion.w
  )

  wheelRFMesh.position.set(
    wheelRFBody.position.x,
    wheelRFBody.position.y,
    wheelRFBody.position.z
  )
  wheelRFMesh.quaternion.set(
    wheelRFBody.quaternion.x,
    wheelRFBody.quaternion.y,
    wheelRFBody.quaternion.z,
    wheelRFBody.quaternion.w
  )

  wheelLBMesh.position.set(
    wheelLBBody.position.x,
    wheelLBBody.position.y,
    wheelLBBody.position.z
  )
  wheelLBMesh.quaternion.set(
    wheelLBBody.quaternion.x,
    wheelLBBody.quaternion.y,
    wheelLBBody.quaternion.z,
    wheelLBBody.quaternion.w
  )

  wheelRBMesh.position.set(
    wheelRBBody.position.x,
    wheelRBBody.position.y,
    wheelRBBody.position.z
  )
  wheelRBMesh.quaternion.set(
    wheelRBBody.quaternion.x,
    wheelRBBody.quaternion.y,
    wheelRBBody.quaternion.z,
    wheelRBBody.quaternion.w
  )

  thrusting = false
  octaneRFConstraint.axisA.set(0, 0, octaneRFConstraint.axisA.z)
  octaneLFConstraint.axisA.set(0, 0, octaneRFConstraint.axisA.z)
  if (keyMap['w'] || keyMap['ArrowUp']) {
    if (forwardVelocity < 100.0) forwardVelocity += 1
    octaneLBBody.torque.vadd(new Vec3(0, 0, -20), octaneLBBody.torque)
    octaneRBBody.torque.vadd(new Vec3(0, 0, -20), octaneRBBody.torque)
    thrusting = true
  }
  if (keyMap['s'] || keyMap['ArrowDown']) {
    if (forwardVelocity > -100.0) forwardVelocity -= 1
    thrusting = true
  }
  if (keyMap['a'] || keyMap['ArrowLeft']) {
    if (rightVelocity > -1.0) rightVelocity -= 0.1
    octaneRFConstraint.axisA.set(Math.PI / 4, 0, octaneRFConstraint.axisA.z)
    octaneLFConstraint.axisA.set(Math.PI / 4, 0, octaneRFConstraint.axisA.z)
  }
  if (keyMap['d'] || keyMap['ArrowRight']) {
    if (rightVelocity < 1.0) rightVelocity += 0.1
    octaneRFConstraint.axisA.set(-Math.PI / 4, 0, octaneRFConstraint.axisA.z)
    octaneLFConstraint.axisA.set(-Math.PI / 4, 0, octaneRFConstraint.axisA.z)
  }
  if (keyMap[' ']) {
    if (forwardVelocity > 0) {
      forwardVelocity -= 1
    }
    if (forwardVelocity < 0) {
      forwardVelocity += 1
    }
  }

  if (!thrusting) {
    //not going forward or backwards so gradually slow down
    if (forwardVelocity > 0) {
      forwardVelocity -= 0.25
    }
    if (forwardVelocity < 0) {
      forwardVelocity += 0.25
    }
  }

  constraintLB.setMotorSpeed(forwardVelocity)
  constraintRB.setMotorSpeed(forwardVelocity)
  constraintLF.axisA.z = rightVelocity
  constraintRF.axisA.z = rightVelocity

  camera.lookAt(octane.position)

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
