import { TILE } from './constants.js';

export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  none: { x: 0, y: 0 },
};

export const DIR_NAMES = ['up', 'down', 'left', 'right'];

export function opposite(dir) {
  switch (dir) {
    case 'up': return 'down';
    case 'down': return 'up';
    case 'left': return 'right';
    case 'right': return 'left';
    default: return 'none';
  }
}

export function tileToPixelCenter(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

export function pixelToTile(x, y) {
  return { col: Math.floor(x / TILE), row: Math.floor(y / TILE) };
}

export function isCentered(pos, eps = 1.5) {
  const cx = (Math.floor(pos.x / TILE) + 0.5) * TILE;
  const cy = (Math.floor(pos.y / TILE) + 0.5) * TILE;
  return Math.abs(pos.x - cx) <= eps && Math.abs(pos.y - cy) <= eps;
}

export function stepTile(col, row, dir) {
  const d = DIRS[dir] || DIRS.none;
  return { col: col + d.x, row: row + d.y };
}

export function dist2(aCol, aRow, bCol, bRow) {
  const dx = aCol - bCol;
  const dy = aRow - bRow;
  return dx * dx + dy * dy;
}
