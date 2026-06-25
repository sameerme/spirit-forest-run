import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyGravity, integrate, aabbOverlap } from '../src/engine/physics.js';

test('applyGravity increases downward velocity by g*dt', () => {
  assert.equal(applyGravity(0, 0.5, 2000), 1000);
  assert.equal(applyGravity(-980, 0.1, 2600), -980 + 260);
});

test('integrate advances a value by velocity*dt', () => {
  assert.equal(integrate(100, -980, 0.1), 100 - 98);
});

test('aabbOverlap detects overlap and separation', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  assert.equal(aabbOverlap(a, { x: 5, y: 5, w: 10, h: 10 }), true);
  assert.equal(aabbOverlap(a, { x: 20, y: 0, w: 10, h: 10 }), false);
  assert.equal(aabbOverlap(a, { x: 10, y: 0, w: 10, h: 10 }), false); // touching edges = no overlap
});
