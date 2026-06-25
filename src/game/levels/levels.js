import { GROUND_TOP, TILE } from '../../constants.js';
import { createSnake, createBat, createSpirit, createSphere, createPit, createPlatform } from '../entities.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Bat lanes (collision-box y): low forces a jump, high forces staying low.
const BAT_LOW = GROUND_TOP - 70;   // overlaps a grounded runner -> jump over
const BAT_HIGH = GROUND_TOP - 230; // only a threat if you jump into it
const BAT_MID = GROUND_TOP - 150;  // oscillating bats bob around this lane
const SPIRIT_BASE = GROUND_TOP - 200;
const SPHERE_HI = GROUND_TOP - 200;
const SPHERE_LO = GROUND_TOP - 70;

function strip(e) {
  const { anim: _anim, ...rest } = e; // eslint-disable-line no-unused-vars
  return rest;
}

export function buildLevel(def) {
  const rng = mulberry32(def.seed);
  const entities = [];
  const goalX = def.length - 240;
  let x = 900; // clear opening runway

  while (x < goalX - 700) {
    let placedRight = x;
    const roll = rng();
    if (roll < 0.28) {
      entities.push(strip(createSnake(x, def.snakeAmp, def.oscFreq)));
    } else if (roll < 0.5) {
      const n = 1 + Math.floor(rng() * def.maxBats);
      for (let k = 0; k < n; k++) {
        // oscillating bats fly a mid lane (stay above ground); static bats use hi/lo lanes
        const y = def.batAmp > 0 ? BAT_MID : (rng() < 0.5 ? BAT_LOW : BAT_HIGH);
        entities.push(strip(createBat(x + k * 130, y, def.batAmp, def.oscFreq)));
      }
      placedRight = x + (n - 1) * 130;
    } else if (roll < 0.68 && def.spirits) {
      entities.push(strip(createSpirit(x, SPIRIT_BASE, 90, 0.8 + rng() * 0.5)));
    } else if (roll < 0.86) {
      const tiles = 1 + Math.floor(rng() * def.maxPit);
      entities.push(strip(createPit(x, tiles)));
      placedRight = x + tiles * TILE;
      if (tiles >= 2 && rng() < 0.5) entities.push(strip(createPlatform(x + tiles * 30, GROUND_TOP - 150)));
    } else {
      entities.push(strip(createSnake(x, def.snakeAmp, def.oscFreq)));
    }

    // sprinkle a sphere in the gap after this obstacle
    if (rng() < def.sphereChance) {
      entities.push(strip(createSphere(placedRight + def.minGap * 0.45, rng() < 0.5 ? SPHERE_HI : SPHERE_LO)));
    }

    x = placedRight + def.minGap + Math.floor(rng() * 160);
  }

  entities.sort((a, b) => a.worldX - b.worldX);
  return { ...def, entities, goalX };
}

// ---- 15 levels, steep monotonic difficulty curve, generated from a formula ----
const N_LEVELS = 15;
const lerp = (a, b, t) => a + (b - a) * t;

function makeDef(i) {
  const t = (i - 1) / (N_LEVELS - 1); // 0..1 across the 15 levels
  return {
    id: i,
    speed: Math.round(lerp(180, 520, t)),       // faster each level
    minGap: Math.round(lerp(560, 300, t)),      // tighter spacing
    length: Math.round(lerp(6000, 16000, t)),   // longer stages
    spirits: i >= 3,
    maxBats: i < 3 ? 1 : i < 7 ? 2 : i < 11 ? 3 : 4,
    maxPit: i < 2 ? 1 : i < 5 ? 2 : i < 10 ? 3 : 4,
    sphereChance: Number(lerp(0.72, 0.3, t).toFixed(2)),
    seed: 100 + i * 7,
    // vertical movement ramps in: bats bob from L4, snakes rear from L5
    batAmp: i < 4 ? 0 : Math.round(lerp(0, 110, (i - 4) / (N_LEVELS - 4))),
    snakeAmp: i < 5 ? 0 : Math.round(lerp(0, 90, (i - 5) / (N_LEVELS - 5))),
    oscFreq: Number(lerp(0.8, 1.7, t).toFixed(2)),
  };
}

export const DEFS = Array.from({ length: N_LEVELS }, (_, k) => makeDef(k + 1));
export const LEVELS = DEFS.map(buildLevel);
