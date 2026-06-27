import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoss } from '../src/game/boss.js';
import { createPlayer } from '../src/game/player.js';
import { PLAYER_X, BOSS_HP } from '../src/constants.js';

// Force the boss into a charge that overlaps the (grounded) player.
function placeChargeOverlap(boss, player) {
  boss.phase = 'charge'; boss.cphase = 'hold'; boss.timer = 1; boss.invuln = 0; boss.didHit = false;
  boss.x = PLAYER_X + player.w;
  boss.y = player.y + player.h / 2;
}

test('boss starts at full HP', () => {
  assert.equal(createBoss().hp, BOSS_HP);
});

test('dashing into a charging boss damages it', () => {
  const boss = createBoss();
  const player = createPlayer();
  player.startDash();
  placeChargeOverlap(boss, player);
  const r = boss.update(1 / 60, player);
  assert.equal(boss.hp, BOSS_HP - 1, 'boss takes one hit');
  assert.ok(r.events.some((e) => e.type === 'bosshit'));
});

test('touching a charging boss unarmed hurts the player, not the boss', () => {
  const boss = createBoss();
  const player = createPlayer();
  placeChargeOverlap(boss, player);
  const r = boss.update(1 / 60, player);
  assert.equal(boss.hp, BOSS_HP, 'boss undamaged when player is not attacking');
  assert.ok(r.events.some((e) => e.type === 'playerhit'));
});

test('boss is defeated when HP runs out', () => {
  const boss = createBoss();
  const player = createPlayer();
  let defeated = false;
  for (let i = 0; i < BOSS_HP; i++) {
    player.dash = 0; player.cooldown = 0; player.startDash(); // a fresh dash each pass
    placeChargeOverlap(boss, player);
    const r = boss.update(1 / 60, player);
    defeated = defeated || r.defeated;
  }
  assert.ok(boss.hp <= 0, 'HP exhausted');
  assert.ok(defeated && boss.dead, 'boss reports defeat');
});
