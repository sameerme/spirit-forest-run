import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLevelRuntime } from '../src/game/level.js';
import { createPlayer } from '../src/game/player.js';
import { createCamera } from '../src/engine/camera.js';
import { GROUND_TOP, PLAYER_H, PLAYER_X, VH, TILE } from '../src/constants.js';

const audio = { jump() {}, hit() {}, sphere() {}, win() {}, resume() {} };
const STAND_Y = GROUND_TOP - PLAYER_H;

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
