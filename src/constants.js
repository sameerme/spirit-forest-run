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
export const DASH_MS = 650;         // sword-strike active window (i-frames + kills)
export const DASH_COOLDOWN_MS = 1100; // dash is cooldown-gated, not energy-gated

// ---- Combat & powers (wave 2) ----
export const FURY_MS = 4000;        // Fury Mode: invincible auto-kill duration
export const STOMP_BOUNCE_V = 640;  // upward bounce after stomping an enemy
export const ENEMY_KILL_SCORE = 60; // base score per enemy killed (x combo)
export const KILL_ENERGY = 6;       // energy gained per enemy killed (feeds Fury)

// ---- Continue / revive ----
export const REVIVE_COST_BASE = 50;   // coin cost of the 1st revive (doubles each time)
export const REVIVE_INVULN_MS = 2200; // grace i-frames granted on revive

// ---- Level intro cinematic (Betaal escapes off Bikram's shoulder) ----
export const INTRO_MS = 2000;

// ---- Boss fight (level 15) ----
export const BOSS_HP = 6;        // hits to defeat Betaal
export const BOSS_HIT_SCORE = 250; // score per boss hit
export const BOSS_SCORE = 3000;  // bonus for defeating the boss

// ---- Fury fire pickup (reachable only with a double jump) ----
export const FURY_FIRE_Y = GROUND_TOP - 430; // high enough to need a 2nd jump
export const FURY_FIRE_RESPAWN_S = 2.5;      // gap before another fire appears
// ---- Enemy death (stomp/kill) shrink-and-fall, Mario-style ----
export const DEATH_MS = 480;          // shrink/fade duration
export const DEATH_FALL = 320;        // px/s the dying enemy drops while shrinking

export const COMBO_CAP = 6;          // max sphere score multiplier
export const COIN_PER_SPHERE = 1;    // coins banked per sphere
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
