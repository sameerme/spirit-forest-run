export const VW = 540;
export const VH = 960;
export const TILE = 60;
export const GROUND_TOP = VH - TILE * 2; // 840

export const GRAVITY = 2050;       // px/s^2 (lower = floatier, longer hang-time)
export const JUMP_V = 980;         // px/s upward impulse (higher apex under lower gravity)
export const DOUBLE_JUMP_V = 860;  // px/s upward impulse (2nd jump)

export const PLAYER_X = Math.round(VW * 0.28); // fixed screen x (151)
export const PLAYER_W = 70;
export const PLAYER_H = 96;

export const COYOTE_MS = 150;       // forgiving: jump shortly after leaving a ledge
export const JUMP_BUFFER_MS = 170;  // forgiving: tap slightly before landing still jumps
export const INVULN_MS = 1300;      // longer recovery i-frames after a hit
export const DASH_MS = 2000;

export const ENERGY_MAX = 100;
export const ENERGY_PER_SPHERE = 34;
export const SPHERE_SCORE = 50;
export const CLEAR_BONUS = 500;
export const HEART_BONUS = 200;
export const START_HEARTS = 3;

export const COLORS = {
  ink: '#141019',
  sky1: '#241a3a',
  sky2: '#0e0a1c',
  moon: '#f4ecd0',
  forestFar: '#2a2350',
  forestMid: '#1c2c2a',
  forestNear: '#10201c',
  ground: '#3a2d22',
  groundTop: '#5a4a32',
  bikram: '#ffce3a',
  bikramInk: '#7a4a12',
  betaal: '#b06dff',
  snake: '#74e08b',
  bat: '#ff4d6d',
  spirit: '#9fe8ff',
  sphere: '#ffd24a',
  heart: '#ff4d6d',
  energy: '#36d1dc',
  text: '#f5f3ff',
  halftone: 'rgba(10,8,20,0.16)',
};

// ---- Promo banner (decorative, recurring billboard in the forest canopy) ----
// EDIT THIS to change the promo. No image needed — text is drawn at runtime.
export const PROMO = { title: 'ବିକ୍ରମ ବେତାଳ', date: 'କେବଳ ତରଙ୍ଗ+ ରେ ଜୁଲାଇ 3ରୁ' };
// Font used for the promo text (must cover Odia script).
export const PROMO_FONT = '"Baloo Bhaina 2", "Noto Sans Oriya", sans-serif';
// Banner geometry (virtual px). Sits in the top canopy band, clear of gameplay.
export const BANNER = { w: 480, h: 150, y: 110, spacing: 1100, parallax: 1.0 };
