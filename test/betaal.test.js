// test/betaal.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBetaal } from '../src/betaal.js';
import { createMaze } from '../src/maze.js';
import { tileToPixelCenter } from '../src/pathing.js';
import { SPEED } from '../src/constants.js';

function makeCtx(maze, over = {}) {
  return {
    bikram: { col: maze.bikramSpawn.col, row: maze.bikramSpawn.row, dir: 'left' },
    globalMode: 'chase',
    betaalSpeed: SPEED.BETAAL,
    ...over,
  };
}

test('betaal starts at its spawn in scatter mode', () => {
  const m = createMaze();
  const b = createBetaal(m, { personality: 'chaser', spawn: { col: 1, row: 1 }, corner: { col: 1, row: 1 }, color: '#fff' });
  assert.deepEqual(b.tile(), { col: 1, row: 1 });
  assert.equal(b.mode, 'scatter');
});

test('frighten sets frightened mode and reverses direction', () => {
  const m = createMaze();
  const b = createBetaal(m, { personality: 'chaser', spawn: { col: 1, row: 3 }, corner: { col: 1, row: 1 }, color: '#fff' });
  b.dir = 'down';
  b.frighten(7000);
  assert.equal(b.mode, 'frightened');
  assert.equal(b.dir, 'up');
});

test('frighten does not override an eaten betaal', () => {
  const m = createMaze();
  const b = createBetaal(m, { personality: 'chaser', spawn: { col: 1, row: 3 }, corner: { col: 1, row: 1 }, color: '#fff' });
  b.setEaten();
  b.frighten(7000);
  assert.equal(b.mode, 'eaten');
});

test('frightened mode expires back to the global mode', () => {
  const m = createMaze();
  const b = createBetaal(m, { personality: 'chaser', spawn: { col: 1, row: 3 }, corner: { col: 1, row: 1 }, color: '#fff' });
  b.frighten(50);
  b.update(0.1, makeCtx(m)); // 100ms elapsed > 50ms fright
  assert.equal(b.mode, 'chase');
});

test('an eaten betaal that reaches the shrine revives', () => {
  const m = createMaze();
  const b = createBetaal(m, { personality: 'chaser', spawn: { col: 1, row: 3 }, corner: { col: 1, row: 1 }, color: '#fff' });
  b.setEaten();
  const p = tileToPixelCenter(m.shrine.col, m.shrine.row);
  b.x = p.x; b.y = p.y;
  b.update(0.001, makeCtx(m));
  assert.equal(b.mode, 'chase');
});

test('update moves the betaal', () => {
  const m = createMaze();
  const b = createBetaal(m, { personality: 'chaser', spawn: { col: 1, row: 3 }, corner: { col: 1, row: 1 }, color: '#fff' });
  const x0 = b.x, y0 = b.y;
  b.update(0.05, makeCtx(m));
  assert.ok(b.x !== x0 || b.y !== y0, 'betaal should move');
});

test('re-frightening an already-frightened betaal does not reverse again', () => {
  const m = createMaze();
  const b = createBetaal(m, { personality: 'chaser', spawn: { col: 1, row: 3 }, corner: { col: 1, row: 1 }, color: '#fff' });
  b.dir = 'down';
  b.frighten(7000);           // -> up
  assert.equal(b.dir, 'up');
  b.frighten(7000);           // already frightened: must stay 'up'
  assert.equal(b.dir, 'up');
});

test('resetTo restores spawn position, scatter mode, and up direction', () => {
  const m = createMaze();
  const b = createBetaal(m, { personality: 'chaser', spawn: { col: 1, row: 3 }, corner: { col: 1, row: 1 }, color: '#fff' });
  b.setEaten();
  b.x += 100; b.y += 100;
  b.resetTo();
  assert.deepEqual(b.tile(), { col: 1, row: 3 });
  assert.equal(b.mode, 'scatter');
  assert.equal(b.dir, 'up');
});
