import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLevelRuntime } from '../src/game/level.js';
import { createPlayer } from '../src/game/player.js';
import { createCamera } from '../src/engine/camera.js';
import { createSnake } from '../src/game/entities.js';
import { GROUND_TOP, PLAYER_H, PLAYER_X, VH, TILE, ENERGY_MAX, START_HEARTS } from '../src/constants.js';

const audio = { jump() {}, hit() {}, sphere() {}, win() {}, resume() {}, snake() {}, bat() {}, spirit() {}, slash() {} };
const STAND_Y = GROUND_TOP - PLAYER_H;

function snakeLevel() {
  // a snake parked at the player's fixed screen position (camera at 0)
  return { speed: 0, minGap: 0, length: 100000, goalX: 99999, entities: [createSnake(PLAYER_X)] };
}

function pitLevel() {
  // a wide pit sitting under the player's fixed screen position (camera at 0)
  return {
    speed: 0, minGap: 0, length: 100000, goalX: 99999,
    entities: [{ type: 'pit', worldX: PLAYER_X - 10, w: TILE * 3, tiles: 3 }],
  };
}

test('player over a pit falls down first, then game over (not instant death)', () => {
  const player = createPlayer();
  const camera = createCamera();
  const rt = createLevelRuntime(pitLevel());

  let died = false;
  let fellBelowGround = false;
  let framesUntilDeath = 0;
  for (let i = 0; i < 200 && !died; i++) {
    const floor = rt.floorFor(camera, player);
    player.update(1 / 60, floor);
    const r = rt.update(1 / 60, camera, player, audio);
    if (player.y > GROUND_TOP) fellBelowGround = true; // dropped past the floor line
    died = r.died;
    framesUntilDeath = i + 1;
  }

  assert.ok(fellBelowGround, 'player should fall past the ground line before dying');
  assert.ok(died, 'player should eventually die after falling');
  assert.ok(player.y > VH, 'death happens once the player drops off the bottom');
  assert.ok(framesUntilDeath > 10, `death should not be instant (took ${framesUntilDeath} frames)`);
});

test('jumping at the pit edge saves the player (no commit to falling)', () => {
  const player = createPlayer();
  const camera = createCamera();
  const rt = createLevelRuntime(pitLevel());

  // First frame: pit spawns. Then jump immediately at the ledge.
  let jumped = false;
  let died = false;
  for (let i = 0; i < 40 && !died; i++) {
    if (!jumped && i >= 1) { player.requestJump(); jumped = true; }
    const floor = rt.floorFor(camera, player);
    player.update(1 / 60, floor);
    const r = rt.update(1 / 60, camera, player, audio);
    died = r.died;
  }
  // The jump should have launched him upward (above stand height) rather than dropping him in.
  assert.ok(player.y < STAND_Y, 'jump lifted the player above ground at the ledge');
  assert.equal(rt.pitFalling, false, 'a successful jump does not commit to a pit fall');
});

test('player falls back to the ground after crossing a platform', () => {
  const player = createPlayer();
  const camera = createCamera();
  const platY = GROUND_TOP - 150;
  const level = {
    speed: 200, minGap: 0, length: 100000, goalX: 99999,
    entities: [{ type: 'platform', worldX: PLAYER_X - 20, w: 180, y: platY }],
  };
  const rt = createLevelRuntime(level);
  // start the player standing on the platform
  player.y = platY - PLAYER_H; player.vy = 0; player.grounded = true;

  let stoodOnPlatform = false;
  let landedGround = false;
  for (let i = 0; i < 300; i++) {
    camera.update(1 / 60, level.speed);
    const floor = rt.floorFor(camera, player);
    player.update(1 / 60, floor);
    rt.update(1 / 60, camera, player, audio);
    if (player.grounded && Math.abs((player.y + PLAYER_H) - platY) < 1) stoodOnPlatform = true;
    if (player.grounded && Math.abs((player.y + PLAYER_H) - GROUND_TOP) < 1) { landedGround = true; break; }
  }
  assert.ok(stoodOnPlatform, 'player should rest on the platform first');
  assert.ok(landedGround, 'player should fall to the ground after leaving the platform');
});

// ---- Combat & powers (wave 2) ----

test('dash is cooldown-gated (no energy needed, not re-triggerable instantly)', () => {
  const player = createPlayer();
  assert.equal(player.startDash(), true, 'first dash starts');
  assert.equal(player.startDash(), false, 'cannot dash again until the cooldown elapses');
});

test('fury needs a full energy bar and consumes it', () => {
  const player = createPlayer();
  assert.equal(player.startFury(), false, 'cannot fury without energy');
  player.addEnergy(ENERGY_MAX);
  assert.equal(player.canFury(), true);
  assert.equal(player.startFury(), true);
  assert.equal(player.energy, 0, 'fury empties the energy bar');
});

test('dashing into an enemy kills it and takes no damage', () => {
  const player = createPlayer();
  const camera = createCamera();
  const rt = createLevelRuntime(snakeLevel());
  player.startDash();
  rt.update(1 / 60, camera, player, audio);
  assert.ok(rt.events.some((e) => e.type === 'kill'), 'dash kills the overlapping snake');
  assert.equal(player.hearts, START_HEARTS, 'no damage during a dash strike');
});

test('stomping an enemy from above kills it and bounces the player', () => {
  const player = createPlayer();
  const camera = createCamera();
  const rt = createLevelRuntime(snakeLevel());
  player.grounded = false; player.vy = 200;
  player.y = GROUND_TOP - PLAYER_H - 40; // airborne, descending onto the snake's top
  rt.update(1 / 60, camera, player, audio);
  assert.ok(rt.events.some((e) => e.type === 'kill'), 'stomp kills the snake');
  assert.ok(player.vy < 0, 'player bounces upward off the stomped enemy');
  assert.equal(player.hearts, START_HEARTS, 'no damage from a stomp');
});

test('shield protects from a hit without killing the enemy', () => {
  const player = createPlayer();
  const camera = createCamera();
  const rt = createLevelRuntime(snakeLevel());
  player.addShield();
  rt.update(1 / 60, camera, player, audio);
  assert.equal(player.hearts, START_HEARTS, 'shield blocks the damage');
  assert.ok(!rt.events.some((e) => e.type === 'kill'), 'shield protects but does not kill');
});

test('running into an enemy with no power costs a heart', () => {
  const player = createPlayer();
  const camera = createCamera();
  const rt = createLevelRuntime(snakeLevel());
  rt.update(1 / 60, camera, player, audio); // grounded, no dash/fury/shield
  assert.ok(rt.events.some((e) => e.type === 'hit'), 'unprotected contact is a hit');
  assert.equal(player.hearts, START_HEARTS - 1, 'lost one heart');
});
