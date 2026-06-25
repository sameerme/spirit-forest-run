# Spirit Forest Run — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile portrait auto-runner platformer where Bikram runs through a haunted forest, taps to jump/double-jump past snakes/bats/spirits, collects energy spheres, and rescues Betaal at the end of each of 5 progressively harder levels — in an 80s comic/halftone look, runnable as a no-build webview/AMP page.

**Architecture:** Vanilla JS ES modules, one responsive full-screen Canvas at a virtual 540×960 scaled with letterbox, `requestAnimationFrame` delta-time loop, a small scene state machine. Pure-logic modules (physics, sprite, player, entities, spawner, scoring, levels) are unit-tested with `node:test`; render/DOM modules are verified by playing. Art is programmatic halftone placeholders that hot-swap to user PNGs via `assets/manifest.json`.

**Tech Stack:** HTML5 Canvas, vanilla JavaScript (ES modules), WebAudio, `node:test` (Node 22). Optional Google "Bangers" web font with system fallback. No third-party runtime/test deps.

## Global Constraints

- No build step; runs by opening `index.html` or via `python3 -m http.server`.
- No third-party runtime or test dependencies — vanilla JS + `node --test` only.
- `package.json` MUST set `"type": "module"`.
- Tested modules MUST NOT import browser-only APIs (`document`, `window`, `Image`, `AudioContext`, canvas). Only these may touch the DOM/canvas/WebAudio: `engine/loader.js`, `engine/placeholder.js`, `engine/input.js`, `engine/camera.js`, `engine/halftone.js`, `engine/audio.js`, `game/hud.js`, `game/scenes.js`, `main.js`.
- Virtual stage `VW=540`, `VH=960`, `TILE=60`, `GROUND_TOP=840` (= VH − 2·TILE).
- Delta-time movement (`dt` seconds, capped at 0.05); physics constants from `constants.js` (px, px/s, px/s²).
- Coordinates: y increases downward. Boxes are `{x,y,w,h}` with `(x,y)` = top-left. Collisions compared in **world space**.
- Player faces right at a fixed screen X; the world scrolls left (camera X increases).
- Asset filenames and `manifest.json` keys are exactly those in the spec's Asset Manifest. Missing files fall back to placeholders keyed by the same name.
- Commit after every task with a conventional-commit message.
- Immutability for config; the deliberate mutable state is per-entity/per-player runtime fields and the camera, encapsulated in their factories.

## File Structure

```
index.html  styles.css  package.json  README.md
assets/manifest.json
src/
  constants.js
  engine/ loader.js placeholder.js input.js camera.js sprite.js physics.js halftone.js audio.js
  game/   player.js entities.js spawner.js level.js scoring.js hud.js scenes.js
          levels/ level1.js level2.js level3.js level4.js level5.js levels.js
  main.js
test/ physics.test.js sprite.test.js player.test.js entities.test.js spawner.test.js scoring.test.js levels.test.js
```

---

## Task 1: Scaffold + constants + manifest

**Files:** Create `package.json`, `index.html`, `styles.css`, `src/constants.js`, `assets/manifest.json`, `README.md`

**Interfaces:**
- Produces `constants.js` exports: `VW, VH, TILE, GROUND_TOP, GRAVITY, JUMP_V, DOUBLE_JUMP_V, PLAYER_X, PLAYER_W, PLAYER_H, COYOTE_MS, JUMP_BUFFER_MS, INVULN_MS, DASH_MS, ENERGY_MAX, ENERGY_PER_SPHERE, SPHERE_SCORE, CLEAR_BONUS, HEART_BONUS, START_HEARTS, COLORS`.

- [ ] **Step 1: `package.json`**
```json
{
  "name": "spirit-forest-run",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "test": "node --test", "serve": "python3 -m http.server 8000" }
}
```

- [ ] **Step 2: `src/constants.js`**
```js
export const VW = 540;
export const VH = 960;
export const TILE = 60;
export const GROUND_TOP = VH - TILE * 2; // 840

export const GRAVITY = 2600;       // px/s^2
export const JUMP_V = 980;         // px/s upward impulse
export const DOUBLE_JUMP_V = 880;  // px/s upward impulse (2nd jump)

export const PLAYER_X = Math.round(VW * 0.28); // fixed screen x (151)
export const PLAYER_W = 70;
export const PLAYER_H = 96;

export const COYOTE_MS = 90;
export const JUMP_BUFFER_MS = 120;
export const INVULN_MS = 1000;
export const DASH_MS = 2000;

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
```

- [ ] **Step 3: `index.html`**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <title>Spirit Forest Run</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Bangers&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div id="stage">
    <canvas id="game" width="540" height="960" aria-label="Spirit Forest Run"></canvas>
  </div>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: `styles.css`**
```css
:root { --ink: #0c0916; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; background: #07050f; overflow: hidden; }
body {
  display: grid; place-items: center;
  font-family: "Bangers", "Trebuchet MS", system-ui, sans-serif;
  -webkit-user-select: none; user-select: none;
  touch-action: none; overscroll-behavior: none;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}
#stage { position: relative; width: 100%; height: 100%; display: grid; place-items: center; }
#game {
  display: block;
  width: auto; height: 100%;
  max-width: 100%;
  image-rendering: optimizeQuality;
  touch-action: none;
  background: #07050f;
}
@media (orientation: landscape) { #game { width: auto; height: 100%; } }
```

- [ ] **Step 5: `assets/manifest.json`**
```json
{
  "bikram_run":     { "file": "bikram_run.png",     "frames": 8, "fw": 90,   "fh": 110 },
  "bikram_jump":    { "file": "bikram_jump.png",    "frames": 2, "fw": 90,   "fh": 110 },
  "bikram_hurt":    { "file": "bikram_hurt.png",    "frames": 1, "fw": 90,   "fh": 110 },
  "bikram_dash":    { "file": "bikram_dash.png",    "frames": 4, "fw": 110,  "fh": 110 },
  "betaal_idle":    { "file": "betaal_idle.png",    "frames": 4, "fw": 120,  "fh": 150 },
  "betaal_rescued": { "file": "betaal_rescued.png", "frames": 2, "fw": 120,  "fh": 150 },
  "snake":          { "file": "snake.png",          "frames": 4, "fw": 120,  "fh": 70 },
  "bat":            { "file": "bat.png",            "frames": 4, "fw": 90,   "fh": 70 },
  "spirit":         { "file": "spirit.png",         "frames": 4, "fw": 110,  "fh": 130 },
  "sphere":         { "file": "sphere.png",         "frames": 4, "fw": 70,   "fh": 70 },
  "ground_tile":    { "file": "ground_tile.png",    "frames": 1, "fw": 60,   "fh": 60 },
  "ground_edge":    { "file": "ground_edge.png",    "frames": 1, "fw": 60,   "fh": 60 },
  "platform_log":   { "file": "platform_log.png",   "frames": 1, "fw": 180,  "fh": 60 },
  "bg_far":         { "file": "bg_far.png",         "frames": 1, "fw": 1080, "fh": 960 },
  "bg_mid":         { "file": "bg_mid.png",         "frames": 1, "fw": 1080, "fh": 960 },
  "bg_near":        { "file": "bg_near.png",        "frames": 1, "fw": 1080, "fh": 960 },
  "decor":          { "file": "decor.png",          "frames": 3, "fw": 90,   "fh": 90 },
  "ui_hearts":      { "file": "ui_hearts.png",      "frames": 2, "fw": 60,   "fh": 60 },
  "title_logo":     { "file": "title_logo.png",     "frames": 1, "fw": 480,  "fh": 240 }
}
```

- [ ] **Step 6: `README.md`**
```markdown
# Spirit Forest Run — Bikram & the Betaal

A mobile auto-runner platformer in an 80s comic/halftone style. Bikram runs
through a haunted forest, tap to jump and double-tap to double-jump past snakes,
bats and spirits, grab energy spheres, and rescue Betaal at the end of each of 5
levels. No build step.

## Play
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
Tap = jump · double-tap = double jump · fill the energy meter for a Spirit Dash.

## Art
Drop PNGs named per `assets/manifest.json` into `assets/`. Until then the game
renders programmatic halftone placeholders.

## Test
```bash
node --test
```
```

- [ ] **Step 7: Verify**
Run: `node -e "import('./src/constants.js').then(m=>console.log('GROUND_TOP',m.GROUND_TOP,'PLAYER_X',m.PLAYER_X))"`
Expected: `GROUND_TOP 840 PLAYER_X 151`. Then `python3 -m http.server 8000` and confirm the page loads a black canvas (a `main.js` 404 is fine — created later).

- [ ] **Step 8: Commit**
```bash
git add package.json index.html styles.css src/constants.js assets/manifest.json README.md
git commit -m "feat: scaffold spirit forest run shell, constants, asset manifest"
```

---

## Task 2: Physics primitives (`engine/physics.js`)

