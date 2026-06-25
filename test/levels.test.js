import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, buildLevel, mulberry32 } from '../src/game/levels/levels.js';
import { validateLevel } from '../src/game/spawner.js';
import { JUMP_V, GRAVITY, TILE } from '../src/constants.js';

test('mulberry32 is deterministic for a seed', () => {
  const a = mulberry32(42); const b = mulberry32(42);
  assert.equal(a(), b());
  assert.equal(a(), b());
});

test('there are 5 levels with monotonic difficulty', () => {
  assert.equal(LEVELS.length, 5);
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(LEVELS[i].speed >= LEVELS[i - 1].speed, 'speed non-decreasing');
    assert.ok(LEVELS[i].minGap <= LEVELS[i - 1].minGap, 'minGap non-increasing');
  }
});

test('every built level validates (gaps + jumpable pits) and has a goal', () => {
  for (const lvl of LEVELS) {
    const r = validateLevel(lvl, { jumpV: JUMP_V, gravity: GRAVITY, tile: TILE });
    assert.ok(r.ok, `level ${lvl.id} invalid: ${r.errors.join('; ')}`);
    assert.ok(lvl.goalX > 0 && lvl.goalX < lvl.length);
    assert.ok(lvl.entities.length > 5);
  }
});

test('buildLevel is deterministic (same def -> same entities)', () => {
  const def = { id: 9, speed: 240, minGap: 420, length: 6000, spirits: true, maxBats: 2, maxPit: 2, seed: 7, sphereChance: 0.5 };
  const a = buildLevel(def); const b = buildLevel(def);
  assert.deepEqual(a.entities, b.entities);
});

test('level 1 has no spirits, level 5 does', () => {
  assert.equal(LEVELS[0].entities.some((e) => e.type === 'spirit'), false);
  assert.equal(LEVELS[4].entities.some((e) => e.type === 'spirit'), true);
});
