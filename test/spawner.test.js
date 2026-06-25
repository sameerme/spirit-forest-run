import { test } from 'node:test';
import assert from 'node:assert/strict';
import { airTime, maxGapPx, validateLevel, entitiesToSpawn } from '../src/game/spawner.js';

test('airTime and maxGapPx compute jump reach', () => {
  assert.ok(Math.abs(airTime(980, 2600) - 0.7538) < 1e-3);
  assert.ok(maxGapPx(220, 980, 2600) > 150);
});

test('validateLevel passes a well-formed level', () => {
  const level = {
    speed: 220, minGap: 400, length: 6000,
    entities: [
      { type: 'snake', worldX: 800 },
      { type: 'sphere', worldX: 1000 },
      { type: 'pit', worldX: 1300, tiles: 1 },
      { type: 'bat', worldX: 1800 },
    ],
  };
  const r = validateLevel(level, { jumpV: 980, gravity: 2600, tile: 60 });
  assert.deepEqual(r, { ok: true, errors: [] });
});

test('validateLevel flags too-small gaps, unsorted entities, and unjumpable pits', () => {
  const level = {
    speed: 220, minGap: 400, length: 0,
    entities: [
      { type: 'snake', worldX: 1000 },
      { type: 'bat', worldX: 900 },         // unsorted
      { type: 'pit', worldX: 1100, tiles: 9 }, // too wide
    ],
  };
  const r = validateLevel(level, { jumpV: 980, gravity: 2600, tile: 60 });
  assert.equal(r.ok, false);
  assert.ok(r.errors.length >= 2);
});

test('entitiesToSpawn returns entities up to spawnX and advances the index', () => {
  const ents = [{ worldX: 100 }, { worldX: 300 }, { worldX: 900 }];
  const r1 = entitiesToSpawn(ents, 350, 0);
  assert.deepEqual(r1.spawned.map((e) => e.worldX), [100, 300]);
  assert.equal(r1.nextIndex, 2);
  const r2 = entitiesToSpawn(ents, 1000, r1.nextIndex);
  assert.deepEqual(r2.spawned.map((e) => e.worldX), [900]);
  assert.equal(r2.nextIndex, 3);
});