**Files:** Create `src/engine/physics.js`; Test `test/physics.test.js`

**Interfaces:**
- Produces: `applyGravity(vy, dt, gravity) -> number`, `integrate(value, velocity, dt) -> number`, `aabbOverlap(a, b) -> boolean` (boxes `{x,y,w,h}`).

- [ ] **Step 1: Failing test — `test/physics.test.js`**
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyGravity, integrate, aabbOverlap } from '../src/engine/physics.js';

test('applyGravity increases downward velocity by g*dt', () => {
  assert.equal(applyGravity(0, 0.5, 2000), 1000);
  assert.equal(applyGravity(-980, 0.1, 2600), -980 + 260);
});

test('integrate advances a value by velocity*dt', () => {
  assert.equal(integrate(100, -980, 0.1), 100 - 98);
});

test('aabbOverlap detects overlap and separation', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  assert.equal(aabbOverlap(a, { x: 5, y: 5, w: 10, h: 10 }), true);
  assert.equal(aabbOverlap(a, { x: 20, y: 0, w: 10, h: 10 }), false);
  assert.equal(aabbOverlap(a, { x: 10, y: 0, w: 10, h: 10 }), false); // touching edges = no overlap
});
```

- [ ] **Step 2: Run — `node --test test/physics.test.js`** → FAIL (module missing).

- [ ] **Step 3: `src/engine/physics.js`**
```js
export function applyGravity(vy, dt, gravity) {
  return vy + gravity * dt;
}

export function integrate(value, velocity, dt) {
  return value + velocity * dt;
}

export function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
```

- [ ] **Step 4: Run — `node --test test/physics.test.js`** → PASS (3 tests).

- [ ] **Step 5: Commit**
```bash
git add src/engine/physics.js test/physics.test.js
git commit -m "feat: add physics primitives with tests"
```

---

## Task 3: Sprite animation (`engine/sprite.js`)

**Files:** Create `src/engine/sprite.js`; Test `test/sprite.test.js`

**Interfaces:**
- Produces: `createSprite(frameCount, fps, loop=true)` → object with getter `frame`, getter `done`, `reset()`, `update(dt) -> number`; and `frameRect(meta, frameIndex) -> {sx,sy,sw,sh}` where `meta = {frames, fw, fh}`.

- [ ] **Step 1: Failing test — `test/sprite.test.js`**
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSprite, frameRect } from '../src/engine/sprite.js';

test('createSprite advances frames at fps and loops', () => {
  const s = createSprite(4, 10); // 0.1s per frame
  assert.equal(s.frame, 0);
  s.update(0.1); assert.equal(s.frame, 1);
  s.update(0.25); assert.equal(s.frame, 3); // +2 frames (0.2) then +0.05 leftover
  s.update(0.1); assert.equal(s.frame, 0); // wrapped
});

test('non-looping sprite stops on last frame and sets done', () => {
  const s = createSprite(3, 10, false);
  s.update(1.0);
  assert.equal(s.frame, 2);
  assert.equal(s.done, true);
});

test('frameRect returns the strip rect for a frame', () => {
  const meta = { frames: 4, fw: 90, fh: 110 };
  assert.deepEqual(frameRect(meta, 0), { sx: 0, sy: 0, sw: 90, sh: 110 });
  assert.deepEqual(frameRect(meta, 2), { sx: 180, sy: 0, sw: 90, sh: 110 });
});
```

- [ ] **Step 2: Run — `node --test test/sprite.test.js`** → FAIL.

- [ ] **Step 3: `src/engine/sprite.js`**
```js
export function createSprite(frameCount, fps, loop = true) {
  let t = 0;
  let frame = 0;
  let done = false;
  return {
    get frame() { return frame; },
    get done() { return done; },
    reset() { t = 0; frame = 0; done = false; },
    update(dt) {
      if (done) return frame;
      t += dt;
      const adv = Math.floor(t * fps);
      if (adv > 0) {
        t -= adv / fps;
        frame += adv;
        if (frame >= frameCount) {
          if (loop) { frame %= frameCount; }
          else { frame = frameCount - 1; done = true; }
        }
      }
      return frame;
    },
  };
}

export function frameRect(meta, frameIndex) {
  return { sx: frameIndex * meta.fw, sy: 0, sw: meta.fw, sh: meta.fh };
}
```

- [ ] **Step 4: Run — `node --test test/sprite.test.js`** → PASS (3 tests).

- [ ] **Step 5: Commit**
```bash
git add src/engine/sprite.js test/sprite.test.js
git commit -m "feat: add sprite-sheet animation with tests"
```

---

## Task 4: Player (`game/player.js`)

**Files:** Create `src/game/player.js`; Test `test/player.test.js`

**Interfaces:**
- Consumes: `applyGravity, integrate` from `engine/physics.js`; constants.
- Produces: `createPlayer(groundTop=GROUND_TOP)` → object with fields `x,y,vy,w,h,grounded,jumpsUsed,hearts,invuln,dash,energy,coyote,buffer` and methods:
  - `box() -> {x,y,w,h}` (screen-space, x is PLAYER_X)
  - `requestJump()` (buffers a jump)
  - `setAirborneFromLedge()` (start coyote window when walking off a pit)
  - `update(dt, groundTop) -> void`
  - `hit() -> boolean` (true if this hit killed; no-op while invincible)
  - `addEnergy(amt)`, `startDash() -> boolean`, `isInvincible() -> boolean`

- [ ] **Step 1: Failing test — `test/player.test.js`**
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer } from '../src/game/player.js';
import { GROUND_TOP, PLAYER_H, JUMP_V, ENERGY_MAX } from '../src/constants.js';

const STAND_Y = GROUND_TOP - PLAYER_H;

test('player starts grounded at stand height', () => {
  const p = createPlayer();
  assert.equal(p.grounded, true);
  assert.equal(p.y, STAND_Y);
});

test('a buffered jump launches the player upward next update', () => {
  const p = createPlayer();
  p.requestJump();
  p.update(0.016);
  assert.equal(p.grounded, false);
  assert.ok(p.vy < 0, 'moving upward');
  assert.equal(p.jumpsUsed, 1);
});

test('double jump works once, third is ignored', () => {
  const p = createPlayer();
  p.requestJump(); p.update(0.016);          // jump 1
  p.requestJump(); p.update(0.016);          // jump 2 (double)
  assert.equal(p.jumpsUsed, 2);
  const vyAfterDouble = p.vy;
  p.requestJump(); p.update(0.016);          // ignored
  assert.equal(p.jumpsUsed, 2);
  assert.ok(p.vy > vyAfterDouble, 'gravity only, no new impulse');
});

test('player falls and lands back on the ground', () => {
  const p = createPlayer();
  p.requestJump();
  for (let i = 0; i < 200; i++) p.update(0.016); // ~3.2s, plenty to land
  assert.equal(p.grounded, true);
  assert.equal(p.y, STAND_Y);
  assert.equal(p.jumpsUsed, 0);
});

test('hit costs a heart and grants invulnerability; repeat hit ignored', () => {
  const p = createPlayer();
  assert.equal(p.hit(), false);
  assert.equal(p.hearts, 2);
  assert.ok(p.invuln > 0);
  assert.equal(p.hit(), false); // invulnerable -> no-op
  assert.equal(p.hearts, 2);
});

test('hit returns true when the last heart is lost', () => {
  const p = createPlayer();
  p.hit(); p.invuln = 0;
  p.hit(); p.invuln = 0;
  assert.equal(p.hit(), true);
  assert.ok(p.hearts <= 0);
});

test('energy caps and dash only triggers when full, then empties', () => {
  const p = createPlayer();
  p.addEnergy(40); assert.equal(p.startDash(), false);
  p.addEnergy(1000); assert.equal(p.energy, ENERGY_MAX);
  assert.equal(p.startDash(), true);
  assert.ok(p.dash > 0);
  assert.equal(p.energy, 0);
  assert.equal(p.isInvincible(), true);
});

test('coyote time lets the player jump shortly after leaving a ledge', () => {
  const p = createPlayer();
  p.setAirborneFromLedge();
  assert.equal(p.grounded, false);
  p.requestJump();
  p.update(0.016);
  assert.ok(p.vy < 0, 'jumped during coyote window');
  assert.equal(p.jumpsUsed, 1);
});
```

- [ ] **Step 2: Run — `node --test test/player.test.js`** → FAIL.

- [ ] **Step 3: `src/game/player.js`**
```js
import { applyGravity, integrate } from '../engine/physics.js';
import {
  GROUND_TOP, PLAYER_X, PLAYER_W, PLAYER_H, GRAVITY, JUMP_V, DOUBLE_JUMP_V,
  COYOTE_MS, JUMP_BUFFER_MS, INVULN_MS, DASH_MS, ENERGY_MAX, START_HEARTS,
} from '../constants.js';

