import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSnake, createBat, createSpirit, createSphere, createPit, createPlatform,
  worldBox, updateEntity,
} from '../src/game/entities.js';
import { TILE, GROUND_TOP } from '../src/constants.js';

test('snake sits on the ground', () => {
  const s = createSnake(1000);
  const b = worldBox(s);
  assert.equal(b.x, 1000);
  assert.equal(b.y + b.h, GROUND_TOP); // bottom rests on ground surface
});

test('pit width equals tiles * TILE', () => {
  const p = createPit(2000, 3);
  assert.equal(worldBox(p).w, 3 * TILE);
});

test('sphere has a taken flag default false', () => {
  assert.equal(createSphere(500, 600).taken, false);
});

test('spirit oscillates vertically around its baseY within amplitude', () => {
  const sp = createSpirit(800, 600, 90, 1);
  const ys = [];
  for (let i = 0; i < 120; i++) { updateEntity(sp, 1 / 60); ys.push(sp.y); }
  const min = Math.min(...ys), max = Math.max(...ys);
  assert.ok(max - sp.baseY > 50 && max - sp.baseY <= 91, 'rises ~amplitude');
  assert.ok(sp.baseY - min > 50 && sp.baseY - min <= 91, 'dips ~amplitude');
});

test('bat keeps the y it was spawned at', () => {
  const bt = createBat(1200, 690);
  assert.equal(worldBox(bt).y, 690);
});

test('platform is a thin landable strip', () => {
  const pl = createPlatform(1500, 700);
  const b = worldBox(pl);
  assert.equal(b.y, 700);
  assert.ok(b.h <= 30);
});
