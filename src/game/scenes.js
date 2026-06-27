import { VW, VH, COLORS } from '../constants.js';

const COPY = {
  title:    { t: 'ବିକ୍ରମ ବେତାଳ', s: '', p: 'TAP TO BEGIN' },
  level:    { t: 'LEVEL', s: '', p: 'TAP TO RUN' },
  clear:    { t: 'BETAAL CAPTURED', s: '', p: 'TAP FOR NEXT LEVEL' },
  revive:   { t: 'CONTINUE?', s: '', p: 'TAP TO GIVE UP' },
  gameover: { t: 'BETAAL WON', s: '', p: 'TAP TO RETRY' },
  victory:  { t: 'YOU SAVED BETAAL!', s: 'All levels cleared', p: 'TAP TO PLAY AGAIN' },
};

export function drawOverlay(ctx, kind, data = {}) {
  const c = COPY[kind] || COPY.title;
  ctx.save();
  ctx.fillStyle = 'rgba(7,5,15,0.78)'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center';

  // Optional advertisement above the title (end screens), ~40% of screen height.
  // When present, the title and everything below it shift down to sit under it.
  let titleY = VH * 0.4;
  if (data.ad && data.ad.naturalWidth) {
    const img = data.ad;
    const maxH = VH * 0.40, maxW = VW * 0.92;
    const scale = Math.min(maxH / img.naturalHeight, maxW / img.naturalWidth);
    const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
    const top = VH * 0.06;
    ctx.drawImage(img, (VW - w) / 2, top, w, h);
    titleY = top + h + 64;
  }

  ctx.fillStyle = COLORS.bikram;
  // The title screen name is in Odia script -> use Baloo Bhaina 2 (covers Odia);
  // every other title stays in the comic Bangers face.
  ctx.font = kind === 'title' ? '700 60px "Baloo Bhaina 2", sans-serif' : '72px Bangers, sans-serif';
  const title = kind === 'level' ? `LEVEL ${data.level || 1}` : c.t;
  ctx.fillText(title, VW / 2, titleY);
  if (c.s) { ctx.fillStyle = COLORS.text; ctx.font = '34px Bangers, sans-serif'; ctx.fillText(c.s, VW / 2, titleY + 50); }

  if (kind === 'title') {
    // streak + coins + best on the title screen
    if (data.streak > 0) { ctx.fillStyle = COLORS.bikram; ctx.font = '30px Bangers, sans-serif'; ctx.fillText(`🔥 ${data.streak} DAY STREAK`, VW / 2, VH * 0.52); }
    ctx.fillStyle = COLORS.text; ctx.font = '26px Bangers, sans-serif';
    ctx.fillText(`BEST ${data.high || 0}   ·   🪙 ${data.coins || 0}`, VW / 2, VH * 0.57);
  } else if (data.score != null) {
    if (data.newHigh) { ctx.fillStyle = COLORS.bikram; ctx.font = '32px Bangers, sans-serif'; ctx.fillText('★ NEW HIGH SCORE! ★', VW / 2, titleY + 67); }
    ctx.fillStyle = COLORS.text; ctx.font = '30px Bangers, sans-serif';
    ctx.fillText(`SCORE ${data.score}`, VW / 2, titleY + 115);
    if (data.high != null) { ctx.fillStyle = 'rgba(245,243,255,0.75)'; ctx.font = '24px Bangers, sans-serif'; ctx.fillText(`BEST ${data.high}`, VW / 2, titleY + 158); }
  }

  ctx.fillStyle = COLORS.energy; ctx.font = '36px Bangers, sans-serif';
  ctx.fillText(c.p, VW / 2, titleY + 230);
  ctx.restore();
}