export function createPlayer(groundTop = GROUND_TOP) {
  const standY = groundTop - PLAYER_H;
  return {
    x: PLAYER_X, y: standY, vy: 0, w: PLAYER_W, h: PLAYER_H,
    grounded: true, jumpsUsed: 0,
    hearts: START_HEARTS, invuln: 0, dash: 0, energy: 0,
    coyote: 0, buffer: 0,

    box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; },
    requestJump() { this.buffer = JUMP_BUFFER_MS; },
    setAirborneFromLedge() {
      if (this.grounded) { this.grounded = false; this.coyote = COYOTE_MS; }
    },
    isInvincible() { return this.invuln > 0 || this.dash > 0; },

    _tryJump() {
      if (this.grounded || this.coyote > 0) {
        this.vy = -JUMP_V; this.grounded = false; this.coyote = 0;
        this.jumpsUsed = 1; this.buffer = 0; return true;
      }
      if (this.jumpsUsed < 2) {
        this.vy = -DOUBLE_JUMP_V; this.jumpsUsed = 2; this.buffer = 0; return true;
      }
      return false;
    },

    update(dt, gt = groundTop) {
      const standY2 = gt - this.h;
      const ms = dt * 1000;
      if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - ms);
      if (this.dash > 0) this.dash = Math.max(0, this.dash - ms);
      if (this.buffer > 0) this.buffer = Math.max(0, this.buffer - ms);
      if (!this.grounded && this.coyote > 0) this.coyote = Math.max(0, this.coyote - ms);

      if (this.buffer > 0) this._tryJump();

      if (!this.grounded) {
        this.vy = applyGravity(this.vy, dt, GRAVITY);
        this.y = integrate(this.y, this.vy, dt);
        if (this.y >= standY2) {
          this.y = standY2; this.vy = 0; this.grounded = true; this.jumpsUsed = 0; this.coyote = 0;
        }
      }
    },

    hit() {
      if (this.isInvincible()) return false;
      this.hearts -= 1; this.invuln = INVULN_MS;
      return this.hearts <= 0;
    },
    addEnergy(amt) { this.energy = Math.min(ENERGY_MAX, this.energy + amt); },
    startDash() {
      if (this.energy >= ENERGY_MAX) { this.dash = DASH_MS; this.energy = 0; return true; }
      return false;
    },
  };
}
```

- [ ] **Step 4: Run — `node --test test/player.test.js`** → PASS (8 tests).

- [ ] **Step 5: Run full suite — `node --test`** → all green.

- [ ] **Step 6: Commit**
```bash
git add src/game/player.js test/player.test.js
git commit -m "feat: add bikram player with jump/double-jump/dash/health"
```

---

## Task 5: Entities (`game/entities.js`)

**Files:** Create `src/game/entities.js`; Test `test/entities.test.js`

**Interfaces:**
- Consumes: `createSprite` from `engine/sprite.js`; constants `TILE, GROUND_TOP`.
- Produces factories (each returns an object with `type`, world position `worldX`, `y`, collision size `w`,`h`, optional `anim`):
  - `createSnake(worldX)`, `createBat(worldX, y)`, `createSpirit(worldX, baseY, amp=90, freq=0.9)`,
    `createSphere(worldX, y)`, `createPit(worldX, tiles)`, `createPlatform(worldX, y)`.
  - `worldBox(e) -> {x,y,w,h}` (world-space collision box; for `pit` returns the gap span).
  - `updateEntity(e, dt) -> void` (advances anim; spirit oscillates `y` around `baseY`).

- [ ] **Step 1: Failing test — `test/entities.test.js`**
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSnake, createBat, createSpirit, createSphere, createPit, createPlatform,
  worldBox, updateEntity,
} from '../src/game/entities.js';
import { TILE, GROUND_TOP } from '../src/constants.js';

test('snake sits on the ground', () => {
  const s = createSnake(1000);
  const b = worldBox(s);
  assert.equal(b.x, 1000);
  assert.equal(b.y + b.h, GROUND_TOP); // bottom rests on ground surface
});

test('pit width equals tiles * TILE', () => {
  const p = createPit(2000, 3);
  assert.equal(worldBox(p).w, 3 * TILE);
});

test('sphere has a taken flag default false', () => {
  assert.equal(createSphere(500, 600).taken, false);
});

test('spirit oscillates vertically around its baseY within amplitude', () => {
  const sp = createSpirit(800, 600, 90, 1);
  const ys = [];
  for (let i = 0; i < 120; i++) { updateEntity(sp, 1 / 60); ys.push(sp.y); }
  const min = Math.min(...ys), max = Math.max(...ys);
  assert.ok(max - sp.baseY > 50 && max - sp.baseY <= 91, 'rises ~amplitude');
  assert.ok(sp.baseY - min > 50 && sp.baseY - min <= 91, 'dips ~amplitude');
});

test('bat keeps the y it was spawned at', () => {
  const bt = createBat(1200, 690);
  assert.equal(worldBox(bt).y, 690);
});

test('platform is a thin landable strip', () => {
  const pl = createPlatform(1500, 700);
  const b = worldBox(pl);
  assert.equal(b.y, 700);
  assert.ok(b.h <= 30);
});
```

- [ ] **Step 2: Run — `node --test test/entities.test.js`** → FAIL.

- [ ] **Step 3: `src/game/entities.js`**
```js
import { createSprite } from '../engine/sprite.js';
import { TILE, GROUND_TOP } from '../constants.js';

export function createSnake(worldX) {
  return { type: 'snake', worldX, y: GROUND_TOP - 50, w: 96, h: 50, anim: createSprite(4, 8) };
}
export function createBat(worldX, y) {
  return { type: 'bat', worldX, y, w: 70, h: 46, anim: createSprite(4, 10) };
}
export function createSpirit(worldX, baseY, amp = 90, freq = 0.9) {
  return { type: 'spirit', worldX, y: baseY, baseY, amp, freq, t: 0, w: 84, h: 104, anim: createSprite(4, 6) };
}
export function createSphere(worldX, y) {
  return { type: 'sphere', worldX, y, w: 52, h: 52, taken: false, anim: createSprite(4, 8) };
}
export function createPit(worldX, tiles) {
  return { type: 'pit', worldX, tiles, w: tiles * TILE, h: TILE * 2 };
}
export function createPlatform(worldX, y) {
  return { type: 'platform', worldX, y, w: 180, h: 28 };
}

export function worldBox(e) {
  if (e.type === 'pit') return { x: e.worldX, y: GROUND_TOP, w: e.w, h: e.h };
  return { x: e.worldX, y: e.y, w: e.w, h: e.h };
}

export function updateEntity(e, dt) {
  if (e.anim) e.anim.update(dt);
  if (e.type === 'spirit') {
    e.t += dt;
    e.y = e.baseY + Math.sin(e.t * e.freq * Math.PI * 2) * e.amp;
  }
}
```

- [ ] **Step 4: Run — `node --test test/entities.test.js`** → PASS (6 tests).

- [ ] **Step 5: Commit**
```bash
git add src/game/entities.js test/entities.test.js
git commit -m "feat: add forest entities (snake/bat/spirit/sphere/pit/platform)"
```

---

## Task 6: Spawner & level validation (`game/spawner.js`)

**Files:** Create `src/game/spawner.js`; Test `test/spawner.test.js`

**Interfaces:**
- Produces:
  - `airTime(jumpV, gravity) -> number` (seconds aloft for a single jump).
  - `maxGapPx(speed, jumpV, gravity) -> number` (horizontal reach of one jump).
  - `validateLevel(level, opts) -> {ok, errors}` where `level={speed,minGap,length,entities:[{type,worldX,...}]}`, `opts={jumpV,gravity,tile}`. Checks: length>0; entities sorted by worldX; obstacle-to-obstacle gap ≥ minGap (obstacle types: snake,bat,spirit,pit); every pit width ≤ single-jump reach.
  - `entitiesToSpawn(entities, spawnX, startIndex) -> {spawned, nextIndex}` (entities with `worldX <= spawnX`, advancing the index).

- [ ] **Step 1: Failing test — `test/spawner.test.js`**
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { airTime, maxGapPx, validateLevel, entitiesToSpawn } from '../src/game/spawner.js';

test('airTime and maxGapPx compute jump reach', () => {
  assert.ok(Math.abs(airTime(980, 2600) - 0.7538) < 1e-3);
  assert.ok(maxGapPx(220, 980, 2600) > 150);
});

test('validateLevel passes a well-formed level', () => {
  const level = {
    speed: 220, minGap: 400, length: 6000,
    entities: [
      { type: 'snake', worldX: 800 },
      { type: 'sphere', worldX: 1000 },
      { type: 'pit', worldX: 1300, tiles: 1 },
      { type: 'bat', worldX: 1800 },
    ],
  };
  const r = validateLevel(level, { jumpV: 980, gravity: 2600, tile: 60 });
  assert.deepEqual(r, { ok: true, errors: [] });
});

