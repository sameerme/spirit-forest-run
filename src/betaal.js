import { SPEED, TILE, COLS } from './constants.js';
import { DIRS, tileToPixelCenter, pixelToTile, isCentered, opposite } from './pathing.js';
import { targetTile, chooseDirection } from './ai.js';

const FIELD_W = COLS * TILE;

export function createBetaal(maze, { personality, spawn, corner, color }) {
  const start = tileToPixelCenter(spawn.col, spawn.row);
  return {
    x: start.x,
    y: start.y,
    dir: 'up',
    mode: 'scatter',
    frightMs: 0,
    personality,
    color,
    corner,
    spawn,
    tile() { return pixelToTile(this.x, this.y); },
    frighten(ms) {
      if (this.mode === 'eaten') return;
      const wasFrightened = this.mode === 'frightened';
      this.mode = 'frightened';
      this.frightMs = ms;
      if (!wasFrightened) this.dir = opposite(this.dir);
    },
    setEaten() { this.mode = 'eaten'; },
    resetTo() {
      const c = tileToPixelCenter(spawn.col, spawn.row);
      this.x = c.x; this.y = c.y; this.dir = 'up'; this.mode = 'scatter'; this.frightMs = 0;
    },
    update(dt, ctx) {
      if (this.mode === 'frightened') {
        this.frightMs -= dt * 1000;
        if (this.frightMs <= 0) this.mode = ctx.globalMode;
      }

      const { col, row } = this.tile();

      if (isCentered(this)) {
        const c = tileToPixelCenter(col, row);
        this.x = c.x; this.y = c.y;

        if (this.mode === 'eaten' && col === maze.shrine.col && row === maze.shrine.row) {
          this.mode = ctx.globalMode;
        }

        let target;
        let random = false;
        if (this.mode === 'eaten') {
          target = maze.shrine;
        } else if (this.mode === 'frightened') {
          random = true;
          target = { col, row };
        } else if (this.mode === 'scatter') {
          target = this.corner;
        } else if (this.personality === 'roamer') {
          random = true;
          target = ctx.bikram;
        } else {
          target = targetTile(this.personality, {
            bikram: ctx.bikram,
            betaal: { col, row },
            corner: this.corner,
            shrine: maze.shrine,
          });
        }
        this.dir = chooseDirection(maze, col, row, this.dir, target, { random });
      }

      const d = DIRS[this.dir];
      let speedTiles = ctx.betaalSpeed;
      if (this.mode === 'frightened') speedTiles = SPEED.FRIGHT;
      else if (this.mode === 'eaten') speedTiles = SPEED.EATEN;
      const speed = speedTiles * TILE * dt;
      this.x += d.x * speed;
      this.y += d.y * speed;

      if (this.x < -TILE / 2) this.x += FIELD_W;
      else if (this.x > FIELD_W - TILE / 2) this.x -= FIELD_W;
    },
  };
}
