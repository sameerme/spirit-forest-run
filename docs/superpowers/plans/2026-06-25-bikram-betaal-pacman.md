# Bikram Betaal: The Hunt — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, single-maze Pac-Man-style arcade game where King Bikram hunts Betaal spirits, eating magic lamps to turn them edible.

**Architecture:** Static, no-build HTML5 Canvas game in vanilla ES modules. Pure-logic modules (geometry, maze, AI, entities) are unit-tested with `node:test`; the canvas render loop and wiring live in `main.js` and are verified by playing. One `requestAnimationFrame` loop drives a small state machine.

**Tech Stack:** HTML5 Canvas, vanilla JavaScript (ES modules), WebAudio, `node:test` (Node 22, built-in). No third-party dependencies.

## Global Constraints

- No build step; runs by opening `index.html` or via `python3 -m http.server`.
- No third-party runtime or test dependencies — vanilla JS + `node --test` only.
- `package.json` MUST set `"type": "module"` so `.js` files are ESM in Node and the browser.
- Tested modules MUST NOT import browser-only APIs (`document`, `window`, `AudioContext`, `canvas`). Only `audio.js` and `main.js` may touch the DOM/WebAudio.
- Grid: `TILE = 24`, `COLS = 21`, `ROWS = 23`. All coordinates derive from these.
- Maze tile legend: `#` wall, `.` dot, `o` lamp, ` ` empty path, `P` Bikram spawn, `S` shrine, `-` tunnel mouth.
- Immutability: do not mutate shared config objects; the only intentional mutation is the maze `grid` when pellets are eaten (encapsulated in `maze.eatAt`).
- Use `requestAnimationFrame` with a delta-time (`dt` in seconds) movement model; speeds are expressed in tiles/second.
- Commit after every task with a conventional-commit message.

---

## File Structure

```
bikram_betaal/
├── package.json        # {"type":"module"} + test script
├── index.html          # canvas, HUD, overlay screens
├── styles.css          # tokens, layout, HUD, overlays, mobile D-pad
├── src/
│   ├── constants.js    # tunables: grid, speeds, timings, scores, colors
│   ├── pathing.js      # pure tile/pixel geometry + direction math
│   ├── maze.js         # LAYOUT data + grid queries (isWall, eatAt, counts)
│   ├── ai.js           # per-personality target tile + direction choice
│   ├── player.js       # Bikram entity: movement, buffered turn, eating
│   ├── betaal.js       # Betaal entity: modes + AI-driven movement
│   ├── audio.js        # WebAudio tone beeps (browser only)
│   └── main.js         # loop, state machine, input, render, collisions
├── test/
│   ├── pathing.test.js
│   ├── maze.test.js
│   ├── ai.test.js
│   ├── player.test.js
│   └── betaal.test.js
└── README.md
```

---

## Task 1: Project scaffold + constants

**Files:**
- Create: `package.json`, `index.html`, `styles.css`, `src/constants.js`, `README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `constants.js` exports `TILE, COLS, ROWS, SPEED, FRIGHT_MS, SCATTER_MS, CHASE_MS, SCORE, LIVES, COLORS, levelTuning(level)`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "bikram-betaal",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "node --test",
    "serve": "python3 -m http.server 8000"
  }
}
```

- [ ] **Step 2: Create `src/constants.js`**

```js
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
```

- [ ] **Step 3: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>Bikram Betaal: The Hunt</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main class="stage">
    <header class="hud">
      <div class="hud__item"><span class="hud__label">Score</span><span id="score">0</span></div>
      <div class="hud__item"><span class="hud__label">High</span><span id="highscore">0</span></div>
      <div class="hud__item"><span class="hud__label">Level</span><span id="level">1</span></div>
      <div class="hud__item hud__lives"><span class="hud__label">Lives</span><span id="lives"></span></div>
    </header>

    <div class="board">
      <canvas id="game" width="504" height="552" aria-label="Bikram Betaal maze"></canvas>
      <div id="overlay" class="overlay" hidden>
        <h1 id="overlay-title">Bikram Betaal</h1>
        <p id="overlay-text">Press Enter or tap to begin</p>
      </div>
    </div>

    <nav class="dpad" aria-label="Movement controls">
      <button class="dpad__btn dpad__up" data-dir="up" aria-label="Up">▲</button>
      <button class="dpad__btn dpad__left" data-dir="left" aria-label="Left">◀</button>
      <button class="dpad__btn dpad__down" data-dir="down" aria-label="Down">▼</button>
      <button class="dpad__btn dpad__right" data-dir="right" aria-label="Right">▶</button>
    </nav>
  </main>

  <script type="module" src="src/main.js"></script>
