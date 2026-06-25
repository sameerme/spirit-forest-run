import { applyGravity, integrate } from '../engine/physics.js';
import {
  GROUND_TOP, PLAYER_X, PLAYER_W, PLAYER_H, GRAVITY, JUMP_V, DOUBLE_JUMP_V,
  COYOTE_MS, JUMP_BUFFER_MS, INVULN_MS, DASH_MS, ENERGY_MAX, START_HEARTS,
} from '../constants.js';

export function createPlayer(groundTop = GROUND_TOP) {
  const standY = groundTop - PLAYER_H;
  return {
    x: PLAYER_X, y: standY, vy: 0, w: PLAYER_W, h: PLAYER_H,
    grounded: true, jumpsUsed: 0,
    hearts: START_HEARTS, invuln: 0, dash: 0, energy: 0,
    coyote: 0, buffer: 0,

    box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; },
    requestJump() { this.buffer = JUMP_BUFFER_MS; },
    setAirborneFromLedge() {
      if (this.grounded) { this.grounded = false; this.coyote = COYOTE_MS; }
    },
    isInvincible() { return this.invuln > 0 || this.dash > 0; },

    _tryJump() {
      if (this.grounded || this.coyote > 0) {
        this.vy = -JUMP_V; this.grounded = false; this.coyote = 0;
        this.jumpsUsed = 1; this.buffer = 0; return true;
      }
      if (this.jumpsUsed < 2) {
        this.vy = -DOUBLE_JUMP_V; this.jumpsUsed = 2; this.buffer = 0; return true;
      }
      return false;
    },

    update(dt, gt = groundTop) {
      const standY2 = gt - this.h;
      const ms = dt * 1000;
      if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - ms);
      if (this.dash > 0) this.dash = Math.max(0, this.dash - ms);
      if (this.buffer > 0) this.buffer = Math.max(0, this.buffer - ms);
      if (!this.grounded && this.coyote > 0) this.coyote = Math.max(0, this.coyote - ms);

      if (this.buffer > 0) this._tryJump();

      if (!this.grounded) {
        this.vy = applyGravity(this.vy, dt, GRAVITY);
        this.y = integrate(this.y, this.vy, dt);
        if (this.y >= standY2) {
          this.y = standY2; this.vy = 0; this.grounded = true; this.jumpsUsed = 0; this.coyote = 0;
        }
      }
    },

    hit() {
      if (this.isInvincible()) return false;
      this.hearts -= 1; this.invuln = INVULN_MS;
      return this.hearts <= 0;
    },
    addEnergy(amt) { this.energy = Math.min(ENERGY_MAX, this.energy + amt); },
    startDash() {
      if (this.energy >= ENERGY_MAX) { this.dash = DASH_MS; this.energy = 0; return true; }
      return false;
    },
  };
}
