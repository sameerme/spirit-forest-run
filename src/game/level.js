import {
  PLAYER_X, ENERGY_PER_SPHERE, GROUND_TOP, VW, VH,
  KILL_ENERGY, SHIELD_SPAWN_MIN_S, SHIELD_SPAWN_MAX_S,
} from '../constants.js';

const NO_FLOOR = 100000; // effective "ground" when the player is over a pit gap
import { aabbOverlap } from '../engine/physics.js';
import { createSprite, frameRect } from '../engine/sprite.js';
import { entitiesToSpawn } from './spawner.js';
import { worldBox, updateEntity, createShield } from './entities.js';

const shieldInterval = () => SHIELD_SPAWN_MIN_S + Math.random() * (SHIELD_SPAWN_MAX_S - SHIELD_SPAWN_MIN_S);

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
    pitFalling: false,
    shieldTimer: shieldInterval(), // seconds until the next shield power-up spawns

    // Effective floor under the player for this frame. Over a pit gap there is no
    // floor (the player falls); on solid ground / a platform it's GROUND_TOP.
    // Coyote-time and a jump can still save the player at the ledge — only once he
    // has actually dropped to ground level over the gap does the fall commit.
    floorFor(camera, player) {
      if (this.pitFalling) return NO_FLOOR;
      // Standing on a platform above the gap: leave it to the platform logic.
      if (player.grounded && player.y + player.h < GROUND_TOP - 4) return GROUND_TOP;
      const pc = camera.x + PLAYER_X + player.w / 2;
      let overPit = false;
      for (const e of this.active) {
        if (e.type === 'pit' && pc >= e.worldX && pc <= e.worldX + e.w) { overPit = true; break; }
      }
      if (!overPit) return GROUND_TOP;
      if (player.grounded) player.setAirborneFromLedge(); // give coyote + un-ground at the edge
      if (player.vy > 0 && player.y + player.h >= GROUND_TOP && player.coyote <= 0) {
        this.pitFalling = true; // missed the jump — committed to falling
      }
      return NO_FLOOR;
    },

    events: [],

    update(dt, camera, player, audio) {
      const spawnX = camera.x + VW + 100;
      const { spawned, nextIndex } = entitiesToSpawn(levelData.entities, spawnX, this.idx);
      // Correction A: push live clones, not shared blueprints. Also play an arrival
      // sound once per enemy kind spawning this frame (a bat wave -> a single screech).
      const arrived = new Set();
      for (const e of spawned) {
        this.active.push(makeLive(e));
        if (e.type === 'bat' || e.type === 'snake' || e.type === 'spirit') arrived.add(e.type);
      }
      if (arrived.has('snake')) audio.snake();
      if (arrived.has('bat')) audio.bat();
      if (arrived.has('spirit')) audio.spirit();
      this.idx = nextIndex;

      // Occasionally drop a shield power-up ahead at a reachable height.
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        const y = GROUND_TOP - 90 - Math.random() * 230;
        this.active.push(makeLive(createShield(camera.x + VW + 80, y)));
        this.shieldTimer = shieldInterval();
      }

      let died = false;
      let supported = false; // is the player resting on a platform this frame?
      this.events = []; // {type:'sphere'|'stomp'|'hit', x, y} in SCREEN coords for fx
      const px = camera.x + PLAYER_X;
      const pBox = { x: px, y: player.y, w: player.w, h: player.h };

      for (const e of this.active) {
        updateEntity(e, dt);
        if (e.consumed || e.taken) continue;
        const wb = worldBox(e);
        const ex = wb.x - camera.x + wb.w / 2;
        if (e.type === 'sphere') {
          if (aabbOverlap(pBox, wb)) {
            e.taken = true; player.addEnergy(ENERGY_PER_SPHERE); this.spheres++; audio.sphere();
            this.events.push({ type: 'sphere', x: ex, y: wb.y + wb.h / 2 });
          }
        } else if (e.type === 'shield') {
          if (aabbOverlap(pBox, wb)) {
            e.taken = true; player.addShield();
            this.events.push({ type: 'shieldget', x: ex, y: wb.y + wb.h / 2 });
          }
        } else if (e.type === 'platform') {
          // land on / stay on the platform top while descending or resting on it
          const descending = player.vy >= 0;
          const overTop = pBox.x + pBox.w > wb.x && pBox.x < wb.x + wb.w;
          const atTop = player.y + player.h >= wb.y - 2 && player.y + player.h <= wb.y + 28;
          if (descending && overTop && atTop) {
            player.y = wb.y - player.h; player.vy = 0; player.grounded = true; player.jumpsUsed = 0;
            this.pitFalling = false; supported = true;
          }
        } else if (e.type === 'snake' || e.type === 'bat' || e.type === 'spirit') {
          if (aabbOverlap(pBox, wb)) {
            // Stomp: coming DOWN onto the enemy's upper half kills it (and bounces).
            const stomp = player.vy > 0 && (pBox.y + pBox.h) <= wb.y + wb.h * 0.6;
            const offensive = player.dash > 0 || player.fury > 0; // sword strike / fury
            if (offensive || stomp) {
              e.consumed = true;
              player.addEnergy(KILL_ENERGY);
              if (stomp && !offensive) player.bounce();
              audio.slash();
              this.events.push({ type: 'kill', x: ex, y: wb.y + wb.h / 2 });
            } else if (player.shield > 0 || player.invuln > 0) {
              // protected — pass through harmlessly, no kill
            } else {
              const dead = player.hit(); audio.hit();
              this.events.push({ type: 'hit', x: PLAYER_X + player.w / 2, y: player.y + player.h / 2 });
              if (dead) died = true;
            }
          }
        }
      }

      // Walked off a platform: if standing above the ground with no platform under
      // the player any more, drop them so they fall back down (gravity + floorFor).
      if (player.grounded && !supported && player.y + player.h < GROUND_TOP - 2) {
        player.grounded = false;
      }

      // prune entities fully off the left edge
      this.active = this.active.filter((e) => e.worldX + (e.w || 0) > camera.x - 50 && !e.consumed);

      // Falling into a pit: game over once the player drops off the bottom.
      if (player.y > VH) died = true;

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
        if (e.type === 'shield') {
          const cx = sx + e.w / 2, cy = e.y + e.h / 2, r = e.w / 2;
          ctx.save();
          const g = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
          g.addColorStop(0, 'rgba(190,242,255,0.95)'); g.addColorStop(1, 'rgba(90,180,255,0.12)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(210,247,255,0.95)'; ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.45); ctx.lineTo(cx, cy + r * 0.45);
          ctx.moveTo(cx - r * 0.45, cy); ctx.lineTo(cx + r * 0.45, cy); ctx.stroke(); // plus glyph
          ctx.restore();
          continue;
        }
        const key = e.type === 'platform' ? 'platform_log' : e.type;
        const a = assets.get(key);
        const fr = a.meta.frames > 1 && e.anim ? frameRect(a.meta, e.anim.frame % a.meta.frames) : { sx: 0, sy: 0, sw: a.meta.fw, sh: a.meta.fh };
        if (e.type === 'spirit') ctx.globalAlpha = 0.8;
        ctx.drawImage(a.img, fr.sx, fr.sy, fr.sw, fr.sh, sx, e.y, e.w + 8, e.h + 8);
        ctx.globalAlpha = 1;
      }
    },

    pits() { return this.active.filter((e) => e.type === 'pit'); },

    // Clear hazards (enemies + pits) in/near the view so a revive doesn't drop the
    // player straight onto a threat. Resets any committed pit fall.
    clearArea(camera) {
      const x0 = camera.x - 120, x1 = camera.x + VW + 240;
      const hazard = new Set(['snake', 'bat', 'spirit', 'pit']);
      this.active = this.active.filter((e) => {
        const near = e.worldX + (e.w || 0) > x0 && e.worldX < x1;
        return !(near && hazard.has(e.type));
      });
      this.pitFalling = false;
    },
  };
}
