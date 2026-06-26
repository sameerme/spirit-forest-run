import { VW, VH } from '../constants.js';

// A few translucent ghosts lingering in the upper sky with smooth, organic
// drift (summed sines = a lissajous wander). Pure atmosphere — no collision,
// no gameplay effect. Kept in the top band so they never crowd the runner.
const COUNT = 3;
const TOP = 40;             // upper bound of the drift band
const BOTTOM = VH * 0.46;   // lower bound — stays in the empty sky above gameplay

const rand = (min, max) => min + Math.random() * (max - min);

function spawn() {
  return {
    cx: rand(VW * 0.12, VW * 0.88),
    cy: rand(TOP + 70, BOTTOM - 40),
    ax: rand(45, 95),        // horizontal wander amplitude
    ay: rand(22, 48),        // vertical wander amplitude
    fx: rand(0.05, 0.11),    // slow wander frequencies (cycles/sec)
    fy: rand(0.06, 0.13),
    px: rand(0, Math.PI * 2),
    py: rand(0, Math.PI * 2),
    drift: rand(-14, 14),    // slow horizontal travel; wraps around the screen
    scale: rand(0.65, 1.05),
    alpha: rand(0.33, 0.55), // translucent, ghostly — visible but not solid
    flip: Math.random() < 0.5 ? -1 : 1,
    t: rand(0, 12),          // desynchronise the phases
  };
}

export function createGhosts() {
  const ghosts = Array.from({ length: COUNT }, spawn);

  return {
    update(dt) {
      for (const g of ghosts) {
        g.t += dt;
        g.cx += g.drift * dt;
        if (g.cx < -130) g.cx = VW + 130;
        else if (g.cx > VW + 130) g.cx = -130;
      }
    },
    draw(ctx, assets) {
      const a = assets.get('spirit');
      const TWO_PI = Math.PI * 2;
      for (const g of ghosts) {
        const x = g.cx + Math.sin(g.t * g.fx * TWO_PI + g.px) * g.ax;
        let y = g.cy + Math.sin(g.t * g.fy * TWO_PI + g.py) * g.ay;
        y = Math.max(TOP, Math.min(BOTTOM, y));
        const w = a.meta.fw * g.scale, h = a.meta.fh * g.scale;
        ctx.save();
        ctx.globalAlpha = g.alpha;
        ctx.translate(x, y);
        ctx.scale(g.flip, 1);
        ctx.drawImage(a.img, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
    },
  };
}
