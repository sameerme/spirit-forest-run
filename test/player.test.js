// test/player.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBikram } from '../src/player.js';
import { createMaze } from '../src/maze.js';
import { TILE, COLS } from '../src/constants.js';
import { tileToPixelCenter } from '../src/pathing.js';

test('bikram starts at the maze spawn', () => {
  const m = createMaze();
  const b = createBikram(m);
  assert.deepEqual(b.tile(), m.bikramSpawn);
});

test('buffered turn applies when the corridor opens', () => {
  const m = createMaze();
  const b = createBikram(m);
  // Spawn row (20) is open left/right; the row above (19) is open too.
  b.setNextDir('up');
  b.update(0.001); // at centre -> should adopt the buffered direction
  assert.equal(b.dir, 'up');
});

test('eating a dot returns an ate event and clears the tile', () => {
  const m = createMaze();
  const b = createBikram(m);
  // Place bikram on a known dot tile centre: (1, 20) is '.'
  const p = tileToPixelCenter(1, 20);
  b.x = p.x; b.y = p.y;
  const ev = b.update(0.001);
  assert.equal(ev.ate, 'dot');
  assert.equal(m.eatAt(1, 20), null); // already eaten
});

test('tunnel wrap moves bikram across the screen edge', () => {
  const m = createMaze();
  const b = createBikram(m);
  // Tunnel row is 11; place just past the left edge moving left.
  const p = tileToPixelCenter(0, 11);
  b.x = p.x; b.y = p.y; b.dir = 'left'; b.nextDir = 'left';
  // Several updates push x below the left bound and wrap it to the right side.
  for (let i = 0; i < 30; i++) b.update(0.02);
  assert.ok(b.x > (COLS - 3) * TILE, `expected wrap to right side, got x=${b.x}`);
});
