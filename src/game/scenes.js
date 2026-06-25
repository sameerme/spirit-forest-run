import { VW, VH, COLORS } from '../constants.js';

const COPY = {
  title:    { t: 'SPIRIT FOREST RUN', s: 'Bikram & the Betaal', p: 'TAP TO BEGIN' },
  level:    { t: 'LEVEL', s: '', p: 'TAP TO RUN' },
  clear:    { t: 'BETAAL CAPTURED', s: '', p: 'TAP FOR NEXT LEVEL' },
  gameover: { t: 'BETAAL WON', s: '', p: 'TAP TO RETRY' },
  victory:  { t: 'YOU SAVED BETAAL!', s: 'All levels cleared', p: 'TAP TO PLAY AGAIN' },
};

export function drawOverlay(ctx, kind, data = {}) {
  const c = COPY[kind] || COPY.title;
  ctx.save();
  ctx.fillStyle = 'rgba(7,5,15,0.78)'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.bikram; ctx.font = '72px Bangers, sans-serif';
  const title = kind === 'level' ? `LEVEL ${data.level || 1}` : c.t;
  ctx.fillText(title, VW / 2, VH * 0.4);
  if (c.s) { ctx.fillStyle = COLORS.text; ctx.font = '34px Bangers, sans-serif'; ctx.fillText(c.s, VW / 2, VH * 0.4 + 50); }
  if (data.score != null) { ctx.fillStyle = COLORS.text; ctx.font = '30px Bangers, sans-serif'; ctx.fillText(`SCORE ${data.score}`, VW / 2, VH * 0.5); }
  ctx.fillStyle = COLORS.energy; ctx.font = '36px Bangers, sans-serif';
  ctx.fillText(c.p, VW / 2, VH * 0.62);
  ctx.restore();
}
