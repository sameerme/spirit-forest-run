// Level-15 boss: a giant Betaal in a locked arena. It hovers high-right, then
// telegraphs and SWOOPS down across the player's lane (dodge by jumping, or
// counter by dashing/fury to damage it), and casts homing orbs (jump/dash to
// avoid). Pure state machine; update() returns events for the caller to apply.
import { VW, GROUND_TOP, PLAYER_X, BOSS_HP } from '../constants.js';
import { aabbOverlap } from '../engine/physics.js';

const W = 196, H = 224;
const IDLE_X = VW - 130;        // hovers here, far right
const Y_BASE = 250, Y_AMP = 70; // idle bob band (high up)
const GAP = 2.2;                // seconds between attacks
const TELEGRAPH = 0.5;          // wind-up before a swoop
const CHARGE_IN = 0.4, CHARGE_HOLD = 0.14, CHARGE_OUT = 0.5;
const INVULN = 0.7;             // boss i-frames after a hit (seconds)
const PROJ_SPEED = 430, PROJ_R = 19;

export function createBoss() {
  return {
    hp: BOSS_HP, maxHp: BOSS_HP,
    x: IDLE_X, y: Y_BASE, t: 0,
    phase: 'intro', cphase: 'in', timer: 1.1,
    invuln: 0, hitFlash: 0, dead: false, didHit: false,
    targetY: Y_BASE,
    projectiles: [],

    box() { return { x: this.x - W / 2, y: this.y - H / 2, w: W, h: H }; },

    update(dt, player) {
      const events = [];
      this.t += dt;
      if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
      if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);
      const pBox = { x: PLAYER_X, y: player.y, w: player.w, h: player.h };

      if (this.phase === 'intro') {
        this.y = Y_BASE + Math.sin(this.t * 1.5) * 10;
        this.timer -= dt; if (this.timer <= 0) { this.phase = 'idle'; this.timer = GAP; }
      } else if (this.phase === 'idle') {
        this.y = Y_BASE + Math.sin(this.t * 1.6) * Y_AMP;
        this.x += (IDLE_X - this.x) * Math.min(1, dt * 4);
        this.timer -= dt;
        if (this.timer <= 0) {
          if (Math.random() < 0.62) { // swoop
            this.phase = 'telegraph'; this.timer = TELEGRAPH;
            this.targetY = player.y + player.h / 2; this.didHit = false;
          } else { // cast a homing orb
            const tx = PLAYER_X + player.w / 2, ty = player.y + player.h / 2;
            const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1;
            this.projectiles.push({ x: this.x, y: this.y, vx: (dx / d) * PROJ_SPEED, vy: (dy / d) * PROJ_SPEED, r: PROJ_R });
            this.phase = 'idle'; this.timer = GAP;
            events.push({ type: 'bosscast', x: this.x, y: this.y });
          }
        }
      } else if (this.phase === 'telegraph') {
        this.y += (this.targetY - this.y) * Math.min(1, dt * 6);
        this.timer -= dt; if (this.timer <= 0) { this.phase = 'charge'; this.cphase = 'in'; this.timer = CHARGE_IN; }
      } else if (this.phase === 'charge') {
        if (this.cphase === 'in') {
          this.x += ((PLAYER_X + player.w) - this.x) * Math.min(1, dt * 9);
          this.timer -= dt; if (this.timer <= 0) { this.cphase = 'hold'; this.timer = CHARGE_HOLD; }
        } else if (this.cphase === 'hold') {
          this.timer -= dt; if (this.timer <= 0) { this.cphase = 'out'; this.timer = CHARGE_OUT; }
        } else {
          this.x += (IDLE_X - this.x) * Math.min(1, dt * 6);
          this.timer -= dt; if (this.timer <= 0) { this.phase = 'idle'; this.timer = GAP; }
        }
        if (aabbOverlap(pBox, this.box())) {
          const offensive = player.dash > 0 || player.fury > 0;
          if (this.invuln <= 0 && offensive) {
            this.hp -= 1; this.invuln = INVULN; this.hitFlash = 0.18;
            this.cphase = 'out'; this.timer = CHARGE_OUT; // knock back
            events.push({ type: 'bosshit', x: this.x, y: this.y - 30 });
            if (this.hp <= 0) this.dead = true;
          } else if (!offensive && !this.didHit && player.invuln <= 0) {
            this.didHit = true;
            events.push({ type: 'playerhit', x: PLAYER_X + player.w / 2, y: player.y + player.h / 2 });
          }
        }
      }

      for (const p of this.projectiles) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        const pb = { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 };
        if (aabbOverlap(pBox, pb)) {
          if (player.dash > 0 || player.fury > 0) { p.dead = true; events.push({ type: 'bossdeflect', x: p.x, y: p.y }); }
          else if (player.invuln <= 0) { p.dead = true; events.push({ type: 'playerhit', x: PLAYER_X + player.w / 2, y: player.y + player.h / 2 }); }
        }
      }
      this.projectiles = this.projectiles.filter((p) => !p.dead && p.x > -60 && p.y < GROUND_TOP + 80);

      return { events, defeated: this.dead };
    },

    draw(ctx, assets) {
      const a = assets.get('betaal_idle');
      ctx.save();
      if (this.phase === 'telegraph') ctx.globalAlpha = 0.55 + 0.45 * Math.sin(this.t * 30);
      ctx.filter = this.hitFlash > 0 ? 'brightness(3.2) saturate(0.2)' : 'hue-rotate(-35deg) saturate(1.6) brightness(0.92)';
      ctx.drawImage(a.img, 0, 0, a.meta.fw, a.meta.fh, this.x - W / 2, this.y - H / 2, W, H);
      ctx.restore();
      for (const p of this.projectiles) {
        ctx.save();
        const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r * 1.7);
        g.addColorStop(0, 'rgba(200,130,255,0.95)'); g.addColorStop(1, 'rgba(80,20,140,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a0a40'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    },
  };
}
