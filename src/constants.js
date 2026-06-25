export const TILE = 24;
export const COLS = 21;
export const ROWS = 23;

// Movement speeds in tiles per second.
export const SPEED = {
  BIKRAM: 5.2,
  BETAAL: 4.6,
  FRIGHT: 2.8,
  EATEN: 9.0,
};

export const FRIGHT_MS = 7000;
export const SCATTER_MS = 7000;
export const CHASE_MS = 20000;

export const SCORE = { DOT: 10, LAMP: 50, BETAAL_BASE: 200 };
export const LIVES = 3;

export const COLORS = {
  bg: '#0b0a1f',
  maze: '#120f33',
  wall: '#2a2466',
  wallEdge: '#5a4fd0',
  dot: '#e8d9a0',
  lamp: '#ffd24a',
  bikram: '#ffce3a',
  betaal: ['#ff4d6d', '#36d1dc', '#b06dff', '#74e08b'],
  frightened: '#9fb4ff',
  frightenedEnding: '#f2f4ff',
  eaten: '#7c86b8',
  text: '#f5f3ff',
  shrine: '#3b2f6e',
};

// Per-level scaling: faster Betaals, shorter fright window.
export function levelTuning(level) {
  return {
    betaalSpeed: SPEED.BETAAL + (level - 1) * 0.3,
    frightMs: Math.max(2000, FRIGHT_MS - (level - 1) * 800),
  };
}
