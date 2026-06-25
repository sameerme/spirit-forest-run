export function createCamera() {
  return {
    x: 0,
    update(dt, speed) { this.x += speed * dt; },
    reset() { this.x = 0; },
    parallax(layerFactor) { return this.x * layerFactor; },
  };
}
