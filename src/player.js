import { SPEED, TILE, COLS } from './constants.js';
import { DIRS, tileToPixelCenter, pixelToTile, isCentered } from './pathing.js';
import { canMove } from './maze.js';

const FIELD_W = COLS * TILE;

export function createBikram(maze) {
  const spawn = maze.bikramSpawn;
  const start = tileToPixelCenter(spawn.col, spawn.row);
  return {
    x: start.x,
    y: start.y,
    dir: 'left',
    nextDir: 'left',
    setNextDir(d) { this.nextDir = d; },
    tile() { return pixelToTile(this.x, this.y); },
    resetTo(col, row) {
      const c = tileToPixelCenter(col, row);
      this.x = c.x; this.y = c.y; this.dir = 'left'; this.nextDir = 'left';
    },
    update(dt) {
      let ate = null;
      const { col, row } = this.tile();

      if (isCentered(this)) {
        const c = tileToPixelCenter(col, row);
        this.x = c.x; this.y = c.y;

        ate = maze.eatAt(col, row);

        if (this.nextDir !== this.dir && canMove(maze, col, row, this.nextDir)) {
          this.dir = this.nextDir;
        }
        if (!canMove(maze, col, row, this.dir)) {
          return { ate }; // wall ahead: stop until a turn opens
        }
      }

      const d = DIRS[this.dir];
      const speed = SPEED.BIKRAM * TILE * dt;
      this.x += d.x * speed;
      this.y += d.y * speed;

      // Horizontal tunnel wrap.
      if (this.x < -TILE / 2) this.x += FIELD_W;
      else if (this.x > FIELD_W - TILE / 2) this.x -= FIELD_W;

      return { ate };
    },
  };
}
