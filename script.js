let camera,
  scene,
  renderer,
  sizes,
  orbitControls,
  ground,
  lighting = [];

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
  camera.position.set(0, 150, 200);

  //========= Orbit Controls
  orbitControls = new THREE.OrbitControls(camera, canvas);
  orbitControls.target.set(0, 5, 0);

  //========= Buat Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
  });
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  //========== Create Lighting
  const dirLight1 = new THREE.DirectionalLight(0xffffff, 8);
  dirLight1.position.y = 1000;
  dirLight1.position.x = 10000;
  const dirLight2 = new THREE.DirectionalLight(0xffffff, 20);
  dirLight2.position.y = 1600;
  // ambLight1.position.y = 30;
  lighting.push(dirLight1);
  lighting.push(dirLight2);

  lighting.forEach((light) => {
    scene.add(light);
  });
  // scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  //========== Create Geometry
  ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1600, 1600),
    new THREE.MeshBasicMaterial({
      color: 0x348c31,
      side: THREE.DoubleSide,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2;
  scene.add(ground);

  let loader = new THREE.GLTFLoader();
  loader.load("model/Car1/scene.gltf", (gltf) => {
    scene.add(gltf.scene);
  });
  loader.load("model/Goal/scene.gltf", (gltf) => {
    gltf.scene.position.z = 850;
    gltf.scene.position.x = -250;
    scene.add(gltf.scene);
  });
  loader.load("model/Goal/scene.gltf", (gltf) => {
    gltf.scene.position.z = -850;
    gltf.scene.position.x = -250;
    scene.add(gltf.scene);
  });
  loader.load("model/Ball/scene.gltf", (gltf) => {
    gltf.scene.scale.set(0.25, 0.25, 0.25);
    gltf.scene.position.z = 100;
    gltf.scene.position.y = 55;
    scene.add(gltf.scene);
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

  mainLoop();
};

const mainLoop = () => {
  renderer.render(scene, camera);
  orbitControls.update();
  window.requestAnimationFrame(mainLoop);
};

init();
