import { GROUND_TOP } from '../../constants.js';
import { createSnake, createBat, createSpirit, createSphere, createPit, createPlatform } from '../entities.js';
import level1 from './level1.js';
import level2 from './level2.js';
import level3 from './level3.js';
import level4 from './level4.js';
import level5 from './level5.js';

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
    const roll = rng();
    if (roll < 0.28) {
      entities.push(strip(createSnake(x)));
    } else if (roll < 0.5) {
      const n = 1 + Math.floor(rng() * def.maxBats);
      for (let k = 0; k < n; k++) {
        const y = rng() < 0.5 ? BAT_LOW : BAT_HIGH;
        entities.push(strip(createBat(x + k * 120, y)));
      }
    } else if (roll < 0.68 && def.spirits) {
      entities.push(strip(createSpirit(x, SPIRIT_BASE, 90, 0.8 + rng() * 0.5)));
    } else if (roll < 0.86) {
      const tiles = 1 + Math.floor(rng() * def.maxPit);
      entities.push(strip(createPit(x, tiles)));
      if (tiles >= 2 && rng() < 0.5) entities.push(strip(createPlatform(x + tiles * 30, GROUND_TOP - 150)));
    } else {
      entities.push(strip(createSnake(x))); // fallback obstacle keeps spacing honest
    }

    // sprinkle a sphere in the gap after this obstacle
    if (rng() < def.sphereChance) {
      entities.push(strip(createSphere(x + def.minGap * 0.55, rng() < 0.5 ? SPHERE_HI : SPHERE_LO)));
    }

    x += def.minGap + Math.floor(rng() * 160);
  }

  entities.sort((a, b) => a.worldX - b.worldX);
  return { ...def, entities, goalX };
}

export const LEVELS = [level1, level2, level3, level4, level5].map(buildLevel);
