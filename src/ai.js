import { DIR_NAMES, opposite, stepTile, dist2 } from './pathing.js';
import { canMove, wrapCol } from './maze.js';

export function targetTile(personality, ctx) {
  switch (personality) {
    case 'chaser':
      return { col: ctx.bikram.col, row: ctx.bikram.row };
    case 'ambusher': {
      let t = { col: ctx.bikram.col, row: ctx.bikram.row };
      for (let i = 0; i < 4; i++) t = stepTile(t.col, t.row, ctx.bikram.dir);
      return t;
    }
    case 'shy': {
      const d = dist2(ctx.betaal.col, ctx.betaal.row, ctx.bikram.col, ctx.bikram.row);
      return d > 16 ? { col: ctx.bikram.col, row: ctx.bikram.row } : ctx.corner;
    }
    case 'roamer':
    default:
      return ctx.corner;
  }
}

export function chooseDirection(maze, fromCol, fromRow, currentDir, target, opts = {}) {
  const { random = false, rng = Math.random } = opts;
  const back = opposite(currentDir);
  let options = DIR_NAMES.filter((d) => d !== back && canMove(maze, fromCol, fromRow, d));
  if (options.length === 0) {
    options = DIR_NAMES.filter((d) => canMove(maze, fromCol, fromRow, d));
  }
  if (options.length === 0) return currentDir;
  if (random) return options[Math.floor(rng() * options.length)];

  let best = options[0];
  let bestD = Infinity;
  for (const d of options) {
    const n = stepTile(fromCol, fromRow, d);
    const dd = dist2(wrapCol(n.col), n.row, target.col, target.row);
    if (dd < bestD) { bestD = dd; best = d; }
  }
  return best;
}
