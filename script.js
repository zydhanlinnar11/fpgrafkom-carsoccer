let camera,
  scene,
  renderer,
  sizes,
  orbitControls,
  ground,
  lighting = [],
  model = [],
  test = false;

const init = () => {
  //========== Canvas
  canvas = document.querySelector("canvas.webgl");

  //========== Buat Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbffffb);

  //========= Pengaturan Camera
  sizes = {
    width: 0.9 * window.innerWidth,
    height: 0.9 * window.innerHeight,
  };
  camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 1, 4000);
  camera.position.set(600, 550, 0);

  //========= Orbit Controls
  orbitControls = new THREE.OrbitControls(camera, canvas);
  orbitControls.target.set(0, 5, 0);

  //========= Create Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  //========== Create Lighting
  const hemiLight = new THREE.HemisphereLight(0xffeeb1, 0x080820, 1.2);
  lighting.push(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.y = 500;
  dirLight.position.x = 300;
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 512;

  dirLight.shadow.camera.near = 100;
  dirLight.shadow.camera.far = 1200;

  dirLight.shadow.camera.left = -1600;
  dirLight.shadow.camera.right = 1600;
  dirLight.shadow.camera.top = 800;
  dirLight.shadow.camera.bottom = -800;
  lighting.push(dirLight);

  lighting.forEach((light) => {
    scene.add(light);
  });

  //========== Create Geometry
  const textureLoader = new THREE.TextureLoader();
  const grassTexture = textureLoader.load("texture/grass.jpg");
  ground = new THREE.Mesh(
    new THREE.BoxGeometry(1600, 3200, 20),
    new THREE.MeshStandardMaterial({
      color: 0x0c4f1f,
      side: THREE.DoubleSide,
      map: grassTexture,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -12;
  ground.receiveShadow = true;
  scene.add(ground);

  //========== Load Model
  let loader = new THREE.GLTFLoader();
  loader.load("model/Car/scene.gltf", (gltf) => {
    const car = gltf.scene.children[0];
    car.traverse((child) => {
      if (child.isMesh) {
        child.material.metalness = 0;
        child.castShadow = true;
      }
    });
    model.push(car);
    scene.add(car);
  });
  loader.load("model/Goal/scene.gltf", (gltf) => {
    let goal1 = gltf.scene.children[0];
    goal1.position.z = 1400;
    goal1.position.x = -250;
    goal1.traverse((child) => {
      if (child.isMesh) {
        child.material.metalness = 0;
        child.castShadow = true;
      }
    });
    model.push(goal1);
    scene.add(goal1);
  });
  loader.load("model/Goal/scene.gltf", (gltf) => {
    let goal2 = gltf.scene.children[0];
    goal2.position.z = -1400;
    goal2.position.x = 250;
    goal2.rotation.z = Math.PI;
    goal2.traverse((child) => {
      if (child.isMesh) {
        child.material.metalness = 0;
        child.castShadow = true;
      }
    });
    model.push(goal2);
    scene.add(goal2);
  });
  loader.load("model/Ball/scene.gltf", (gltf) => {
    let ball = gltf.scene.children[0];
    ball.scale.set(55, 55, 55);
    ball.position.z = 100;
    ball.position.y = 57;
    ball.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
      }
    });
    model.push(ball);
    scene.add(ball);
  });

  // ================== Interactive
  // Sizing canvas
  window.addEventListener("resize", () => {
    // Update sizes
    sizes.width = 0.9 * window.innerWidth;
    sizes.height = 0.9 * window.innerHeight;

    // Update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

  document.addEventListener("keydown", (e) => {
    e.preventDefault();
    movingCar(orbitControls, model[3], e.key);
  });

  mainLoop();
};

const mainLoop = () => {
  renderer.render(scene, camera);
  orbitControls.update();
  requestAnimationFrame(mainLoop);
};

init();
