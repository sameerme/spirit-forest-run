// Lightweight juice: particle bursts, floating score popups, screen shake,
// and confetti. Browser-only (draws to a 2D context).
export function createFx() {
  const parts = [];
  const pops = [];
  let shakeMag = 0;
  let shakeT = 0;

  return {
    shake(mag) { shakeMag = Math.max(shakeMag, mag); shakeT = 1; },

    burst(x, y, color, n = 12, spd = 240) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = spd * (0.3 + Math.random());
        parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 70, life: 0.45 + Math.random() * 0.35, age: 0, color, size: 2 + Math.random() * 3 });
      }
    },

    popup(x, y, text, color = '#fff') {
      pops.push({ x, y, text, color, age: 0, life: 0.9 });
    },

    confetti(w) {
      const cols = ['#ffce3a', '#ff4d6d', '#36d1dc', '#74e08b', '#b06dff'];
      for (let i = 0; i < 90; i++) {
        parts.push({ x: Math.random() * w, y: -12, vx: (Math.random() * 2 - 1) * 80, vy: 80 + Math.random() * 160, life: 1.6, age: 0, color: cols[i % cols.length], size: 4 + Math.random() * 3 });
      }
    },

    update(dt) {
      if (shakeT > 0) { shakeT -= dt * 4; if (shakeT <= 0) { shakeT = 0; shakeMag = 0; } }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt;
        if (p.age >= p.life) { parts.splice(i, 1); continue; }
        p.vy += 900 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (let i = pops.length - 1; i >= 0; i--) {
        const q = pops[i];
        q.age += dt;
        q.y -= 42 * dt;
        if (q.age >= q.life) pops.splice(i, 1);
      }
    },

    shakeOffset() {
      const m = shakeMag * Math.max(0, shakeT);
      return { x: (Math.random() * 2 - 1) * m, y: (Math.random() * 2 - 1) * m };
    },

    draw(ctx) {
      for (const p of parts) {
        ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      for (const q of pops) {
        ctx.globalAlpha = Math.max(0, 1 - q.age / q.life);
        ctx.fillStyle = q.color;
        ctx.font = '800 26px Bangers, sans-serif';
        ctx.fillText(q.text, q.x, q.y);
      }
      ctx.globalAlpha = 1;
    },

    clear() { parts.length = 0; pops.length = 0; shakeMag = 0; shakeT = 0; },
  };
}
