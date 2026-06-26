import { ENERGY_MAX, START_HEARTS, COLORS, VW } from '../constants.js';

export function drawHud(ctx, assets, { hearts, energy, score, level, combo = 1, coins = 0 }) {
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
  // score + level
  ctx.fillStyle = COLORS.text; ctx.font = '34px Bangers, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`SCORE ${score}`, VW / 2, top + 34);
  ctx.textAlign = 'right'; ctx.font = '24px Bangers, sans-serif';
  ctx.fillText(`LEVEL ${level}`, VW - pad, top + 56);
  // coins (under the hearts)
  ctx.textAlign = 'left'; ctx.fillStyle = COLORS.sphere; ctx.font = '26px Bangers, sans-serif';
  ctx.fillText(`🪙 ${coins}`, pad, top + 76);
  // combo multiplier (pops when chaining)
  if (combo > 1) {
    ctx.textAlign = 'center'; ctx.fillStyle = COLORS.bikram;
    ctx.font = `${28 + combo * 3}px Bangers, sans-serif`;
    ctx.fillText(`x${combo}`, VW / 2, top + 74);
  }
  ctx.textAlign = 'left';
}