test('validateLevel flags too-small gaps, unsorted entities, and unjumpable pits', () => {
  const level = {
    speed: 220, minGap: 400, length: 0,
    entities: [
      { type: 'snake', worldX: 1000 },
      { type: 'bat', worldX: 900 },         // unsorted
      { type: 'pit', worldX: 1100, tiles: 9 }, // too wide
    ],
  };
  const r = validateLevel(level, { jumpV: 980, gravity: 2600, tile: 60 });
  assert.equal(r.ok, false);
  assert.ok(r.errors.length >= 2);
});

test('entitiesToSpawn returns entities up to spawnX and advances the index', () => {
  const ents = [{ worldX: 100 }, { worldX: 300 }, { worldX: 900 }];
  const r1 = entitiesToSpawn(ents, 350, 0);
  assert.deepEqual(r1.spawned.map((e) => e.worldX), [100, 300]);
  assert.equal(r1.nextIndex, 2);
  const r2 = entitiesToSpawn(ents, 1000, r1.nextIndex);
  assert.deepEqual(r2.spawned.map((e) => e.worldX), [900]);
  assert.equal(r2.nextIndex, 3);
});
```

- [ ] **Step 2: Run — `node --test test/spawner.test.js`** → FAIL.

- [ ] **Step 3: `src/game/spawner.js`**
```js
const OBSTACLES = new Set(['snake', 'bat', 'spirit', 'pit']);

export function airTime(jumpV, gravity) {
  return (2 * jumpV) / gravity;
}

export function maxGapPx(speed, jumpV, gravity) {
  return speed * airTime(jumpV, gravity);
}

