import { createSprite } from '../engine/sprite.js';
import { TILE, GROUND_TOP } from '../constants.js';

export function createSnake(worldX, amp = 0, freq = 1) {
  const y = GROUND_TOP - 50;
  // amp > 0: rears up and down from the ground (anchor 'ground').
  return { type: 'snake', worldX, y, baseY: y, amp, freq, t: 0, anchor: 'ground', w: 96, h: 50, anim: createSprite(4, 8) };
}
export function createBat(worldX, y, amp = 0, freq = 1) {
  // amp > 0: bobs up and down around its lane while flying.
  return { type: 'bat', worldX, y, baseY: y, amp, freq, t: 0, w: 70, h: 46, anim: createSprite(4, 10) };
}
export function createSpirit(worldX, baseY, amp = 90, freq = 0.9) {
  return { type: 'spirit', worldX, y: baseY, baseY, amp, freq, t: 0, w: 84, h: 104, anim: createSprite(4, 6) };
}
export function createSphere(worldX, y) {
  return { type: 'sphere', worldX, y, w: 52, h: 52, taken: false, anim: createSprite(4, 8) };
}
export function createFire(worldX, y) {
  // Fury fire pickup; bobs gently. Collected only when the energy bar is full.
  return { type: 'fury', worldX, y, baseY: y, amp: 12, freq: 0.9, t: 0, w: 52, h: 60, taken: false };
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
  if (e.amp) {
    e.t += dt;
    if (e.anchor === 'ground') {
      // rear up from the ground and back, never dipping below it
      const rise = (1 - Math.cos(e.t * e.freq * Math.PI * 2)) / 2; // 0..1
      e.y = e.baseY - rise * e.amp;
    } else {
      e.y = e.baseY + Math.sin(e.t * e.freq * Math.PI * 2) * e.amp;
    }
  }
}
