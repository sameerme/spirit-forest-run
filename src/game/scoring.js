import { SPHERE_SCORE, CLEAR_BONUS, HEART_BONUS } from '../constants.js';

export function computeScore({ distance, spheres, hearts, levelsCleared }) {
  return Math.floor(distance / 10) + spheres * SPHERE_SCORE + levelsCleared * CLEAR_BONUS + hearts * HEART_BONUS;
}

export function loadProgress(store) {
  const high = Number(store.getItem('sfr-high') || 0);
  const level = Number(store.getItem('sfr-level') || 1);
  return { high, level: level || 1 };
}

export function saveProgress(store, { high, level }) {
  store.setItem('sfr-high', String(high));
  store.setItem('sfr-level', String(level));
}
