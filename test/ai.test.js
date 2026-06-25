import { test } from 'node:test';
import assert from 'node:assert/strict';
import { targetTile, chooseDirection } from '../src/ai.js';
import { createMaze } from '../src/maze.js';

test('chaser targets Bikram tile', () => {
  const t = targetTile('chaser', {
    bikram: { col: 5, row: 6, dir: 'left' },
    betaal: { col: 1, row: 1 }, corner: { col: 1, row: 1 }, shrine: { col: 10, row: 11 },
  });
  assert.deepEqual(t, { col: 5, row: 6 });
});

test('ambusher targets four tiles ahead of Bikram', () => {
  const t = targetTile('ambusher', {
    bikram: { col: 10, row: 10, dir: 'up' },
    betaal: { col: 1, row: 1 }, corner: { col: 1, row: 1 }, shrine: { col: 10, row: 11 },
  });
  assert.deepEqual(t, { col: 10, row: 6 });
});

test('shy chases when far, retreats to corner when close', () => {
  const corner = { col: 1, row: 21 };
  const far = targetTile('shy', {
    bikram: { col: 18, row: 2, dir: 'left' },
    betaal: { col: 1, row: 20 }, corner, shrine: { col: 10, row: 11 },
  });
  assert.deepEqual(far, { col: 18, row: 2 });
  const near = targetTile('shy', {
    bikram: { col: 2, row: 20, dir: 'left' },
    betaal: { col: 1, row: 20 }, corner, shrine: { col: 10, row: 11 },
  });
  assert.deepEqual(near, corner);
});

test('chooseDirection moves toward the target and never reverses needlessly', () => {
  const m = createMaze();
  // From the open spawn row, target far to the left -> should pick a legal move,
  // and must not be the reverse of currentDir unless forced.
  const s = m.bikramSpawn;
  const dir = chooseDirection(m, s.col, s.row, 'left', { col: 0, row: s.row });
  assert.ok(['up', 'down', 'left', 'right'].includes(dir));
  assert.notEqual(dir, 'right'); // 'right' is the reverse of 'left' and is not forced here
});

test('chooseDirection with random=true returns a legal move deterministically with seeded rng', () => {
  const m = createMaze();
  const s = m.bikramSpawn;
  const dir = chooseDirection(m, s.col, s.row, 'left', { col: 0, row: 0 }, { random: true, rng: () => 0 });
  assert.ok(['up', 'down', 'left', 'right'].includes(dir));
});
