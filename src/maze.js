import { COLS, ROWS } from './constants.js';
import { stepTile } from './pathing.js';

export const LAYOUT = [
  '#####################',
  '#o.................o#',
  '#..###.###.###.###..#',
  '#...................#',
  '#..###.###.###.###..#',
  '#...................#',
  '#..###.###.###.###..#',
  '#...................#',
  '#...................#',
  '#...................#',
  '#...................#',
  '-.........S.........-',
  '#...................#',
  '#...................#',
  '#..###.###.###.###..#',
  '#...................#',
  '#..###.###.###.###..#',
  '#...................#',
  '#..###.###.###.###..#',
  '#...................#',
  '#.........P.........#',
  '#o.................o#',
  '#####################',
];

export function wrapCol(col) {
  if (col < 0) return COLS - 1;
  if (col >= COLS) return 0;
  return col;
}

export function createMaze() {
  const grid = LAYOUT.map((row) => row.split(''));
  let bikramSpawn = null;
  let shrine = null;
  const tunnelRows = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const ch = grid[r][c];
      if (ch === 'P') bikramSpawn = { col: c, row: r };
      if (ch === 'S') shrine = { col: c, row: r };
      if (ch === '-' && !tunnelRows.includes(r)) tunnelRows.push(r);
    }
  }
  return {
    grid,
    bikramSpawn,
    shrine,
    tunnelRows,
    isWall(col, row) {
      if (row < 0 || row >= ROWS) return true;
      if (col < 0 || col >= COLS) return false; // tunnel handled via wrapCol
      return grid[row][col] === '#';
    },
    eatAt(col, row) {
      const ch = grid[row]?.[col];
      if (ch === '.') { grid[row][col] = ' '; return 'dot'; }
      if (ch === 'o') { grid[row][col] = ' '; return 'lamp'; }
      return null;
    },
    remainingPellets() {
      let n = 0;
      for (const row of grid) for (const ch of row) if (ch === '.' || ch === 'o') n++;
      return n;
    },
  };
}

export function canMove(maze, col, row, dir) {
  const t = stepTile(col, row, dir);
  return !maze.isWall(wrapCol(t.col), t.row);
}
