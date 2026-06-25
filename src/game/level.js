import { PLAYER_X, ENERGY_PER_SPHERE, GROUND_TOP, VW, TILE, COLORS } from '../constants.js';
import { aabbOverlap } from '../engine/physics.js';
import { createSprite, frameRect } from '../engine/sprite.js';
import { entitiesToSpawn } from './spawner.js';
import { worldBox, updateEntity } from './entities.js';

// Correction A: live-clone helper — creates a fresh animated entity from a
// stripped blueprint so retries don't share mutable state and animations work.
const ANIM = { snake: [4, 8], bat: [4, 10], spirit: [4, 6], sphere: [4, 8] };
function makeLive(bp) {
  const spec = ANIM[bp.type];
  return { ...bp, taken: false, consumed: false, t: 0, anim: spec ? createSprite(spec[0], spec[1]) : null };
}

export function createLevelRuntime(levelData) {
  return {
    data: levelData,
    active: [],
    idx: 0,
    distance: 0,
    spheres: 0,

    update(dt, camera, player, audio) {
      const spawnX = camera.x + VW + 100;
      const { spawned, nextIndex } = entitiesToSpawn(levelData.entities, spawnX, this.idx);
      // Correction A: push live clones, not shared blueprints
      for (const e of spawned) this.active.push(makeLive(e));
      this.idx = nextIndex;

      let died = false;
      const px = camera.x + PLAYER_X;
      const pBox = { x: px, y: player.y, w: player.w, h: player.h };
      const pCenter = px + player.w / 2;

      // pit support / fall detection
      let overPit = false;
      for (const e of this.active) {
        if (e.type !== 'pit') continue;
        if (pCenter >= e.worldX && pCenter <= e.worldX + e.w) {
          overPit = true;
          if (player.grounded && player.y + player.h >= GROUND_TOP - 1) died = true;
        }
      }
      if (overPit && player.grounded) player.setAirborneFromLedge();

      for (const e of this.active) {
        updateEntity(e, dt);
        if (e.consumed || e.taken) continue;
        const wb = worldBox(e);
        if (e.type === 'sphere') {
          if (aabbOverlap(pBox, wb)) { e.taken = true; player.addEnergy(ENERGY_PER_SPHERE); this.spheres++; audio.sphere(); }
        } else if (e.type === 'platform') {
          const falling = player.vy > 0;
          const overTop = pBox.x + pBox.w > wb.x && pBox.x < wb.x + wb.w;
          const atTop = player.y + player.h >= wb.y && player.y + player.h <= wb.y + 28;
          if (falling && overTop && atTop) { player.y = wb.y - player.h; player.vy = 0; player.grounded = true; player.jumpsUsed = 0; }
        } else if (e.type === 'snake' || e.type === 'bat' || e.type === 'spirit') {
          if (aabbOverlap(pBox, wb)) {
            if (player.isInvincible()) { if (player.dash > 0) e.consumed = true; }
            else { const dead = player.hit(); audio.hit(); if (dead) died = true; }
          }
        }
      }

      // prune entities fully off the left edge
      this.active = this.active.filter((e) => e.worldX + (e.w || 0) > camera.x - 50 && !e.consumed);

      this.distance = camera.x;
      const won = camera.x + PLAYER_X >= levelData.goalX;
      return { won, died };
    },

    draw(ctx, assets, camera) {
      for (const e of this.active) {
        if (e.taken || e.consumed) continue;
        const sx = e.worldX - camera.x;
        if (sx > VW + 120 || sx + (e.w || 0) < -120) continue;
        if (e.type === 'pit') continue; // pit is the absence of ground (handled by ground draw)
        const key = e.type === 'platform' ? 'platform_log' : e.type;
        const a = assets.get(key);
        const fr = a.meta.frames > 1 && e.anim ? frameRect(a.meta, e.anim.frame % a.meta.frames) : { sx: 0, sy: 0, sw: a.meta.fw, sh: a.meta.fh };
        if (e.type === 'spirit') ctx.globalAlpha = 0.8;
        ctx.drawImage(a.img, fr.sx, fr.sy, fr.sw, fr.sh, sx, e.y, e.w + 8, e.h + 8);
        ctx.globalAlpha = 1;
      }
    },

    pits() { return this.active.filter((e) => e.type === 'pit'); },
  };
}