export function validateLevel(level, opts) {
  const errors = [];
  if (!(level.length > 0)) errors.push('length must be > 0');

  for (let i = 1; i < level.entities.length; i++) {
    if (level.entities[i].worldX < level.entities[i - 1].worldX) {
      errors.push(`entities not sorted by worldX at index ${i}`);
    }
  }

  const obstacles = level.entities.filter((e) => OBSTACLES.has(e.type));
  for (let i = 1; i < obstacles.length; i++) {
    const gap = obstacles[i].worldX - obstacles[i - 1].worldX;
    if (gap < level.minGap) errors.push(`gap ${gap} < minGap ${level.minGap} at obstacle ${i}`);
  }

  const reach = maxGapPx(level.speed, opts.jumpV, opts.gravity);
  for (const e of obstacles) {
    if (e.type === 'pit') {
      const widthPx = (e.tiles || 1) * opts.tile;
      if (widthPx > reach) errors.push(`pit width ${widthPx} > jump reach ${reach.toFixed(0)}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function entitiesToSpawn(entities, spawnX, startIndex) {
  let i = startIndex;
  const spawned = [];
  while (i < entities.length && entities[i].worldX <= spawnX) {
    spawned.push(entities[i]);
    i++;
  }
  return { spawned, nextIndex: i };
}
```

- [ ] **Step 4: Run — `node --test test/spawner.test.js`** → PASS (4 tests).

- [ ] **Step 5: Commit**
```bash
git add src/game/spawner.js test/spawner.test.js
git commit -m "feat: add spawner and level validation with tests"
```

---

## Task 7: Scoring & persistence (`game/scoring.js`)

**Files:** Create `src/game/scoring.js`; Test `test/scoring.test.js`

**Interfaces:**
- Consumes: `SPHERE_SCORE, CLEAR_BONUS, HEART_BONUS` from constants.
- Produces:
  - `computeScore({distance, spheres, hearts, levelsCleared}) -> number`.
  - `loadProgress(store) -> {high, level}` (reads keys `sfr-high`, `sfr-level`; defaults 0 and 1).
  - `saveProgress(store, {high, level}) -> void`.
  `store` is any object with `getItem(k)`/`setItem(k,v)` (localStorage or a fake).

- [ ] **Step 1: Failing test — `test/scoring.test.js`**
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeScore, loadProgress, saveProgress } from '../src/game/scoring.js';
import { SPHERE_SCORE, CLEAR_BONUS, HEART_BONUS } from '../src/constants.js';

function fakeStore() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _m: m };
}

test('computeScore sums distance/10, spheres, level and heart bonuses', () => {
  const s = computeScore({ distance: 1000, spheres: 3, hearts: 2, levelsCleared: 1 });
  assert.equal(s, 100 + 3 * SPHERE_SCORE + CLEAR_BONUS + 2 * HEART_BONUS);
});

test('loadProgress returns defaults when empty', () => {
  assert.deepEqual(loadProgress(fakeStore()), { high: 0, level: 1 });
});

test('saveProgress then loadProgress round-trips', () => {
  const store = fakeStore();
  saveProgress(store, { high: 4200, level: 3 });
  assert.deepEqual(loadProgress(store), { high: 4200, level: 3 });
});
```

- [ ] **Step 2: Run — `node --test test/scoring.test.js`** → FAIL.

- [ ] **Step 3: `src/game/scoring.js`**
```js
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
```

- [ ] **Step 4: Run — `node --test test/scoring.test.js`** → PASS (3 tests).

- [ ] **Step 5: Commit**
```bash
git add src/game/scoring.js test/scoring.test.js
git commit -m "feat: add scoring and progress persistence with tests"
```

---

## Task 8: Levels (`game/levels/*` + `levels.js`)

**Files:** Create `src/game/levels/level1.js`..`level5.js`, `src/game/levels/levels.js`; Test `test/levels.test.js`

**Interfaces:**
- Consumes: entity factories from `entities.js`; `validateLevel` from `spawner.js`; constants `TILE, GROUND_TOP, JUMP_V, GRAVITY`.
- Each `levelN.js` exports `default` a **def**: `{ id, speed, minGap, length, spirits:boolean, maxBats, maxPit, seed, sphereChance }`.
- `levels.js` exports:
  - `mulberry32(seed) -> () => number` (deterministic RNG in [0,1)).
  - `buildLevel(def) -> level` = `{ ...def, entities:[...] , goalX }` where entities are deterministically placed obstacles/spheres/platforms (sorted by worldX), `goalX = length - 240`.
  - `LEVELS` = array of the 5 built levels.

- [ ] **Step 1: Failing test — `test/levels.test.js`**
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, buildLevel, mulberry32 } from '../src/game/levels/levels.js';
import { validateLevel } from '../src/game/spawner.js';
import { JUMP_V, GRAVITY, TILE } from '../src/constants.js';

test('mulberry32 is deterministic for a seed', () => {
  const a = mulberry32(42); const b = mulberry32(42);
  assert.equal(a(), b());
  assert.equal(a(), b());
});

test('there are 5 levels with monotonic difficulty', () => {
  assert.equal(LEVELS.length, 5);
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(LEVELS[i].speed >= LEVELS[i - 1].speed, 'speed non-decreasing');
    assert.ok(LEVELS[i].minGap <= LEVELS[i - 1].minGap, 'minGap non-increasing');
  }
});

test('every built level validates (gaps + jumpable pits) and has a goal', () => {
  for (const lvl of LEVELS) {
    const r = validateLevel(lvl, { jumpV: JUMP_V, gravity: GRAVITY, tile: TILE });
    assert.ok(r.ok, `level ${lvl.id} invalid: ${r.errors.join('; ')}`);
    assert.ok(lvl.goalX > 0 && lvl.goalX < lvl.length);
    assert.ok(lvl.entities.length > 5);
  }
});

test('buildLevel is deterministic (same def -> same entities)', () => {
  const def = { id: 9, speed: 240, minGap: 420, length: 6000, spirits: true, maxBats: 2, maxPit: 2, seed: 7, sphereChance: 0.5 };
  const a = buildLevel(def); const b = buildLevel(def);
  assert.deepEqual(a.entities, b.entities);
});

test('level 1 has no spirits, level 5 does', () => {
  assert.equal(LEVELS[0].entities.some((e) => e.type === 'spirit'), false);
  assert.equal(LEVELS[4].entities.some((e) => e.type === 'spirit'), true);
});
```

- [ ] **Step 2: Run — `node --test test/levels.test.js`** → FAIL.

- [ ] **Step 3: Level defs.** `src/game/levels/level1.js`
```js
export default { id: 1, speed: 220, minGap: 520, length: 6000, spirits: false, maxBats: 1, maxPit: 1, seed: 101, sphereChance: 0.6 };
```
`src/game/levels/level2.js`
```js
export default { id: 2, speed: 250, minGap: 470, length: 7000, spirits: false, maxBats: 1, maxPit: 2, seed: 202, sphereChance: 0.55 };
```
`src/game/levels/level3.js`
```js
export default { id: 3, speed: 285, minGap: 420, length: 8500, spirits: true, maxBats: 2, maxPit: 2, seed: 303, sphereChance: 0.45 };
```
`src/game/levels/level4.js`
```js
export default { id: 4, speed: 320, minGap: 380, length: 10000, spirits: true, maxBats: 2, maxPit: 3, seed: 404, sphereChance: 0.4 };
```
`src/game/levels/level5.js`
```js
export default { id: 5, speed: 360, minGap: 340, length: 12000, spirits: true, maxBats: 3, maxPit: 3, seed: 505, sphereChance: 0.3 };
```

- [ ] **Step 4: `src/game/levels/levels.js`**
```js
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

export function buildLevel(def) {
  const rng = mulberry32(def.seed);
  const entities = [];
  const goalX = def.length - 240;
  let x = 900; // clear opening runway

  while (x < goalX - 700) {
    const roll = rng();
    if (roll < 0.28) {
      entities.push(createSnake(x));
    } else if (roll < 0.5) {
      const n = 1 + Math.floor(rng() * def.maxBats);
      for (let k = 0; k < n; k++) {
        const y = rng() < 0.5 ? BAT_LOW : BAT_HIGH;
        entities.push(createBat(x + k * 120, y));
      }
    } else if (roll < 0.68 && def.spirits) {
      entities.push(createSpirit(x, SPIRIT_BASE, 90, 0.8 + rng() * 0.5));
    } else if (roll < 0.86) {
      const tiles = 1 + Math.floor(rng() * def.maxPit);
      entities.push(createPit(x, tiles));
      if (tiles >= 2 && rng() < 0.5) entities.push(createPlatform(x + tiles * 30, GROUND_TOP - 150));
    } else {
      entities.push(createSnake(x)); // fallback obstacle keeps spacing honest
    }

    // sprinkle a sphere in the gap after this obstacle
    if (rng() < def.sphereChance) {
      entities.push(createSphere(x + def.minGap * 0.55, rng() < 0.5 ? SPHERE_HI : SPHERE_LO));
    }

    x += def.minGap + Math.floor(rng() * 160);
  }

  entities.sort((a, b) => a.worldX - b.worldX);
  return { ...def, entities, goalX };
}

export const LEVELS = [level1, level2, level3, level4, level5].map(buildLevel);
```

- [ ] **Step 5: Run — `node --test test/levels.test.js`** → PASS (5 tests). If a level fails `validateLevel` (e.g. a sphere placed out of order or a pit too wide), the sort already fixes ordering; if a pit-width error appears, lower that level's `maxPit` by 1 in its def and re-run until green (single-jump reach must cover `maxPit*TILE` at that level's speed — all default values satisfy this).

- [ ] **Step 6: Run full suite — `node --test`** → all green.

- [ ] **Step 7: Commit**
```bash
git add src/game/levels test/levels.test.js
git commit -m "feat: add 5 deterministic levels with difficulty ramp and validation"
```

---

## Task 9: Asset loader + placeholder art (`engine/loader.js`, `engine/placeholder.js`)

**Files:** Create `src/engine/loader.js`, `src/engine/placeholder.js`. (Browser-only; verified by syntax + integration play, not unit-tested.)

**Interfaces:**
- `placeholder.js` exports `makePlaceholder(key, meta) -> HTMLCanvasElement` — draws a recognizable halftone-styled strip (`meta.frames` frames each `meta.fw`×`meta.fh`) for the given asset key. Always returns a canvas usable by `ctx.drawImage`.
- `loader.js` exports `async loadAssets(manifestUrl='assets/manifest.json') -> { images: Record<string,{img,meta}>, get(key) }` where each `img` is the loaded `HTMLImageElement` (scaled by draw code) or, on any load failure, the placeholder canvas. `get(key)` returns `{img, meta}`.

- [ ] **Step 1: `src/engine/placeholder.js`**
```js
import { COLORS } from '../constants.js';

function halftone(ctx, x, y, w, h, color, step = 6) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = color;
  for (let yy = y; yy < y + h; yy += step) {
    for (let xx = x; xx < x + w; xx += step) {
      ctx.beginPath(); ctx.arc(xx, yy, step * 0.32, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function blob(ctx, cx, cy, r, fill) {
  ctx.fillStyle = fill; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

export function makePlaceholder(key, meta) {
  const c = document.createElement('canvas');
  c.width = meta.fw * meta.frames; c.height = meta.fh;
  const ctx = c.getContext('2d');
  for (let f = 0; f < meta.frames; f++) {
    const ox = f * meta.fw, w = meta.fw, h = meta.fh;
    ctx.save(); ctx.translate(ox, 0);
    drawKey(ctx, key, w, h, f);
    ctx.restore();
  }
  return c;
}

function drawKey(ctx, key, w, h, f) {
  const cx = w / 2, midC = COLORS;
  if (key.startsWith('bikram')) {
    const bob = key.includes('run') ? Math.sin(f / Math.max(1, 1)) * 3 : 0;
    blob(ctx, cx, h * 0.42 + bob, w * 0.3, key.includes('dash') ? midC.energy : midC.bikram);
    ctx.fillStyle = midC.ink; ctx.fillRect(cx - 14, h * 0.36, 6, 6); // eye
    ctx.fillRect(cx - 18, h * 0.7, 12, h * 0.28); ctx.fillRect(cx + 6, h * 0.7, 12, h * 0.28); // legs
    halftone(ctx, cx - w * 0.3, h * 0.42, w * 0.6, h * 0.3, midC.halftone);
    return;
  }
  if (key.startsWith('betaal')) { blob(ctx, cx, h * 0.5, w * 0.34, midC.betaal); halftone(ctx, 0, 0, w, h, midC.halftone); return; }
  if (key === 'snake') { ctx.fillStyle = midC.snake; ctx.strokeStyle = midC.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(cx, h * 0.6, w * 0.42, h * 0.32, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    halftone(ctx, 0, h * 0.4, w, h * 0.5, midC.halftone); return; }
  if (key === 'bat') { blob(ctx, cx, h * 0.5, w * 0.24, midC.bat);
    ctx.fillStyle = midC.bat; ctx.beginPath(); ctx.moveTo(cx - w * 0.45, h * 0.5);
    ctx.lineTo(cx, h * 0.3 + f * 2); ctx.lineTo(cx + w * 0.45, h * 0.5); ctx.lineTo(cx, h * 0.6); ctx.fill(); return; }
  if (key === 'spirit') { ctx.globalAlpha = 0.7; blob(ctx, cx, h * 0.45, w * 0.34, midC.spirit);
    halftone(ctx, 0, 0, w, h, 'rgba(159,232,255,0.25)'); ctx.globalAlpha = 1; return; }
  if (key === 'sphere') { blob(ctx, cx, h / 2, w * 0.4 - (f % 2), midC.sphere);
    ctx.globalAlpha = 0.5; blob(ctx, cx, h / 2, w * 0.24, midC.energy); ctx.globalAlpha = 1; return; }
  if (key === 'ground_tile' || key === 'ground_edge') {
    ctx.fillStyle = midC.ground; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = midC.groundTop; ctx.fillRect(0, 0, w, 10);
    halftone(ctx, 0, 10, w, h - 10, midC.halftone, 7); return; }
  if (key === 'platform_log') { ctx.fillStyle = midC.ground; ctx.strokeStyle = midC.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(2, 2, w - 4, h - 6, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = midC.groundTop; ctx.fillRect(4, 2, w - 8, 8); return; }
  if (key.startsWith('bg_')) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    const top = key === 'bg_far' ? midC.sky1 : key === 'bg_mid' ? midC.forestMid : midC.forestNear;
    g.addColorStop(0, top); g.addColorStop(1, midC.sky2); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    if (key === 'bg_far') blob(ctx, w * 0.8, h * 0.18, 60, midC.moon);
    const tint = key === 'bg_far' ? midC.forestFar : key === 'bg_mid' ? midC.forestMid : midC.forestNear;
    ctx.fillStyle = tint;
    for (let i = 0; i < 14; i++) { const tx = (i / 14) * w; ctx.fillRect(tx, h * 0.55, 40, h * 0.45); }
    halftone(ctx, 0, 0, w, h, midC.halftone, 9); return; }
  if (key === 'decor') { blob(ctx, w / 2, h * 0.6, w * 0.3, [midC.spirit, midC.snake, midC.betaal][f % 3]); return; }
  if (key === 'ui_hearts') { ctx.fillStyle = f === 0 ? midC.heart : 'transparent';
    ctx.strokeStyle = midC.heart; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(w / 2, h * 0.75);
    ctx.bezierCurveTo(w * 0.05, h * 0.4, w * 0.3, h * 0.1, w / 2, h * 0.35);
    ctx.bezierCurveTo(w * 0.7, h * 0.1, w * 0.95, h * 0.4, w / 2, h * 0.75);
    if (f === 0) ctx.fill(); ctx.stroke(); return; }
  if (key === 'title_logo') { ctx.fillStyle = midC.bikram; ctx.font = '64px Bangers, sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('SPIRIT FOREST RUN', w / 2, h / 2); return; }
  blob(ctx, w / 2, h / 2, Math.min(w, h) * 0.4, midC.text);
}
```

- [ ] **Step 2: `src/engine/loader.js`**
```js
import { makePlaceholder } from './placeholder.js';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed: ${src}`));
    img.src = src;
  });
}

export async function loadAssets(manifestUrl = 'assets/manifest.json', baseDir = 'assets/') {
  let manifest = {};
  try {
    const res = await fetch(manifestUrl);
    manifest = await res.json();
  } catch {
    manifest = {};
  }
  const images = {};
  await Promise.all(Object.entries(manifest).map(async ([key, meta]) => {
    try {
      const img = await loadImage(baseDir + meta.file);
      images[key] = { img, meta };
    } catch {
      images[key] = { img: makePlaceholder(key, meta), meta };
    }
  }));
  return {
    images,
    get(key) {
      const entry = images[key];
      if (entry) return entry;
      const meta = manifest[key] || { frames: 1, fw: 64, fh: 64 };
      const made = { img: makePlaceholder(key, meta), meta };
      images[key] = made;
      return made;
    },
  };
}
```

- [ ] **Step 3: Verify syntax** — Run: `node --check src/engine/loader.js && node --check src/engine/placeholder.js && echo OK`. Expected: `OK`. Run `node --test` to confirm the suite is unaffected.

- [ ] **Step 4: Commit**
```bash
git add src/engine/loader.js src/engine/placeholder.js
git commit -m "feat: add asset loader with halftone placeholder fallback art"
```

---

## Task 10: Input, camera, halftone, audio (`engine/input.js`, `engine/camera.js`, `engine/halftone.js`, `engine/audio.js`)

**Files:** Create those four engine modules. (Browser-only; syntax + integration verified.)

**Interfaces:**
- `input.js`: `createInput(target) -> { onJump(cb), onDash(cb), destroy() }`. A short tap fires `jump`; a tap while a previous tap was within 280ms fires `jump` again (the double-jump is handled by player state, so two taps = two jump requests). A two-finger tap or a tap held >300ms fires `dash`.
- `camera.js`: `createCamera() -> { x, update(dt, speed), reset(), parallax(layerFactor) -> number }`. `x` increases by `speed*dt`. `parallax(f)` returns `x*f`.
- `halftone.js`: `applyComic(ctx, w, h)` draws a light halftone dot screen + vignette over the frame.
- `audio.js`: `createAudio() -> { jump(), hit(), sphere(), win(), resume() }` (WebAudio blips, lazy).

- [ ] **Step 1: `src/engine/input.js`**
```js
export function createInput(target) {
  let jumpCb = () => {};
  let dashCb = () => {};
  let lastTap = 0;
  let downAt = 0;
  let holdTimer = null;

  const onDown = (e) => {
    e.preventDefault();
    downAt = performance.now();
    if (e.touches && e.touches.length >= 2) { dashCb(); return; }
    holdTimer = setTimeout(() => { dashCb(); holdTimer = null; }, 300);
  };
  const onUp = (e) => {
    e.preventDefault();
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; jumpCb(); }
    lastTap = performance.now();
  };

  target.addEventListener('pointerdown', onDown, { passive: false });
  target.addEventListener('pointerup', onUp, { passive: false });
  target.addEventListener('touchstart', onDown, { passive: false });
  target.addEventListener('touchend', onUp, { passive: false });

  return {
    onJump(cb) { jumpCb = cb; },
    onDash(cb) { dashCb = cb; },
    destroy() {
      target.removeEventListener('pointerdown', onDown);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('touchstart', onDown);
      target.removeEventListener('touchend', onUp);
    },
  };
}
```

- [ ] **Step 2: `src/engine/camera.js`**
```js
export function createCamera() {
  return {
    x: 0,
    update(dt, speed) { this.x += speed * dt; },
    reset() { this.x = 0; },
    parallax(layerFactor) { return this.x * layerFactor; },
  };
}
```

- [ ] **Step 3: `src/engine/halftone.js`**
```js
import { COLORS } from '../constants.js';

export function applyComic(ctx, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = COLORS.ink;
  for (let y = 0; y < h; y += 6) {
    for (let x = (y % 12 === 0 ? 0 : 3); x < w; x += 6) {
      ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
```

- [ ] **Step 4: `src/engine/audio.js`**
```js
export function createAudio() {
  let ctx = null;
  const ensure = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());
  function blip(freq, durMs, type = 'square', gain = 0.05) {
    const ac = ensure();
    const o = ac.createOscillator(); const g = ac.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain;
    o.connect(g).connect(ac.destination);
    const now = ac.currentTime;
    o.start(now); g.gain.exponentialRampToValueAtTime(0.0001, now + durMs / 1000); o.stop(now + durMs / 1000);
  }
  return {
    resume() { const ac = ensure(); if (ac.state === 'suspended') ac.resume(); },
    jump() { blip(560, 110, 'square'); },
    hit() { blip(180, 240, 'sawtooth', 0.07); },
    sphere() { blip(880, 90, 'triangle', 0.06); },
    win() { blip(660, 120); setTimeout(() => blip(990, 180), 130); },
  };
}
```

- [ ] **Step 5: Verify** — Run: `node --check src/engine/input.js && node --check src/engine/camera.js && node --check src/engine/halftone.js && node --check src/engine/audio.js && echo OK`. Expected `OK`.

- [ ] **Step 6: Commit**
```bash
git add src/engine/input.js src/engine/camera.js src/engine/halftone.js src/engine/audio.js
git commit -m "feat: add input, camera, halftone overlay, and audio engine modules"
```

---

## Task 11: HUD + scenes (`game/hud.js`, `game/scenes.js`)

**Files:** Create `src/game/hud.js`, `src/game/scenes.js`. (Browser-only.)

**Interfaces:**
- `hud.js`: `drawHud(ctx, assets, {hearts, energy, score, level})` — draws hearts (using `ui_hearts` frames 0/1), an energy bar (fill = energy/ENERGY_MAX), score and level text, respecting a top safe inset.
- `scenes.js`: `drawOverlay(ctx, kind, data)` where `kind ∈ {'title','level','clear','gameover','victory'}`; draws a comic panel with title/subtitle/prompt text using the Bangers font. Returns nothing.

- [ ] **Step 1: `src/game/hud.js`**
```js
import { ENERGY_MAX, START_HEARTS, COLORS, VW } from '../constants.js';

export function drawHud(ctx, assets, { hearts, energy, score, level }) {
  const heart = assets.get('ui_hearts');
  const size = 40, pad = 16, top = 20;
  for (let i = 0; i < START_HEARTS; i++) {
    const frame = i < hearts ? 0 : 1;
    ctx.drawImage(heart.img, frame * heart.meta.fw, 0, heart.meta.fw, heart.meta.fh,
      pad + i * (size + 6), top, size, size);
  }
  // energy bar
  const bw = 180, bh = 16, bx = VW - bw - pad, by = top + 4;
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = COLORS.energy; ctx.fillRect(bx, by, bw * Math.min(1, energy / ENERGY_MAX), bh);
  ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
  // text
  ctx.fillStyle = COLORS.text; ctx.font = '34px Bangers, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`SCORE ${score}`, VW / 2, top + 34);
  ctx.textAlign = 'right'; ctx.font = '24px Bangers, sans-serif';
  ctx.fillText(`LEVEL ${level}`, VW - pad, top + 56);
  ctx.textAlign = 'left';
}
```

- [ ] **Step 2: `src/game/scenes.js`**
```js
import { VW, VH, COLORS } from '../constants.js';

const COPY = {
  title:    { t: 'SPIRIT FOREST RUN', s: 'Bikram & the Betaal', p: 'TAP TO BEGIN' },
  level:    { t: 'LEVEL', s: '', p: 'TAP TO RUN' },
  clear:    { t: 'BETAAL RESCUED!', s: '', p: 'TAP FOR NEXT LEVEL' },
  gameover: { t: 'THE SPIRITS WIN', s: '', p: 'TAP TO RETRY' },
  victory:  { t: 'YOU SAVED BETAAL!', s: 'All levels cleared', p: 'TAP TO PLAY AGAIN' },
};

export function drawOverlay(ctx, kind, data = {}) {
  const c = COPY[kind] || COPY.title;
  ctx.save();
  ctx.fillStyle = 'rgba(7,5,15,0.78)'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.bikram; ctx.font = '72px Bangers, sans-serif';
  const title = kind === 'level' ? `LEVEL ${data.level || 1}` : c.t;
  ctx.fillText(title, VW / 2, VH * 0.4);
  if (c.s) { ctx.fillStyle = COLORS.text; ctx.font = '34px Bangers, sans-serif'; ctx.fillText(c.s, VW / 2, VH * 0.4 + 50); }
  if (data.score != null) { ctx.fillStyle = COLORS.text; ctx.font = '30px Bangers, sans-serif'; ctx.fillText(`SCORE ${data.score}`, VW / 2, VH * 0.5); }
  ctx.fillStyle = COLORS.energy; ctx.font = '36px Bangers, sans-serif';
  ctx.fillText(c.p, VW / 2, VH * 0.62);
  ctx.restore();
}
```

- [ ] **Step 3: Verify** — Run: `node --check src/game/hud.js && node --check src/game/scenes.js && echo OK`. Expected `OK`.

- [ ] **Step 4: Commit**
```bash
git add src/game/hud.js src/game/scenes.js
git commit -m "feat: add HUD and scene overlays"
```

---

## Task 12: Level runtime + main integration (`game/level.js`, `main.js`)

**Files:** Create `src/game/level.js`, `src/main.js`. (Browser-only; verified by controller smoke test.)

**Interfaces:**
- `level.js`: `createLevelRuntime(levelData)` → `{ active:[], idx:0, distance:0, spheres:0, update(dt, camera, player, audio) -> {won, died}, draw(ctx, assets, camera) }`.
  - Spawns entities as the camera's right edge passes their `worldX` (via `entitiesToSpawn`).
  - Moves nothing itself (entities are world-fixed; camera scroll creates motion); calls `updateEntity`.
  - Collisions in world space: player worldBox `{x: camera.x + PLAYER_X, y: player.y, w, h}` vs each active entity `worldBox(e)`:
    - `sphere`: if overlap and not taken → `taken=true`, `player.addEnergy(ENERGY_PER_SPHERE)`, `spheres++`, `audio.sphere()`.
    - `snake/bat/spirit`: if overlap and not invincible → `player.hit()` (audio.hit); if it returns true → `died=true`. If invincible (dash) → mark entity consumed.
    - `pit`: if player is over the pit span (worldX within pit) AND grounded at ground level (not on a platform / not jumping above) → `died=true` (fell in). Implement: if player's center worldX ∈ [pit.x, pit.x+pit.w] and `player.grounded` and player bottom ≈ GROUND_TOP → died. Also when the player's ground support is a pit, call `player.setAirborneFromLedge()` so a jump still works.
    - `platform`: if falling onto its top → land (set player.y to platform top − h, grounded true, jumpsUsed 0).
  - `distance` tracks `camera.x`. `won` when `camera.x + PLAYER_X >= levelData.goalX`.
  - Prunes entities fully past the left edge.
- `main.js`: bootstraps canvas scaling (letterbox 540×960), loads assets, builds the scene state machine `TITLE → LEVEL(intro) → PLAY → CLEAR → (next LEVEL | VICTORY)` and `PLAY → GAMEOVER`, wires input (jump→player.requestJump, dash→player.startDash), draws background parallax + ground + entities + player + HUD + overlays + comic post, and persists score/level.

- [ ] **Step 1: `src/game/level.js`**
```js
import { PLAYER_X, ENERGY_PER_SPHERE, GROUND_TOP, VW, TILE, COLORS } from '../constants.js';
import { aabbOverlap } from '../engine/physics.js';
import { entitiesToSpawn } from './spawner.js';
import { worldBox, updateEntity } from './entities.js';
import { frameRect } from '../engine/sprite.js';

export function createLevelRuntime(levelData) {
  return {
    data: levelData,
    active: [],
    idx: 0,
    distance: 0,

    update(dt, camera, player, audio) {
      const spawnX = camera.x + VW + 100;
      const { spawned, nextIndex } = entitiesToSpawn(levelData.entities, spawnX, this.idx);
      for (const e of spawned) this.active.push(e);
      this.idx = nextIndex;

      let died = false;
      const px = camera.x + PLAYER_X;
      const pBox = { x: px, y: player.y, w: player.w, h: player.h };
      const pCenter = px + player.w / 2;

      // pit support / fall detection
      let overPit = false;
      for (const e of this.active) {
        if (e.type !== 'pit') continue;
        if (pCenter >= e.worldX && pCenter <= e.worldX + e.w) {
          overPit = true;
          if (player.grounded && player.y + player.h >= GROUND_TOP - 1) died = true;
        }
      }
      if (overPit && player.grounded) player.setAirborneFromLedge();

      for (const e of this.active) {
        updateEntity(e, dt);
        if (e.consumed || e.taken) continue;
        const wb = worldBox(e);
        if (e.type === 'sphere') {
          if (aabbOverlap(pBox, wb)) { e.taken = true; player.addEnergy(ENERGY_PER_SPHERE); this.spheres++; audio.sphere(); }
        } else if (e.type === 'platform') {
          const falling = player.vy > 0;
          const overTop = pBox.x + pBox.w > wb.x && pBox.x < wb.x + wb.w;
          const atTop = player.y + player.h >= wb.y && player.y + player.h <= wb.y + 28;
          if (falling && overTop && atTop) { player.y = wb.y - player.h; player.vy = 0; player.grounded = true; player.jumpsUsed = 0; }
        } else if (e.type === 'snake' || e.type === 'bat' || e.type === 'spirit') {
          if (aabbOverlap(pBox, wb)) {
            if (player.isInvincible()) { if (player.dash > 0) e.consumed = true; }
            else { const dead = player.hit(); audio.hit(); if (dead) died = true; }
          }
        }
      }

      // prune entities fully off the left edge
      this.active = this.active.filter((e) => e.worldX + (e.w || 0) > camera.x - 50 && !e.consumed);

      this.distance = camera.x;
      const won = camera.x + PLAYER_X >= levelData.goalX;
      return { won, died };
    },

    spheres: 0,

    draw(ctx, assets, camera) {
      for (const e of this.active) {
        if (e.taken || e.consumed) continue;
        const sx = e.worldX - camera.x;
        if (sx > VW + 120 || sx + (e.w || 0) < -120) continue;
        if (e.type === 'pit') continue; // pit is the absence of ground (handled by ground draw)
        const key = e.type === 'platform' ? 'platform_log' : e.type;
        const a = assets.get(key);
        const fr = a.meta.frames > 1 && e.anim ? frameRect(a.meta, e.anim.frame % a.meta.frames) : { sx: 0, sy: 0, sw: a.meta.fw, sh: a.meta.fh };
        if (e.type === 'spirit') ctx.globalAlpha = 0.8;
        ctx.drawImage(a.img, fr.sx, fr.sy, fr.sw, fr.sh, sx, e.y, e.w + 8, e.h + 8);
        ctx.globalAlpha = 1;
      }
    },

    pits() { return this.active.filter((e) => e.type === 'pit'); },
  };
}
```

- [ ] **Step 2: `src/main.js`**
```js
import { VW, VH, TILE, GROUND_TOP, PLAYER_X, COLORS, ENERGY_PER_SPHERE } from './constants.js';
import { loadAssets } from './engine/loader.js';
import { createInput } from './engine/input.js';
import { createCamera } from './engine/camera.js';
import { applyComic } from './engine/halftone.js';
import { createAudio } from './engine/audio.js';
import { frameRect, createSprite } from './engine/sprite.js';
import { createPlayer } from './game/player.js';
import { createLevelRuntime } from './game/level.js';
import { LEVELS } from './game/levels/levels.js';
import { drawHud } from './game/hud.js';
import { drawOverlay } from './game/scenes.js';
import { computeScore, loadProgress, saveProgress } from './game/scoring.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const audio = createAudio();
const store = window.localStorage;

const SCENE = { TITLE: 'title', LEVEL: 'level', PLAY: 'play', CLEAR: 'clear', GAMEOVER: 'gameover', VICTORY: 'victory' };

let assets = null;
let game = null;
let anims = null;

function newGame(startLevel = 0) {
  const prog = loadProgress(store);
  return {
    scene: SCENE.TITLE,
    levelIndex: startLevel,
    camera: createCamera(),
    player: createPlayer(),
    runtime: createLevelRuntime(LEVELS[startLevel]),
    score: 0,
    high: prog.high,
    sceneTimer: 0,
  };
}

function startLevel(index) {
  game.levelIndex = index;
  game.camera.reset();
  game.player = createPlayer();
  game.runtime = createLevelRuntime(LEVELS[index]);
  game.scene = SCENE.LEVEL;
  game.sceneTimer = 1100;
}

function tap() {
  audio.resume();
  if (game.scene === SCENE.TITLE) { startLevel(game.levelIndex); return; }
  if (game.scene === SCENE.LEVEL) { game.scene = SCENE.PLAY; return; }
  if (game.scene === SCENE.CLEAR) {
    const next = game.levelIndex + 1;
    if (next >= LEVELS.length) { game.scene = SCENE.VICTORY; }
    else startLevel(next);
    return;
  }
  if (game.scene === SCENE.GAMEOVER) { game = newGame(0); startLevel(0); return; }
  if (game.scene === SCENE.VICTORY) { game = newGame(0); startLevel(0); return; }
  // PLAY: a tap is a jump request
  game.player.requestJump();
}

function dash() {
  if (game.scene === SCENE.PLAY && game.player.startDash()) { /* dash started */ }
}

