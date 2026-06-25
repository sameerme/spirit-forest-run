import { COLORS } from '../constants.js';

export function applyComic(ctx, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = COLORS.ink;
  for (let y = 0; y < h; y += 6) {
    for (let x = (y % 12 === 0 ? 0 : 3); x < w; x += 6) {
      ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
