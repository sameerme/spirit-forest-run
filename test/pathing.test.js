import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIRS, DIR_NAMES, opposite, tileToPixelCenter, pixelToTile,
  isCentered, stepTile, dist2,
} from '../src/pathing.js';

test('opposite returns the reverse direction', () => {
  assert.equal(opposite('up'), 'down');
  assert.equal(opposite('left'), 'right');
  assert.equal(opposite('none'), 'none');
});

test('tileToPixelCenter returns the tile centre', () => {
  assert.deepEqual(tileToPixelCenter(0, 0), { x: 12, y: 12 });
  assert.deepEqual(tileToPixelCenter(2, 3), { x: 60, y: 84 });
});

test('pixelToTile floors pixels into tile coords', () => {
  assert.deepEqual(pixelToTile(12, 12), { col: 0, row: 0 });
  assert.deepEqual(pixelToTile(60, 84), { col: 2, row: 3 });
});

test('isCentered is true at the centre, false off-centre', () => {
  assert.equal(isCentered({ x: 12, y: 12 }), true);
  assert.equal(isCentered({ x: 18, y: 12 }), false);
});

test('stepTile moves one tile in a direction', () => {
  assert.deepEqual(stepTile(5, 5, 'left'), { col: 4, row: 5 });
  assert.deepEqual(stepTile(5, 5, 'down'), { col: 5, row: 6 });
});

test('dist2 returns squared euclidean distance', () => {
  assert.equal(dist2(0, 0, 3, 4), 25);
});

test('DIR_NAMES lists the four real directions', () => {
  assert.deepEqual(DIR_NAMES, ['up', 'down', 'left', 'right']);
});