// ---- update ----
function update(dt) {
  if (game.scene === SCENE.LEVEL) { game.sceneTimer -= dt * 1000; if (game.sceneTimer <= 0) game.scene = SCENE.PLAY; return; }
  if (game.scene !== SCENE.PLAY) return;

  const lvl = LEVELS[game.levelIndex];
  game.camera.update(dt, lvl.speed);
  game.player.update(dt, GROUND_TOP);
  const { won, died } = game.runtime.update(dt, game.camera, game.player, audio);

  game.score = computeScore({
    distance: game.runtime.distance, spheres: game.runtime.spheres,
    hearts: game.player.hearts, levelsCleared: game.levelIndex,
  });
  if (game.score > game.high) { game.high = game.score; saveProgress(store, { high: game.high, level: game.levelIndex + 1 }); }

  if (won) {
    game.scene = SCENE.CLEAR;
    saveProgress(store, { high: game.high, level: Math.min(LEVELS.length, game.levelIndex + 2) });
    audio.win();
  } else if (died) {
    game.player.hearts <= 0 || game.runtime ? null : null;
    game.scene = SCENE.GAMEOVER;
  }
}

// ---- draw ----
function drawParallax() {
  const layers = [['bg_far', 0.2], ['bg_mid', 0.5], ['bg_near', 0.8]];
  for (const [key, f] of layers) {
    const a = assets.get(key);
    const w = a.meta.fw;
    let ox = -((game.camera.x * f) % w);
    for (let x = ox; x < VW; x += w) ctx.drawImage(a.img, 0, 0, a.meta.fw, a.meta.fh, x, 0, w, VH);
  }
}

