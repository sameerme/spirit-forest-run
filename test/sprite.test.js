import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSprite, frameRect } from '../src/engine/sprite.js';

test('createSprite advances frames at fps and loops', () => {
  const s = createSprite(4, 10); // 0.1s per frame
  assert.equal(s.frame, 0);
  s.update(0.1); assert.equal(s.frame, 1);
  s.update(0.25); assert.equal(s.frame, 3); // +2 frames (0.2) then +0.05 leftover
  s.update(0.1); assert.equal(s.frame, 0); // wrapped
});

test('non-looping sprite stops on last frame and sets done', () => {
  const s = createSprite(3, 10, false);
  s.update(1.0);
  assert.equal(s.frame, 2);
  assert.equal(s.done, true);
});

test('frameRect returns the strip rect for a frame', () => {
  const meta = { frames: 4, fw: 90, fh: 110 };
  assert.deepEqual(frameRect(meta, 0), { sx: 0, sy: 0, sw: 90, sh: 110 });
  assert.deepEqual(frameRect(meta, 2), { sx: 180, sy: 0, sw: 90, sh: 110 });
});
