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

test('there are 15 levels with monotonic difficulty', () => {
  assert.equal(LEVELS.length, 15);
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(LEVELS[i].speed >= LEVELS[i - 1].speed, 'speed non-decreasing');
    assert.ok(LEVELS[i].minGap <= LEVELS[i - 1].minGap, 'minGap non-increasing');
    assert.ok(LEVELS[i].maxBats >= LEVELS[i - 1].maxBats, 'maxBats non-decreasing');
    assert.ok(LEVELS[i].maxPit >= LEVELS[i - 1].maxPit, 'maxPit non-decreasing');
  }
});

test('vertical movement ramps in on later levels (bats bob, snakes rear)', () => {
  assert.equal(LEVELS[0].batAmp, 0, 'no bat movement on level 1');
  assert.ok(LEVELS[14].batAmp > 0, 'bats bob by level 15');
  assert.ok(LEVELS[14].snakeAmp > 0, 'snakes rear by level 15');
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

test('level 1 has no spirits; spirits appear on later levels', () => {
  assert.equal(LEVELS[0].entities.some((e) => e.type === 'spirit'), false);
  assert.ok(LEVELS.some((l) => l.entities.some((e) => e.type === 'spirit')), 'some level has spirits');
});