</body>
</html>
```

Note: canvas is `COLS*TILE = 504` wide, `ROWS*TILE = 552` tall.

- [ ] **Step 4: Create `styles.css` (baseline; polished further in Task 9)**

```css
:root {
  --color-bg: #07061a;
  --color-panel: #0b0a1f;
  --color-text: #f5f3ff;
  --color-accent: #ffce3a;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --radius: 12px;
  --font: "Trebuchet MS", "Segoe UI", system-ui, sans-serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  background: radial-gradient(circle at 50% 0%, #16123a 0%, var(--color-bg) 70%);
  color: var(--color-text);
  font-family: var(--font);
  display: grid;
  place-items: center;
}

.stage { display: flex; flex-direction: column; gap: var(--space-md); padding: var(--space-md); }

.hud {
  display: flex;
  justify-content: space-between;
  gap: var(--space-md);
  font-variant-numeric: tabular-nums;
}
.hud__item { display: flex; flex-direction: column; align-items: center; }
.hud__label { font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.6; }

.board { position: relative; }
canvas { display: block; border-radius: var(--radius); background: var(--color-panel); }

.overlay {
  position: absolute; inset: 0;
  display: grid; place-content: center; text-align: center;
  background: rgba(7, 6, 26, 0.82);
  border-radius: var(--radius);
}
.overlay[hidden] { display: none; }
.overlay h1 { color: var(--color-accent); margin: 0 0 var(--space-sm); }

.dpad { display: none; }

@media (pointer: coarse) {
  .dpad {
    display: grid;
    grid-template-columns: repeat(3, 56px);
    grid-template-rows: repeat(3, 56px);
    gap: var(--space-sm);
    justify-content: center;
  }
  .dpad__btn { font-size: 1.3rem; border: none; border-radius: 10px; background: #1d1947; color: var(--color-text); }
  .dpad__up { grid-area: 1 / 2; }
  .dpad__left { grid-area: 2 / 1; }
  .dpad__down { grid-area: 3 / 2; }
  .dpad__right { grid-area: 2 / 3; }
}
```

- [ ] **Step 5: Create `README.md`**

```markdown
# Bikram Betaal: The Hunt

A Pac-Man-style arcade game themed on the Vikram-Betaal folklore. King Bikram
hunts the Betaal spirits through a maze. Touching a Betaal normally costs a
life — but eat a **magic lamp** and the Betaals turn vulnerable, letting Bikram
devour them for big points.

## Play

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Or just open `index.html` in a browser.

Controls: Arrow keys / WASD, or the on-screen D-pad on touch devices.

## Test

```bash
node --test
```
```

- [ ] **Step 6: Manual verification**

Run: `cd bikram_betaal && python3 -m http.server 8000` then open `http://localhost:8000`.
Expected: page loads, dark background, empty 504×552 canvas, HUD showing Score/High/Level/Lives. Browser console error `main.js 404`/empty is acceptable at this stage (created in Task 8).

- [ ] **Step 7: Commit**

```bash
git add package.json index.html styles.css src/constants.js README.md
git commit -m "feat: scaffold bikram betaal game shell and constants"
```

---

## Task 2: Pathing geometry (`pathing.js`)

**Files:**
- Create: `src/pathing.js`
- Test: `test/pathing.test.js`

**Interfaces:**
- Consumes: `TILE` from `constants.js`.
- Produces:
  - `DIRS` — map of `up/down/left/right/none` to `{x,y}` unit deltas.
  - `DIR_NAMES` — `['up','down','left','right']`.
  - `opposite(dir) -> string`
  - `tileToPixelCenter(col,row) -> {x,y}`
  - `pixelToTile(x,y) -> {col,row}`
  - `isCentered(pos, eps=1.5) -> boolean` (pos has `.x,.y`)
  - `stepTile(col,row,dir) -> {col,row}`
  - `dist2(aCol,aRow,bCol,bRow) -> number`

- [ ] **Step 1: Write the failing test**

```js
// test/pathing.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIRS, DIR_NAMES, opposite, tileToPixelCenter, pixelToTile,
  isCentered, stepTile, dist2,
} from '../src/pathing.js';

test('opposite returns the reverse direction', () => {
  assert.equal(opposite('up'), 'down');
  assert.equal(opposite('left'), 'right');
  assert.equal(opposite('none'), 'none');
});

test('tileToPixelCenter returns the tile centre', () => {
  assert.deepEqual(tileToPixelCenter(0, 0), { x: 12, y: 12 });
  assert.deepEqual(tileToPixelCenter(2, 3), { x: 60, y: 84 });
});

test('pixelToTile floors pixels into tile coords', () => {
  assert.deepEqual(pixelToTile(12, 12), { col: 0, row: 0 });
  assert.deepEqual(pixelToTile(60, 84), { col: 2, row: 3 });
});

test('isCentered is true at the centre, false off-centre', () => {
  assert.equal(isCentered({ x: 12, y: 12 }), true);
  assert.equal(isCentered({ x: 18, y: 12 }), false);
});

test('stepTile moves one tile in a direction', () => {
  assert.deepEqual(stepTile(5, 5, 'left'), { col: 4, row: 5 });
  assert.deepEqual(stepTile(5, 5, 'down'), { col: 5, row: 6 });
});

test('dist2 returns squared euclidean distance', () => {
  assert.equal(dist2(0, 0, 3, 4), 25);
});

test('DIR_NAMES lists the four real directions', () => {
  assert.deepEqual(DIR_NAMES, ['up', 'down', 'left', 'right']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/pathing.test.js`
Expected: FAIL — `Cannot find module '../src/pathing.js'`.

- [ ] **Step 3: Write `src/pathing.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/pathing.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pathing.js test/pathing.test.js
git commit -m "feat: add pathing geometry helpers with tests"
```

---

## Task 3: Maze data & queries (`maze.js`)

**Files:**
- Create: `src/maze.js`
- Test: `test/maze.test.js`

**Interfaces:**
- Consumes: `COLS, ROWS` from `constants.js`; `stepTile` from `pathing.js`.
- Produces:
  - `LAYOUT` — array of 23 strings, each 21 chars.
  - `createMaze() -> maze` where `maze` has:
    - `grid` (array of char arrays, mutated by `eatAt`)
    - `bikramSpawn {col,row}`, `shrine {col,row}`, `tunnelRows number[]`
    - `isWall(col,row) -> boolean`
    - `eatAt(col,row) -> 'dot' | 'lamp' | null` (clears the tile)
    - `remainingPellets() -> number`
  - `wrapCol(col) -> number` (tunnel wrap on the X axis)
  - `canMove(maze, col, row, dir) -> boolean` (wraps col, then checks wall)

- [ ] **Step 1: Write the failing test**

```js
// test/maze.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAYOUT, createMaze, wrapCol, canMove } from '../src/maze.js';
import { COLS, ROWS } from '../src/constants.js';
import { DIR_NAMES, stepTile } from '../src/pathing.js';

test('layout has ROWS rows each COLS wide', () => {
  assert.equal(LAYOUT.length, ROWS);
  for (const row of LAYOUT) assert.equal(row.length, COLS);
});

test('createMaze finds spawn and shrine', () => {
  const m = createMaze();
  assert.ok(m.bikramSpawn, 'bikram spawn present');
  assert.ok(m.shrine, 'shrine present');
});

test('every pellet is reachable from the spawn (flood fill)', () => {
  const m = createMaze();
  const seen = new Set();
  const key = (c, r) => `${c},${r}`;
  const stack = [[m.bikramSpawn.col, m.bikramSpawn.row]];
  while (stack.length) {
    const [c, r] = stack.pop();
    if (seen.has(key(c, r))) continue;
    seen.add(key(c, r));
    for (const d of DIR_NAMES) {
      const n = stepTile(c, r, d);
      const nc = wrapCol(n.col);
      if (!m.isWall(nc, n.row) && !seen.has(key(nc, n.row))) stack.push([nc, n.row]);
    }
  }
  let pellets = 0, reached = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = m.grid[r][c];
      if (ch === '.' || ch === 'o') { pellets++; if (seen.has(key(c, r))) reached++; }
    }
  }
  assert.ok(pellets > 100, `expected a well-filled maze, got ${pellets} pellets`);
  assert.equal(reached, pellets, 'all pellets reachable');
});

test('there are exactly 4 lamps', () => {
  const m = createMaze();
  let lamps = 0;
  for (const row of m.grid) for (const ch of row) if (ch === 'o') lamps++;
  assert.equal(lamps, 4);
});

test('eatAt clears dots/lamps and decrements remaining', () => {
  const m = createMaze();
  const before = m.remainingPellets();
  // first lamp is at (1,1)
  assert.equal(m.eatAt(1, 1), 'lamp');
  assert.equal(m.eatAt(1, 1), null);
  assert.equal(m.remainingPellets(), before - 1);
});

test('isWall reports borders and open paths', () => {
  const m = createMaze();
  assert.equal(m.isWall(0, 0), true);
  assert.equal(m.isWall(m.bikramSpawn.col, m.bikramSpawn.row), false);
});

test('wrapCol wraps across the horizontal axis', () => {
  assert.equal(wrapCol(-1), COLS - 1);
  assert.equal(wrapCol(COLS), 0);
  assert.equal(wrapCol(5), 5);
});

test('canMove blocks into walls and allows open tiles', () => {
  const m = createMaze();
  const s = m.bikramSpawn;
  const open = DIR_NAMES.some((d) => canMove(m, s.col, s.row, d));
  assert.equal(open, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/maze.test.js`
Expected: FAIL — `Cannot find module '../src/maze.js'`.

- [ ] **Step 3: Write `src/maze.js`**

The layout is symmetric, ring-connected (full-dot border corridor plus open
columns 1 and 19), with 1×3 wall islands, an open central shrine `S`, a tunnel
row, Bikram spawn `P` near the bottom, and 4 corner lamps.

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/maze.test.js`
Expected: PASS. If the flood-fill test fails, the layout has an unreachable pocket — open a wall tile (change a `#` to `.`) on the offending island until reachable == pellets, keeping rows 21 chars wide and left/right symmetry. Re-run until green.

- [ ] **Step 5: Commit**

```bash
git add src/maze.js test/maze.test.js
git commit -m "feat: add maze layout and grid queries with connectivity test"
```

---

## Task 4: Betaal AI (`ai.js`)

**Files:**
- Create: `src/ai.js`
- Test: `test/ai.test.js`

**Interfaces:**
- Consumes: `DIR_NAMES, opposite, stepTile, dist2` from `pathing.js`; `canMove, wrapCol` from `maze.js`.
- Produces:
  - `targetTile(personality, ctx) -> {col,row}` where
    `ctx = { bikram:{col,row,dir}, betaal:{col,row}, corner:{col,row}, shrine:{col,row} }`
    and `personality` is `'chaser' | 'ambusher' | 'shy' | 'roamer'`.
  - `chooseDirection(maze, fromCol, fromRow, currentDir, target, opts) -> string`
    with `opts = { random=false, rng=Math.random }`. Never reverses unless it is
    the only option; among legal non-reverse moves picks the one minimising
    `dist2` to `target` (or a random legal one when `random` is true).

- [ ] **Step 1: Write the failing test**

```js
// test/ai.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { targetTile, chooseDirection } from '../src/ai.js';
import { createMaze } from '../src/maze.js';

test('chaser targets Bikram tile', () => {
  const t = targetTile('chaser', {
    bikram: { col: 5, row: 6, dir: 'left' },
    betaal: { col: 1, row: 1 }, corner: { col: 1, row: 1 }, shrine: { col: 10, row: 11 },
  });
  assert.deepEqual(t, { col: 5, row: 6 });
});

test('ambusher targets four tiles ahead of Bikram', () => {
  const t = targetTile('ambusher', {
    bikram: { col: 10, row: 10, dir: 'up' },
    betaal: { col: 1, row: 1 }, corner: { col: 1, row: 1 }, shrine: { col: 10, row: 11 },
  });
  assert.deepEqual(t, { col: 10, row: 6 });
});

test('shy chases when far, retreats to corner when close', () => {
  const corner = { col: 1, row: 21 };
  const far = targetTile('shy', {
    bikram: { col: 18, row: 2, dir: 'left' },
    betaal: { col: 1, row: 20 }, corner, shrine: { col: 10, row: 11 },
  });
  assert.deepEqual(far, { col: 18, row: 2 });
  const near = targetTile('shy', {
    bikram: { col: 2, row: 20, dir: 'left' },
    betaal: { col: 1, row: 20 }, corner, shrine: { col: 10, row: 11 },
  });
  assert.deepEqual(near, corner);
});

test('chooseDirection moves toward the target and never reverses needlessly', () => {
  const m = createMaze();
  // From the open spawn row, target far to the left -> should pick a legal move,
  // and must not be the reverse of currentDir unless forced.
  const s = m.bikramSpawn;
  const dir = chooseDirection(m, s.col, s.row, 'left', { col: 0, row: s.row });
  assert.ok(['up', 'down', 'left', 'right'].includes(dir));
  assert.notEqual(dir, 'right'); // 'right' is the reverse of 'left' and is not forced here
});

test('chooseDirection with random=true returns a legal move deterministically with seeded rng', () => {
  const m = createMaze();
  const s = m.bikramSpawn;
  const dir = chooseDirection(m, s.col, s.row, 'left', { col: 0, row: 0 }, { random: true, rng: () => 0 });
  assert.ok(['up', 'down', 'left', 'right'].includes(dir));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/ai.test.js`
Expected: FAIL — `Cannot find module '../src/ai.js'`.

- [ ] **Step 3: Write `src/ai.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/ai.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ai.js test/ai.test.js
git commit -m "feat: add betaal targeting and direction-choice AI with tests"
```

---

## Task 5: Bikram entity (`player.js`)

**Files:**
- Create: `src/player.js`
- Test: `test/player.test.js`

**Interfaces:**
- Consumes: `SPEED, TILE, COLS` from `constants.js`; `DIRS, tileToPixelCenter, pixelToTile, isCentered` from `pathing.js`; `canMove` from `maze.js`.
- Produces: `createBikram(maze) -> bikram` with:
  - fields `x, y, dir, nextDir`
  - `tile() -> {col,row}`
  - `setNextDir(dir)`
  - `resetTo(col,row)` (back to a tile, facing left)
  - `update(dt) -> { ate: 'dot'|'lamp'|null }` — buffered-turn movement,
    tunnel wrap, and pellet eating at tile centre.

- [ ] **Step 1: Write the failing test**

```js
// test/player.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBikram } from '../src/player.js';
import { createMaze } from '../src/maze.js';
import { TILE, COLS } from '../src/constants.js';
import { tileToPixelCenter } from '../src/pathing.js';

test('bikram starts at the maze spawn', () => {
  const m = createMaze();
  const b = createBikram(m);
  assert.deepEqual(b.tile(), m.bikramSpawn);
});

test('buffered turn applies when the corridor opens', () => {
  const m = createMaze();
  const b = createBikram(m);
  // Spawn row (20) is open left/right; the row above (19) is open too.
  b.setNextDir('up');
  b.update(0.001); // at centre -> should adopt the buffered direction
  assert.equal(b.dir, 'up');
});

test('eating a dot returns an ate event and clears the tile', () => {
  const m = createMaze();
  const b = createBikram(m);
  // Place bikram on a known dot tile centre: (1, 20) is '.'
  const p = tileToPixelCenter(1, 20);
  b.x = p.x; b.y = p.y;
  const ev = b.update(0.001);
  assert.equal(ev.ate, 'dot');
  assert.equal(m.eatAt(1, 20), null); // already eaten
});

test('tunnel wrap moves bikram across the screen edge', () => {
  const m = createMaze();
  const b = createBikram(m);
  // Tunnel row is 11; place just past the left edge moving left.
  const p = tileToPixelCenter(0, 11);
  b.x = p.x; b.y = p.y; b.dir = 'left'; b.nextDir = 'left';
  // Several updates push x below the left bound and wrap it to the right side.
  for (let i = 0; i < 30; i++) b.update(0.02);
  assert.ok(b.x > (COLS - 3) * TILE, `expected wrap to right side, got x=${b.x}`);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/player.test.js`
Expected: FAIL — `Cannot find module '../src/player.js'`.

- [ ] **Step 3: Write `src/player.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/player.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/player.js test/player.test.js
git commit -m "feat: add bikram player entity with movement and eating"
```

---

## Task 6: Betaal entity (`betaal.js`)

**Files:**
- Create: `src/betaal.js`
- Test: `test/betaal.test.js`

**Interfaces:**
- Consumes: `SPEED, TILE, COLS` from `constants.js`; `DIRS, tileToPixelCenter, pixelToTile, isCentered, opposite` from `pathing.js`; `canMove` from `maze.js`; `targetTile, chooseDirection` from `ai.js`.
- Produces: `createBetaal(maze, opts) -> betaal` where
  `opts = { personality, spawn:{col,row}, corner:{col,row}, color }`, with:
  - fields `x, y, dir, mode` (`'scatter'|'chase'|'frightened'|'eaten'`), `personality`, `color`
  - `tile() -> {col,row}`
  - `frighten(ms)` — set frightened for `ms` (no-op if already `eaten`); reverses direction
  - `setEaten()` — set mode `eaten`
  - `resetTo()` — back to spawn, mode `scatter`, facing up
  - `update(dt, ctx)` where `ctx = { bikram:{col,row,dir}, globalMode:'scatter'|'chase', betaalSpeed:number }`

- [ ] **Step 1: Write the failing test**

```js
// test/betaal.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBetaal } from '../src/betaal.js';
import { createMaze } from '../src/maze.js';
import { tileToPixelCenter } from '../src/pathing.js';
import { SPEED } from '../src/constants.js';

function makeCtx(maze, over = {}) {
  return {
    bikram: { col: maze.bikramSpawn.col, row: maze.bikramSpawn.row, dir: 'left' },
    globalMode: 'chase',
    betaalSpeed: SPEED.BETAAL,
    ...over,
  };
}

test('betaal starts at its spawn in scatter mode', () => {
  const m = createMaze();
  const b = createBetaal(m, { personality: 'chaser', spawn: { col: 1, row: 1 }, corner: { col: 1, row: 1 }, color: '#fff' });
  assert.deepEqual(b.tile(), { col: 1, row: 1 });
  assert.equal(b.mode, 'scatter');
});

test('frighten sets frightened mode and reverses direction', () => {
  const m = createMaze();
  const b = createBetaal(m, { personality: 'chaser', spawn: { col: 1, row: 3 }, corner: { col: 1, row: 1 }, color: '#fff' });
  b.dir = 'down';
  b.frighten(7000);
  assert.equal(b.mode, 'frightened');
  assert.equal(b.dir, 'up');
});

test('frighten does not override an eaten betaal', () => {
  const m = createMaze();
  const b = createBetaal(m, { personality: 'chaser', spawn: { col: 1, row: 3 }, corner: { col: 1, row: 1 }, color: '#fff' });
  b.setEaten();
  b.frighten(7000);
  assert.equal(b.mode, 'eaten');
});

test('frightened mode expires back to the global mode', () => {
  const m = createMaze();
  const b = createBetaal(m, { personality: 'chaser', spawn: { col: 1, row: 3 }, corner: { col: 1, row: 1 }, color: '#fff' });
  b.frighten(50);
  b.update(0.1, makeCtx(m)); // 100ms elapsed > 50ms fright
  assert.equal(b.mode, 'chase');
});

test('an eaten betaal that reaches the shrine revives', () => {
  const m = createMaze();
  const b = createBetaal(m, { personality: 'chaser', spawn: { col: 1, row: 3 }, corner: { col: 1, row: 1 }, color: '#fff' });
  b.setEaten();
  const p = tileToPixelCenter(m.shrine.col, m.shrine.row);
  b.x = p.x; b.y = p.y;
  b.update(0.001, makeCtx(m));
  assert.equal(b.mode, 'chase');
});

test('update moves the betaal', () => {
  const m = createMaze();
  const b = createBetaal(m, { personality: 'chaser', spawn: { col: 1, row: 3 }, corner: { col: 1, row: 1 }, color: '#fff' });
  const x0 = b.x, y0 = b.y;
  b.update(0.05, makeCtx(m));
  assert.ok(b.x !== x0 || b.y !== y0, 'betaal should move');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/betaal.test.js`
Expected: FAIL — `Cannot find module '../src/betaal.js'`.

- [ ] **Step 3: Write `src/betaal.js`**

```js
import { SPEED, TILE, COLS } from './constants.js';
import { DIRS, tileToPixelCenter, pixelToTile, isCentered, opposite } from './pathing.js';
import { canMove } from './maze.js';
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
      this.mode = 'frightened';
      this.frightMs = ms;
      this.dir = opposite(this.dir);
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
          target = this.corner;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/betaal.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Run the full suite**

Run: `node --test`
Expected: PASS — all five test files green.

- [ ] **Step 6: Commit**

```bash
git add src/betaal.js test/betaal.test.js
git commit -m "feat: add betaal entity with modes and AI-driven movement"
```

---

## Task 7: Audio (`audio.js`)

**Files:**
- Create: `src/audio.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `createAudio() -> { dot(), lamp(), eatBetaal(), death(), resume() }`.
  Browser-only (uses `AudioContext`); not imported by tests.

- [ ] **Step 1: Write `src/audio.js`**

```js
// Tiny WebAudio blip generator — no asset files.
export function createAudio() {
  let ctx = null;
  const ensure = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  };

  function blip(freq, durMs, type = 'square', gain = 0.06) {
    const ac = ensure();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g).connect(ac.destination);
    const now = ac.currentTime;
    osc.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durMs / 1000);
    osc.stop(now + durMs / 1000);
  }

  return {
    resume() { const ac = ensure(); if (ac.state === 'suspended') ac.resume(); },
    dot() { blip(540, 60); },
    lamp() { blip(320, 180, 'sawtooth', 0.08); },
    eatBetaal() { blip(720, 160, 'triangle', 0.09); },
    death() {
      blip(300, 250, 'sawtooth', 0.09);
      setTimeout(() => blip(160, 350, 'sawtooth', 0.09), 180);
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/audio.js
git commit -m "feat: add webaudio sound effects"
```

---

## Task 8: Game loop, state machine, rendering, collisions (`main.js`)

**Files:**
- Create: `src/main.js`

**Interfaces:**
- Consumes: all of `constants.js`, `maze.js` (`createMaze`), `player.js` (`createBikram`), `betaal.js` (`createBetaal`), `audio.js` (`createAudio`), plus `tileToPixelCenter`, `DIRS` from `pathing.js`.
- Produces: the running game (no exports). Wires DOM, input, loop, and the
  `READY → PLAYING → LEVEL_CLEAR / DYING → GAME_OVER` state machine. Reserves a
  `RIDDLE` state constant (unused in v1; see stretch goal).

- [ ] **Step 1: Write `src/main.js`**

```js
import {
  TILE, COLS, ROWS, SCORE, LIVES, COLORS,
  SCATTER_MS, CHASE_MS, levelTuning,
} from './constants.js';
import { createMaze } from './maze.js';
import { createBikram } from './player.js';
import { createBetaal } from './betaal.js';
import { createAudio } from './audio.js';
import { tileToPixelCenter, DIRS } from './pathing.js';

const STATE = { READY: 'ready', PLAYING: 'playing', LEVEL_CLEAR: 'level_clear', DYING: 'dying', GAME_OVER: 'game_over', RIDDLE: 'riddle' };

const canvas = document.getElementById('game');
const cx = canvas.getContext('2d');
const audio = createAudio();

const el = {
  score: document.getElementById('score'),
  high: document.getElementById('highscore'),
  level: document.getElementById('level'),
  lives: document.getElementById('lives'),
  overlay: document.getElementById('overlay'),
  title: document.getElementById('overlay-title'),
  text: document.getElementById('overlay-text'),
};

const BETAAL_SETUP = [
  { personality: 'chaser', corner: { col: 1, row: 1 }, color: COLORS.betaal[0], offset: { col: 0, row: 0 } },
  { personality: 'ambusher', corner: { col: COLS - 2, row: 1 }, color: COLORS.betaal[1], offset: { col: -1, row: 0 } },
  { personality: 'roamer', corner: { col: 1, row: ROWS - 2 }, color: COLORS.betaal[2], offset: { col: 1, row: 0 } },
  { personality: 'shy', corner: { col: COLS - 2, row: ROWS - 2 }, color: COLORS.betaal[3], offset: { col: 0, row: -1 } },
];

let game = newGame();

function newGame() {
  const maze = createMaze();
  return {
    state: STATE.READY,
    maze,
    bikram: createBikram(maze),
    betaals: spawnBetaals(maze),
    score: 0,
    high: Number(localStorage.getItem('bikram-high') || 0),
    lives: LIVES,
    level: 1,
    tuning: levelTuning(1),
    globalMode: 'scatter',
    modeTimer: SCATTER_MS,
    comboIndex: 0,
    stateTimer: 0,
  };
}

function spawnBetaals(maze) {
  return BETAAL_SETUP.map((s) => createBetaal(maze, {
    personality: s.personality,
    spawn: { col: maze.shrine.col + s.offset.col, row: maze.shrine.row + s.offset.row },
    corner: s.corner,
    color: s.color,
  }));
}

function startLevel(reset) {
  game.bikram.resetTo(game.maze.bikramSpawn.col, game.maze.bikramSpawn.row);
  game.betaals.forEach((b) => b.resetTo());
  game.globalMode = 'scatter';
  game.modeTimer = SCATTER_MS;
  game.comboIndex = 0;
  game.state = STATE.READY;
  game.stateTimer = 1200;
  if (reset) showOverlay('Bikram Betaal', 'Press Enter or tap to begin');
  else hideOverlay();
}

// ---- Input ----
const KEY_DIR = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
};

window.addEventListener('keydown', (e) => {
  audio.resume();
  if (KEY_DIR[e.key]) { game.bikram.setNextDir(KEY_DIR[e.key]); e.preventDefault(); }
  if (e.key === 'Enter') handleConfirm();
});

document.querySelectorAll('.dpad__btn').forEach((btn) => {
  btn.addEventListener('click', () => { audio.resume(); game.bikram.setNextDir(btn.dataset.dir); });
});

canvas.parentElement.addEventListener('click', () => { audio.resume(); handleConfirm(); });

function handleConfirm() {
  if (game.state === STATE.READY) { game.state = STATE.PLAYING; hideOverlay(); }
  else if (game.state === STATE.GAME_OVER) { game = newGame(); startLevel(true); }
  else if (game.state === STATE.LEVEL_CLEAR) advanceLevel();
}

function advanceLevel() {
  game.level += 1;
  game.tuning = levelTuning(game.level);
  game.maze = createMaze();
  game.bikram = createBikram(game.maze);
  game.betaals = spawnBetaals(game.maze);
  startLevel(false);
  game.state = STATE.PLAYING;
}

// ---- Overlay helpers ----
function showOverlay(title, text) { el.title.textContent = title; el.text.textContent = text; el.overlay.hidden = false; }
function hideOverlay() { el.overlay.hidden = true; }

// ---- Update ----
function update(dt) {
  if (game.state === STATE.READY) {
    game.stateTimer -= dt * 1000;
    return;
  }
  if (game.state === STATE.DYING) {
    game.stateTimer -= dt * 1000;
    if (game.stateTimer <= 0) {
      if (game.lives <= 0) { game.state = STATE.GAME_OVER; showOverlay('Betaal Wins', `Score ${game.score} — press Enter`); }
      else startLevel(false), (game.state = STATE.PLAYING);
    }
    return;
  }
  if (game.state !== STATE.PLAYING) return;

  // Global scatter/chase toggle.
  game.modeTimer -= dt * 1000;
  if (game.modeTimer <= 0) {
    game.globalMode = game.globalMode === 'scatter' ? 'chase' : 'scatter';
    game.modeTimer = game.globalMode === 'scatter' ? SCATTER_MS : CHASE_MS;
  }

  const ev = game.bikram.update(dt);
  if (ev.ate === 'dot') { game.score += SCORE.DOT; audio.dot(); }
  if (ev.ate === 'lamp') {
    game.score += SCORE.LAMP;
    game.comboIndex = 0;
    game.betaals.forEach((b) => b.frighten(game.tuning.frightMs));
    audio.lamp();
  }

  const bt = game.bikram.tile();
  const ctx = {
    bikram: { col: bt.col, row: bt.row, dir: game.bikram.dir },
    globalMode: game.globalMode,
    betaalSpeed: game.tuning.betaalSpeed,
  };
  game.betaals.forEach((b) => b.update(dt, ctx));

  // Collisions: same tile as Bikram.
  for (const b of game.betaals) {
    const t = b.tile();
    if (t.col === bt.col && t.row === bt.row) {
      if (b.mode === 'frightened') {
        b.setEaten();
        const pts = SCORE.BETAAL_BASE * 2 ** game.comboIndex;
        game.comboIndex = Math.min(game.comboIndex + 1, 3);
        game.score += pts;
        audio.eatBetaal();
      } else if (b.mode !== 'eaten') {
        loseLife();
        return;
      }
    }
  }

  if (game.maze.remainingPellets() === 0) {
    game.state = STATE.LEVEL_CLEAR;
    showOverlay('Maze Cleared', 'Press Enter for the next hunt');
  }

  if (game.score > game.high) { game.high = game.score; localStorage.setItem('bikram-high', String(game.high)); }
}

function loseLife() {
  game.lives -= 1;
  audio.death();
  game.state = STATE.DYING;
  game.stateTimer = 1000;
}

// ---- Render ----
function drawMaze() {
  const g = game.maze.grid;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = g[r][c];
      const x = c * TILE, y = r * TILE;
      if (ch === '#') {
        cx.fillStyle = COLORS.wall;
        cx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
        cx.strokeStyle = COLORS.wallEdge;
        cx.lineWidth = 1.5;
        cx.strokeRect(x + 1.5, y + 1.5, TILE - 3, TILE - 3);
      } else if (ch === '.') {
        cx.fillStyle = COLORS.dot;
        cx.beginPath(); cx.arc(x + TILE / 2, y + TILE / 2, 2.5, 0, Math.PI * 2); cx.fill();
      } else if (ch === 'o') {
        cx.fillStyle = COLORS.lamp;
        cx.shadowColor = COLORS.lamp; cx.shadowBlur = 12;
        cx.beginPath(); cx.arc(x + TILE / 2, y + TILE / 2, 6, 0, Math.PI * 2); cx.fill();
        cx.shadowBlur = 0;
      } else if (ch === 'S') {
        cx.fillStyle = COLORS.shrine;
        cx.beginPath(); cx.arc(x + TILE / 2, y + TILE / 2, 9, 0, Math.PI * 2); cx.fill();
      }
    }
  }
}

function drawBikram() {
  const b = game.bikram;
  const mouth = 0.22 + 0.18 * Math.abs(Math.sin(Date.now() / 90));
  const base = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0, none: 0 }[b.dir];
  cx.fillStyle = COLORS.bikram;
  cx.beginPath();
  cx.moveTo(b.x, b.y);
  cx.arc(b.x, b.y, TILE / 2 - 2, base + mouth, base + Math.PI * 2 - mouth);
  cx.closePath();
  cx.fill();
  // simple crown nub
  cx.fillStyle = '#fff3c4';
  cx.fillRect(b.x - 3, b.y - TILE / 2 + 1, 6, 3);
}

function drawBetaal(b) {
  const anyEnding = b.mode === 'frightened' && b.frightMs < 1500;
  let color = b.color;
  if (b.mode === 'frightened') color = anyEnding ? COLORS.frightenedEnding : COLORS.frightened;
  if (b.mode === 'eaten') color = COLORS.eaten;
  const r = TILE / 2 - 2;
  cx.fillStyle = color;
  cx.beginPath();
  cx.arc(b.x, b.y - 1, r, Math.PI, 0);
  cx.lineTo(b.x + r, b.y + r);
  cx.lineTo(b.x - r, b.y + r);
  cx.closePath();
  cx.fill();
  // eyes
  cx.fillStyle = '#fff';
  cx.beginPath(); cx.arc(b.x - 4, b.y - 2, 2.4, 0, Math.PI * 2); cx.arc(b.x + 4, b.y - 2, 2.4, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = '#102';
  const d = DIRS[b.dir];
  cx.beginPath(); cx.arc(b.x - 4 + d.x, b.y - 2 + d.y, 1.1, 0, Math.PI * 2); cx.arc(b.x + 4 + d.x, b.y - 2 + d.y, 1.1, 0, Math.PI * 2); cx.fill();
}

function render() {
  cx.fillStyle = COLORS.maze;
  cx.fillRect(0, 0, canvas.width, canvas.height);
  drawMaze();
  game.betaals.forEach(drawBetaal);
  drawBikram();

  el.score.textContent = game.score;
  el.high.textContent = game.high;
  el.level.textContent = game.level;
  el.lives.textContent = '♛'.repeat(Math.max(0, game.lives));
}

// ---- Loop ----
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

startLevel(true);
requestAnimationFrame(frame);
```

- [ ] **Step 2: Run the unit suite to confirm nothing regressed**

Run: `node --test`
Expected: PASS (all logic tests still green; `main.js` is not unit-tested).

- [ ] **Step 3: Manual verification (the core playtest)**

Run: `python3 -m http.server 8000`, open `http://localhost:8000`.
Verify, in order:
1. Overlay shows "Bikram Betaal"; pressing Enter (or clicking) starts play.
2. Bikram moves with arrows/WASD; buffered turns feel responsive at junctions.
3. Eating dots increments score with a blip; dots disappear.
4. Four Betaals move with visibly different behaviour and chase Bikram.
5. Eating a lamp turns all Betaals pale; Bikram can eat them (combo 200/400/800/1600); eaten ones show as eyes returning to centre, then revive.
6. Touching a non-frightened Betaal triggers death, decrements a life (♛ icons), and respawns after ~1s.
7. Losing the last life shows "Betaal Wins"; Enter restarts.
8. Clearing all pellets shows "Maze Cleared"; Enter advances to a faster level.
9. High score persists across a page reload.
10. The left/right tunnel on the middle row wraps Bikram and Betaals.

Fix any issue before committing. (Tuning constants in `constants.js` are the first knobs if speed/fright feel off.)

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: add game loop, state machine, rendering and collisions"
```

---

## Task 9: Visual polish, overlays, and mobile D-pad

**Files:**
- Modify: `styles.css`, `index.html` (only if a hook is missing)

**Interfaces:**
- Consumes: existing DOM ids/classes from Task 1.
- Produces: a finished "haunted night" look; no behavioural change.

- [ ] **Step 1: Enhance `styles.css`**

Append/replace to add atmosphere (glow, vignette, overlay motion, readable HUD) using only compositor-friendly transitions:

```css
.board::after {
  content: "";
  position: absolute; inset: 0;
  border-radius: var(--radius);
  box-shadow: inset 0 0 80px rgba(0, 0, 0, 0.6);
  pointer-events: none;
}

.overlay {
  transition: opacity var(--dur, 240ms) ease;
}
.overlay h1 {
  font-size: clamp(1.6rem, 1rem + 3vw, 2.6rem);
  letter-spacing: 0.04em;
  text-shadow: 0 0 18px rgba(255, 206, 58, 0.45);
}
.overlay p { opacity: 0.85; }

.hud {
  padding: 0.4rem 0.8rem;
  background: rgba(18, 15, 51, 0.6);
  border: 1px solid rgba(90, 79, 208, 0.35);
  border-radius: var(--radius);
}
.hud__lives span:last-child { color: var(--color-accent); font-size: 1.1rem; }

.dpad__btn:active { transform: scale(0.92); }
.dpad__btn { transition: transform var(--duration-fast, 120ms) ease; }

@media (prefers-reduced-motion: reduce) {
  .overlay, .dpad__btn { transition: none; }
}
```

- [ ] **Step 2: Manual verification**

Reload `http://localhost:8000`.
Verify: vignette around the board, glowing lamps, readable HUD panel, overlay title glows, D-pad appears on a touch device / mobile-emulation and the buttons respond. No layout overflow at 375px and 1440px widths.

- [ ] **Step 3: Commit**

```bash
git add styles.css index.html
git commit -m "style: add haunted-night polish, overlay glow and mobile dpad"
```

---

## Task 10: Final pass — README run notes + full verification

**Files:**
- Modify: `README.md` (only if controls/score rules drifted from implementation)

- [ ] **Step 1: Run the full test suite**

Run: `node --test`
Expected: PASS — pathing, maze, ai, player, betaal all green.

- [ ] **Step 2: Full manual playthrough**

Play one full level to clear, then deliberately die three times to reach game over and restart. Confirm all 10 checks from Task 8 Step 3 plus the Task 9 visuals still hold.

- [ ] **Step 3: Confirm README accuracy**

Ensure `README.md` controls, scoring, and run commands match the shipped game. Update any drift.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: finalize readme and verify full game"
```

---

## Stretch Goal (NOT in this plan) — Betaal's Riddles

Documented in the spec. Hooks already present for a future plan:
- `main.js` reserves `STATE.RIDDLE`.
- Eating a Betaal happens in one place (`update`, the collision loop) — the
  riddle prompt would branch there, pausing into `STATE.RIDDLE`.
- `betaal.setEaten()` is the single revive trigger to gate on a correct answer.

No riddle UI, data, or state handling is implemented in v1.

---

## Self-Review Notes

- **Spec coverage:** core mechanic (lamps→frighten→eat) ✓ Task 6/8; 4 personalities ✓ Task 4/8; scatter/chase/frightened/eaten modes ✓ Task 6/8; lives + state machine ✓ Task 8; HUD + localStorage high score ✓ Task 8; keyboard + D-pad input ✓ Task 8/9; WebAudio (no assets) ✓ Task 7; tunnel wrap ✓ Task 5/6; level scaling ✓ Task 1/8; visual direction ✓ Task 9; tests for pure logic ✓ Tasks 2–6; riddle hooks ✓ Task 8 + stretch section.
- **Placeholder scan:** none — every code/test step contains full code; the only conditional instruction (maze flood-fill fix) describes an exact, bounded edit.
- **Type consistency:** entity field/method names (`tile()`, `setNextDir`, `frighten`, `setEaten`, `resetTo`, `mode`, `dir`), `createMaze` surface (`isWall`, `eatAt`, `remainingPellets`, `shrine`, `bikramSpawn`), and `ctx` shape (`bikram{col,row,dir}`, `globalMode`, `betaalSpeed`) are used identically across Tasks 4–8.
