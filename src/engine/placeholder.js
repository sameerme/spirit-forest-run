import { COLORS } from '../constants.js';

function halftone(ctx, x, y, w, h, color, step = 6) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = color;
  for (let yy = y; yy < y + h; yy += step) {
    for (let xx = x; xx < x + w; xx += step) {
      ctx.beginPath(); ctx.arc(xx, yy, step * 0.32, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function blob(ctx, cx, cy, r, fill) {
  ctx.fillStyle = fill; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

export function makePlaceholder(key, meta) {
  const c = document.createElement('canvas');
  c.width = meta.fw * meta.frames; c.height = meta.fh;
  const ctx = c.getContext('2d');
  for (let f = 0; f < meta.frames; f++) {
    const ox = f * meta.fw, w = meta.fw, h = meta.fh;
    ctx.save(); ctx.translate(ox, 0);
    drawKey(ctx, key, w, h, f);
    ctx.restore();
  }
  return c;
}

function drawKey(ctx, key, w, h, f) {
  const cx = w / 2, midC = COLORS;
  if (key.startsWith('bikram')) {
    const bob = key.includes('run') ? Math.sin(f / Math.max(1, 1)) * 3 : 0;
    blob(ctx, cx, h * 0.42 + bob, w * 0.3, key.includes('dash') ? midC.energy : midC.bikram);
    ctx.fillStyle = midC.ink; ctx.fillRect(cx - 14, h * 0.36, 6, 6); // eye
    ctx.fillRect(cx - 18, h * 0.7, 12, h * 0.28); ctx.fillRect(cx + 6, h * 0.7, 12, h * 0.28); // legs
    halftone(ctx, cx - w * 0.3, h * 0.42, w * 0.6, h * 0.3, midC.halftone);
    return;
  }
  if (key.startsWith('betaal')) { blob(ctx, cx, h * 0.5, w * 0.34, midC.betaal); halftone(ctx, 0, 0, w, h, midC.halftone); return; }
  if (key === 'snake') { ctx.fillStyle = midC.snake; ctx.strokeStyle = midC.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(cx, h * 0.6, w * 0.42, h * 0.32, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    halftone(ctx, 0, h * 0.4, w, h * 0.5, midC.halftone); return; }
  if (key === 'bat') { blob(ctx, cx, h * 0.5, w * 0.24, midC.bat);
    ctx.fillStyle = midC.bat; ctx.beginPath(); ctx.moveTo(cx - w * 0.45, h * 0.5);
    ctx.lineTo(cx, h * 0.3 + f * 2); ctx.lineTo(cx + w * 0.45, h * 0.5); ctx.lineTo(cx, h * 0.6); ctx.fill(); return; }
  if (key === 'spirit') { ctx.globalAlpha = 0.7; blob(ctx, cx, h * 0.45, w * 0.34, midC.spirit);
    halftone(ctx, 0, 0, w, h, 'rgba(159,232,255,0.25)'); ctx.globalAlpha = 1; return; }
  if (key === 'sphere') { blob(ctx, cx, h / 2, w * 0.4 - (f % 2), midC.sphere);
    ctx.globalAlpha = 0.5; blob(ctx, cx, h / 2, w * 0.24, midC.energy); ctx.globalAlpha = 1; return; }
  if (key === 'ground_tile' || key === 'ground_edge') {
    ctx.fillStyle = midC.ground; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = midC.groundTop; ctx.fillRect(0, 0, w, 10);
    halftone(ctx, 0, 10, w, h - 10, midC.halftone, 7); return; }
  if (key === 'platform_log') { ctx.fillStyle = midC.ground; ctx.strokeStyle = midC.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(2, 2, w - 4, h - 6, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = midC.groundTop; ctx.fillRect(4, 2, w - 8, 8); return; }
  if (key.startsWith('bg_')) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    const top = key === 'bg_far' ? midC.sky1 : key === 'bg_mid' ? midC.forestMid : midC.forestNear;
    g.addColorStop(0, top); g.addColorStop(1, midC.sky2); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    if (key === 'bg_far') blob(ctx, w * 0.8, h * 0.18, 60, midC.moon);
    const tint = key === 'bg_far' ? midC.forestFar : key === 'bg_mid' ? midC.forestMid : midC.forestNear;
    ctx.fillStyle = tint;
    for (let i = 0; i < 14; i++) { const tx = (i / 14) * w; ctx.fillRect(tx, h * 0.55, 40, h * 0.45); }
    halftone(ctx, 0, 0, w, h, midC.halftone, 9); return; }
  if (key === 'decor') { blob(ctx, w / 2, h * 0.6, w * 0.3, [midC.spirit, midC.snake, midC.betaal][f % 3]); return; }
  if (key === 'ui_hearts') { ctx.fillStyle = f === 0 ? midC.heart : 'transparent';
    ctx.strokeStyle = midC.heart; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(w / 2, h * 0.75);
    ctx.bezierCurveTo(w * 0.05, h * 0.4, w * 0.3, h * 0.1, w / 2, h * 0.35);
    ctx.bezierCurveTo(w * 0.7, h * 0.1, w * 0.95, h * 0.4, w / 2, h * 0.75);
    if (f === 0) ctx.fill(); ctx.stroke(); return; }
  if (key === 'title_logo') { ctx.fillStyle = midC.bikram; ctx.font = '64px Bangers, sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('SPIRIT FOREST RUN', w / 2, h / 2); return; }
  blob(ctx, w / 2, h / 2, Math.min(w, h) * 0.4, midC.text);
}