function drawGround() {
  const a = assets.get('ground_tile');
  const pits = game.runtime.pits();
  const startTile = Math.floor(game.camera.x / TILE);
  for (let i = -1; i < VW / TILE + 2; i++) {
    const tileWorldX = (startTile + i) * TILE;
    const sx = tileWorldX - game.camera.x;
    const inPit = pits.some((p) => tileWorldX + TILE > p.worldX && tileWorldX < p.worldX + p.w);
    if (inPit) continue;
    ctx.drawImage(a.img, 0, 0, a.meta.fw, a.meta.fh, sx, GROUND_TOP, TILE, TILE);
    ctx.drawImage(a.img, 0, 0, a.meta.fw, a.meta.fh, sx, GROUND_TOP + TILE, TILE, TILE);
  }
}

function drawPlayer() {
  const p = game.player;
  let key = 'bikram_run', frame = anims.run.update(0);
  if (p.dash > 0) { key = 'bikram_dash'; frame = anims.dash.update(1 / 60); }
  else if (p.invuln > 0 && Math.floor(p.invuln / 80) % 2 === 0) { key = 'bikram_hurt'; frame = 0; }
  else if (!p.grounded) { key = 'bikram_jump'; frame = p.jumpsUsed >= 2 ? 1 : 0; }
  else { frame = anims.run.update(1 / 60); }
  const a = assets.get(key);
  const fr = frameRect(a.meta, Math.min(frame, a.meta.frames - 1));
  ctx.drawImage(a.img, fr.sx, fr.sy, fr.sw, fr.sh, PLAYER_X - 6, p.y - 8, p.w + 16, p.h + 14);
}

