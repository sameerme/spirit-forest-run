// test/maze.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAYOUT, createMaze, wrapCol, canMove } from '../src/maze.js';
import { COLS, ROWS } from '../src/constants.js';
import { DIR_NAMES, stepTile } from '../src/pathing.js';

test('layout has ROWS rows each COLS wide', () => {
  assert.equal(LAYOUT.length, ROWS);
  for (const row of LAYOUT) assert.equal(row.length, COLS);
});

test('createMaze finds spawn and shrine', () => {
  const m = createMaze();
  assert.ok(m.bikramSpawn, 'bikram spawn present');
  assert.ok(m.shrine, 'shrine present');
});

test('every pellet is reachable from the spawn (flood fill)', () => {
  const m = createMaze();
  const seen = new Set();
  const key = (c, r) => `${c},${r}`;
  const stack = [[m.bikramSpawn.col, m.bikramSpawn.row]];
  while (stack.length) {
    const [c, r] = stack.pop();
    if (seen.has(key(c, r))) continue;
    seen.add(key(c, r));
    for (const d of DIR_NAMES) {
      const n = stepTile(c, r, d);
      const nc = wrapCol(n.col);
      if (!m.isWall(nc, n.row) && !seen.has(key(nc, n.row))) stack.push([nc, n.row]);
    }
  }
  let pellets = 0, reached = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = m.grid[r][c];
      if (ch === '.' || ch === 'o') { pellets++; if (seen.has(key(c, r))) reached++; }
    }
  }
  assert.ok(pellets > 100, `expected a well-filled maze, got ${pellets} pellets`);
  assert.equal(reached, pellets, 'all pellets reachable');
});

test('there are exactly 4 lamps', () => {
  const m = createMaze();
  let lamps = 0;
  for (const row of m.grid) for (const ch of row) if (ch === 'o') lamps++;
  assert.equal(lamps, 4);
});

test('eatAt clears dots/lamps and decrements remaining', () => {
  const m = createMaze();
  const before = m.remainingPellets();
  // first lamp is at (1,1)
  assert.equal(m.eatAt(1, 1), 'lamp');
  assert.equal(m.eatAt(1, 1), null);
  assert.equal(m.remainingPellets(), before - 1);
});

test('isWall reports borders and open paths', () => {
  const m = createMaze();
  assert.equal(m.isWall(0, 0), true);
  assert.equal(m.isWall(m.bikramSpawn.col, m.bikramSpawn.row), false);
});

test('wrapCol wraps across the horizontal axis', () => {
  assert.equal(wrapCol(-1), COLS - 1);
  assert.equal(wrapCol(COLS), 0);
  assert.equal(wrapCol(5), 5);
});

test('canMove blocks into walls and allows open tiles', () => {
  const m = createMaze();
  const s = m.bikramSpawn;
  const open = DIR_NAMES.some((d) => canMove(m, s.col, s.row, d));
  assert.equal(open, true);
});
