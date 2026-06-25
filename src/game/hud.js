import { ENERGY_MAX, START_HEARTS, COLORS, VW } from '../constants.js';

export function drawHud(ctx, assets, { hearts, energy, score, level }) {
  const heart = assets.get('ui_hearts');
  const size = 40, pad = 16, top = 20;
  for (let i = 0; i < START_HEARTS; i++) {
    const frame = i < hearts ? 0 : 1;
    ctx.drawImage(heart.img, frame * heart.meta.fw, 0, heart.meta.fw, heart.meta.fh,
      pad + i * (size + 6), top, size, size);
  }
  // energy bar
  const bw = 180, bh = 16, bx = VW - bw - pad, by = top + 4;
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = COLORS.energy; ctx.fillRect(bx, by, bw * Math.min(1, energy / ENERGY_MAX), bh);
  ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
  // text
  ctx.fillStyle = COLORS.text; ctx.font = '34px Bangers, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`SCORE ${score}`, VW / 2, top + 34);
  ctx.textAlign = 'right'; ctx.font = '24px Bangers, sans-serif';
  ctx.fillText(`LEVEL ${level}`, VW - pad, top + 56);
  ctx.textAlign = 'left';
}