function drawGoal() {
  const lvl = LEVELS[game.levelIndex];
  const sx = lvl.goalX - game.camera.x;
  if (sx > VW + 200 || sx < -200) return;
  const a = assets.get('betaal_idle');
  const fr = frameRect(a.meta, anims.betaal.update(1 / 60));
  ctx.drawImage(a.img, fr.sx, fr.sy, fr.sw, fr.sh, sx, GROUND_TOP - a.meta.fh, a.meta.fw, a.meta.fh);
}

function render() {
  ctx.clearRect(0, 0, VW, VH);
  drawParallax();
  drawGround();
  if (game.scene === SCENE.PLAY || game.scene === SCENE.CLEAR) {
    drawGoal();
    game.runtime.draw(ctx, assets, game.camera);
    drawPlayer();
  }
  applyComic(ctx, VW, VH);
  if (game.scene === SCENE.PLAY) drawHud(ctx, assets, { hearts: game.player.hearts, energy: game.player.energy, score: game.score, level: game.levelIndex + 1 });
  if (game.scene === SCENE.TITLE) drawOverlay(ctx, 'title', { high: game.high });
  if (game.scene === SCENE.LEVEL) drawOverlay(ctx, 'level', { level: game.levelIndex + 1 });
  if (game.scene === SCENE.CLEAR) drawOverlay(ctx, 'clear', { score: game.score });
  if (game.scene === SCENE.GAMEOVER) drawOverlay(ctx, 'gameover', { score: game.score });
  if (game.scene === SCENE.VICTORY) drawOverlay(ctx, 'victory', { score: game.score });
}

// ---- loop ----
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

function fitCanvas() {
  // CSS handles visual scaling (height:100%); keep the backing store at virtual res.
  canvas.width = VW; canvas.height = VH;
}

async function boot() {
  fitCanvas();
  assets = await loadAssets();
  anims = {
    run: createSprite(8, 12),
    dash: createSprite(4, 14),
    betaal: createSprite(4, 6),
  };
  game = newGame(0);
  const input = createInput(canvas);
  input.onJump(tap);
  input.onDash(dash);
  document.addEventListener('visibilitychange', () => { last = performance.now(); });
  requestAnimationFrame(frame);
}

boot();
```

- [ ] **Step 3: Cross-check wiring** — read `src/game/player.js`, `src/game/level.js`, `src/game/levels/levels.js`, `src/engine/*` and confirm every call in `main.js`/`level.js` matches the real exports (`player.requestJump/startDash/update/hit/addEnergy/isInvincible`, `runtime.update/draw/pits/distance/spheres`, `camera.update/reset/x`, `assets.get`, `frameRect`, `createSprite`). Fix only genuine mismatches; do not silently change earlier modules' public APIs (report a real mismatch as DONE_WITH_CONCERNS).

- [ ] **Step 4: Verify** — Run: `node --check src/game/level.js && node --check src/main.js && echo OK`. Then `node --test` (still green; these modules aren't imported by tests).

- [ ] **Step 5: Commit**
```bash
git add src/game/level.js src/main.js
git commit -m "feat: add level runtime and main game integration"
```

---

## Task 13: Mobile/visual polish + final verification

**Files:** Modify `styles.css`, `index.html` only if a hook is missing.

- [ ] **Step 1: Tighten mobile feel in `styles.css`** — append:
```css
#game { box-shadow: 0 0 40px rgba(0,0,0,0.6); }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } }
html { -webkit-tap-highlight-color: transparent; }
```

- [ ] **Step 2: Full suite** — Run `node --test`. Expected: physics, sprite, player, entities, spawner, scoring, levels all green.

- [ ] **Step 3: Controller smoke test (headless Chrome).** Serve and load; confirm: page loads with no JS errors; title overlay shows; a tap starts the level; taps make Bikram jump (player y changes); the camera scrolls (background moves); hearts/energy/score HUD render; reaching the goal shows CLEAR. (The controller performs this via DevTools protocol with screenshots, as in prior work.)

- [ ] **Step 4: Commit**
```bash
git add styles.css index.html
git commit -m "style: mobile polish and tap-highlight cleanup"
```

---

## Self-Review Notes

- **Spec coverage:** auto-run + tap/double-tap (player + input + main) ✓; snakes/bats/spirits/pits/platforms (entities + levels + level runtime) ✓; energy spheres + Spirit Dash (player.addEnergy/startDash, input dash, level collisions) ✓; reach Betaal goal (level.goalX, main goal draw + win) ✓; 3 hearts + fail on 0/pit (player.hit, level pit death) ✓; 5 levels harder each (levels + monotonic test) ✓; halftone 80s comic (placeholder art + halftone overlay + Bangers font) ✓; portrait 540×960 mobile webview (index/styles/main fit) ✓; high-score/level persistence (scoring) ✓; asset swap via manifest (loader) ✓; tests for pure logic ✓ (Tasks 2–8); no-build/no-deps/type:module ✓ (Task 1).
- **Placeholder scan:** none — every code/test step contains complete code; the only conditional instructions (level pit-width fix, wiring mismatch handling) are bounded and concrete.
- **Type consistency:** entity fields (`worldX,y,w,h,type,anim,taken,consumed,baseY,amp,freq,t`), `worldBox(e)`, player methods (`requestJump,setAirborneFromLedge,update,hit,addEnergy,startDash,isInvincible,box`), camera (`x,update,reset,parallax`), sprite (`createSprite`,`frameRect`), loader (`loadAssets`,`get`), runtime (`update,draw,pits,distance,spheres,active,idx`) are used identically across Tasks 4–12. One known fix-up: `main.update` references `game.runtime` only after it exists (set in `newGame`/`startLevel`); the `died` branch sets `SCENE.GAMEOVER` directly.
```
