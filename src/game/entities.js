import { createSprite } from '../engine/sprite.js';
import { TILE, GROUND_TOP } from '../constants.js';

export function createSnake(worldX) {
  return { type: 'snake', worldX, y: GROUND_TOP - 50, w: 96, h: 50, anim: createSprite(4, 8) };
}
export function createBat(worldX, y) {
  return { type: 'bat', worldX, y, w: 70, h: 46, anim: createSprite(4, 10) };
}
export function createSpirit(worldX, baseY, amp = 90, freq = 0.9) {
  return { type: 'spirit', worldX, y: baseY, baseY, amp, freq, t: 0, w: 84, h: 104, anim: createSprite(4, 6) };
}
export function createSphere(worldX, y) {
  return { type: 'sphere', worldX, y, w: 52, h: 52, taken: false, anim: createSprite(4, 8) };
}
export function createPit(worldX, tiles) {
  return { type: 'pit', worldX, tiles, w: tiles * TILE, h: TILE * 2 };
}
export function createPlatform(worldX, y) {
  return { type: 'platform', worldX, y, w: 180, h: 28 };
}

export function worldBox(e) {
  if (e.type === 'pit') return { x: e.worldX, y: GROUND_TOP, w: e.w, h: e.h };
  return { x: e.worldX, y: e.y, w: e.w, h: e.h };
}

export function updateEntity(e, dt) {
  if (e.anim) e.anim.update(dt);
  if (e.type === 'spirit') {
    e.t += dt;
    e.y = e.baseY + Math.sin(e.t * e.freq * Math.PI * 2) * e.amp;
  }
}
