import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeScore, loadProgress, saveProgress } from '../src/game/scoring.js';
import { SPHERE_SCORE, CLEAR_BONUS, HEART_BONUS } from '../src/constants.js';

function fakeStore() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _m: m };
}

test('computeScore sums distance/10, spheres, level and heart bonuses', () => {
  const s = computeScore({ distance: 1000, spheres: 3, hearts: 2, levelsCleared: 1 });
  assert.equal(s, 100 + 3 * SPHERE_SCORE + CLEAR_BONUS + 2 * HEART_BONUS);
});

test('loadProgress returns defaults when empty', () => {
  assert.deepEqual(loadProgress(fakeStore()), { high: 0, level: 1 });
});

test('saveProgress then loadProgress round-trips', () => {
  const store = fakeStore();
  saveProgress(store, { high: 4200, level: 3 });
  assert.deepEqual(loadProgress(store), { high: 4200, level: 3 });
});
