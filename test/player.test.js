import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer } from '../src/game/player.js';
import { GROUND_TOP, PLAYER_H, JUMP_V, ENERGY_MAX } from '../src/constants.js';

const STAND_Y = GROUND_TOP - PLAYER_H;

test('player starts grounded at stand height', () => {
  const p = createPlayer();
  assert.equal(p.grounded, true);
  assert.equal(p.y, STAND_Y);
});

test('a buffered jump launches the player upward next update', () => {
  const p = createPlayer();
  p.requestJump();
  p.update(0.016);
  assert.equal(p.grounded, false);
  assert.ok(p.vy < 0, 'moving upward');
  assert.equal(p.jumpsUsed, 1);
});

test('double jump works once, third is ignored', () => {
  const p = createPlayer();
  p.requestJump(); p.update(0.016);          // jump 1
  p.requestJump(); p.update(0.016);          // jump 2 (double)
  assert.equal(p.jumpsUsed, 2);
  const vyAfterDouble = p.vy;
  p.requestJump(); p.update(0.016);          // ignored
  assert.equal(p.jumpsUsed, 2);
  assert.ok(p.vy > vyAfterDouble, 'gravity only, no new impulse');
});

test('player falls and lands back on the ground', () => {
  const p = createPlayer();
  p.requestJump();
  for (let i = 0; i < 200; i++) p.update(0.016); // ~3.2s, plenty to land
  assert.equal(p.grounded, true);
  assert.equal(p.y, STAND_Y);
  assert.equal(p.jumpsUsed, 0);
});

test('hit costs a heart and grants invulnerability; repeat hit ignored', () => {
  const p = createPlayer();
  assert.equal(p.hit(), false);
  assert.equal(p.hearts, 2);
  assert.ok(p.invuln > 0);
  assert.equal(p.hit(), false); // invulnerable -> no-op
  assert.equal(p.hearts, 2);
});

test('hit returns true when the last heart is lost', () => {
  const p = createPlayer();
  p.hit(); p.invuln = 0;
  p.hit(); p.invuln = 0;
  assert.equal(p.hit(), true);
  assert.ok(p.hearts <= 0);
});

test('energy caps at ENERGY_MAX and feeds Fury (not dash)', () => {
  const p = createPlayer();
  p.addEnergy(40); assert.equal(p.canFury(), false);
  p.addEnergy(1000); assert.equal(p.energy, ENERGY_MAX);
  assert.equal(p.canFury(), true);
  assert.equal(p.startFury(), true);
  assert.ok(p.fury > 0);
  assert.equal(p.energy, 0, 'fury empties the bar');
  assert.equal(p.isInvincible(), true, 'invincible during fury');
});

test('dash is cooldown-gated and grants i-frames (no energy cost)', () => {
  const p = createPlayer();
  assert.equal(p.energy, 0);
  assert.equal(p.startDash(), true, 'dash works with an empty bar');
  assert.ok(p.dash > 0);
  assert.equal(p.isInvincible(), true);
  assert.equal(p.startDash(), false, 'still on cooldown');
});

test('coyote time lets the player jump shortly after leaving a ledge', () => {
  const p = createPlayer();
  p.setAirborneFromLedge();
  assert.equal(p.grounded, false);
  p.requestJump();
  p.update(0.016);
  assert.ok(p.vy < 0, 'jumped during coyote window');
  assert.equal(p.jumpsUsed, 1);
});
