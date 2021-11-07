let camera, scene, renderer, sizes, orbitControls, ground;

const init = () => {
  //========== Canvas
  canvas = document.querySelector("canvas.webgl");

  //========== Buat Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xbffffb, 0.003);
  scene.background = new THREE.Color(0xbffffb);

  //========= Pengaturan Camera
  sizes = {
    width: 0.9 * window.innerWidth,
    height: 0.9 * window.innerHeight,
  };
  camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 1, 2000);
  camera.position.set(0, 10, 30);

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
  scene.add(new THREE.DirectionalLight(0xffffff, 0.8));
  scene.add(new THREE.AmbientLight(0xd1fff0, 0.4));

  //========== Create Geometry
  ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshPhongMaterial({
      color: 0x262424,
      side: THREE.DoubleSide,
      shininess: 0,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2;
  scene.add(ground);

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
