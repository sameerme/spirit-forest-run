export const VW = 540;
export const VH = 960;
export const TILE = 60;
export const GROUND_TOP = VH - TILE * 2; // 840

export const GRAVITY = 2600;       // px/s^2
export const JUMP_V = 980;         // px/s upward impulse
export const DOUBLE_JUMP_V = 880;  // px/s upward impulse (2nd jump)

export const PLAYER_X = Math.round(VW * 0.28); // fixed screen x (151)
export const PLAYER_W = 70;
export const PLAYER_H = 96;

export const COYOTE_MS = 90;
export const JUMP_BUFFER_MS = 120;
export const INVULN_MS = 1000;
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
