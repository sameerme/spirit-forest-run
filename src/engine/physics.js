export function applyGravity(vy, dt, gravity) {
  return vy + gravity * dt;
}

export function integrate(value, velocity, dt) {
  return value + velocity * dt;
}

export function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
