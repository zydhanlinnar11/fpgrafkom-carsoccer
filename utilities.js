const movingCar = (control, car, key) => {
  switch (key) {
    case "ArrowUp":
      car.position.z -= 10;
      break;
    case "ArrowDown":
      car.position.z += 10;
      break;
    case "ArrowLeft":
      car.position.x -= 10;
      break;
    case "ArrowRight":
      car.position.x += 10;
      break;
  }
};
