# Bikram & the Betaal: Spirit Forest Run — Design

**Date:** 2026-06-25
**Status:** Approved

## Concept

A mobile-first, portrait, side-scrolling **auto-runner platformer** in an 80s
comic-book / halftone art style. **Bikram** (the Mario-like hero) runs
automatically through a dense haunted forest. The player **taps to jump** and
**double-taps to double-jump**, dodging snakes, bats, and translucent spirits,
collecting **energy spheres**, and reaching **Betaal** (the princess) at the end
of each level to rescue her. Five hand-authored levels, each harder than the
last. Single self-contained webview/AMP page, no build step, no runtime
dependencies.

## Locked decisions

- **Controls:** auto-run; tap = jump, double-tap (second tap while airborne) =
  double-jump. One-thumb play.
- **Engine:** vanilla JS Canvas (ES modules), no build step.
- **Art:** programmatic halftone placeholders first; real PNG art swapped in via
  `assets/` + `manifest.json` when the user submits it.
- **Levels:** 5 hand-authored level data files, difficulty ramps each level.
- **Health:** 3 hearts + an energy meter that grants a timed Spirit Dash.
- **Orientation:** portrait, virtual stage 540×960, scaled to fit with letterbox.
- **Persistence:** high score + furthest level in `localStorage`.

## Mechanics

### Movement & camera
- World scrolls right-to-left at a per-level constant speed; Bikram holds a fixed
  screen X (~28% from left) and animates a run cycle.
- Tap → jump (impulse). A second tap while airborne and before landing → one
  double-jump. Landing resets the double-jump.
- Gravity is constant; jump is an upward velocity impulse. Coyote time (~80ms)
  and a small jump buffer (~120ms) make timing forgiving (= "easy").

### Obstacles
- **Snake** — sits on the ground; collision on the ground lane. Jump over.
- **Bat** — flies at head height, in waves of 1–3; jump between/over.
- **Spirit** — translucent, drifts vertically (sine) across a mid lane; timing dodge.
- **Pit** — gap in the ground; falling in = instant level fail.
- **Log platform** — floating platform Bikram can land on to cross pits/reach spheres.

### Energy spheres & Spirit Dash
- Collecting a sphere adds score and fills the energy meter by a fixed amount.
- When the meter is full, the next tap-and-hold (or a dedicated dash tap) triggers
  **Spirit Dash**: ~2s of invincibility with a glowing dash sprite; Bikram passes
  through (destroys) obstacles he touches during the dash. Meter empties after.

### Health & fail/win
- 3 hearts. Touching snake/bat/spirit (while not dashing) costs 1 heart and grants
  ~1s invulnerability (blinking). 0 hearts → level fail. Falling in a pit → level
  fail regardless of hearts. Fail → retry from the start of the current level.
- Reaching Betaal at level end → rescue animation → level complete → next level
  (or victory screen after level 5).

### Scoring
- Score = distance travelled + (spheres × sphere value) + per-level clear bonus +
  remaining-hearts bonus. High score and furthest level persisted to `localStorage`.

## Difficulty progression (5 levels)

Each level is a data object with tunable knobs. The ramp across levels 1→5:

| Knob | L1 | L2 | L3 | L4 | L5 |
|------|----|----|----|----|----|
| scroll speed (px/s) | 220 | 250 | 285 | 320 | 360 |
| min obstacle gap (px) | 520 | 470 | 420 | 380 | 340 |
| max bats per wave | 1 | 1 | 2 | 2 | 3 |
| spirits enabled | no | no | yes | yes | yes |
| max pit width (tiles) | 1 | 2 | 2 | 3 | 3 |
| spheres (relative) | many | many | medium | medium | few |
| level length (px) | 6000 | 7000 | 8500 | 10000 | 12000 |

Knobs live in each `levels/levelN.js`; the table above is the source of truth for
their starting values. Adding level 6 = adding one data file.

## Architecture (vanilla Canvas, mobile webview)

Single no-build folder. One full-screen responsive `<canvas>` at virtual
540×960, scaled with letterbox; `requestAnimationFrame` loop with delta-time
(`dt` seconds, capped at 0.05). Small, single-purpose modules; pure-logic modules
are unit-tested, render/DOM modules are verified by playing.

```
index.html              # full-screen canvas, tap layer, viewport-fit=cover
styles.css              # full-bleed mobile layout, safe-area insets, comic font
assets/
  manifest.json         # maps logical names -> file + frame metadata
  (PNG files submitted by the user; placeholders used until present)
src/
  main.js               # bootstrap + scene/state machine
  constants.js          # virtual size, tile, gravity, speeds, scoring, colors
  engine/
    loader.js           # async image loader w/ placeholder fallback + manifest parse
    input.js            # pointer tap / double-tap detection
    sprite.js           # sprite-sheet frame animation
    camera.js           # world scroll + parallax offsets
    physics.js          # gravity, jump impulse, AABB overlap (PURE, tested)
    placeholder.js      # programmatic halftone placeholder art per asset key
    halftone.js         # programmatic comic post-process overlay
    audio.js            # optional WebAudio blips (jump/hit/sphere/win), no assets
  game/
    player.js           # Bikram: run/jump/double-jump/dash/health (PURE-ish, tested)
    entities.js         # snake/bat/spirit/sphere update + collision shapes
    spawner.js          # turn level data into timed spawns (PURE, tested)
    level.js            # load level, spawn, win/lose detection
    scoring.js          # score + persistence helpers (PURE, tested)
    hud.js              # hearts, energy meter, score draw
    scenes.js           # TITLE / PLAY / LEVEL_CLEAR / GAME_OVER / VICTORY overlays
    levels/
      level1.js ... level5.js
test/
  physics.test.js  sprite.test.js  player.test.js
  spawner.test.js  scoring.test.js  levels.test.js
```

Mobile/AMP notes: `<meta name="viewport" content="width=device-width,
initial-scale=1, maximum-scale=1, viewport-fit=cover">`; `touch-action: none`
and `user-select: none` on the play surface; pause on `visibilitychange`; respect
`env(safe-area-inset-*)`; no external runtime deps so it runs inside `amp-iframe`
or a plain WebView. A comic web font (Bangers) is loaded from Google Fonts with a
system-font fallback, so gameplay never blocks on it.

## Art direction & ASSET MANIFEST

### Master style
> 1980s comic book illustration, bold black ink outlines, flat limited-color
> fills with halftone / Ben-Day dot shading, slight print misregistration and
> newsprint grain, high contrast. Haunted-forest palette: deep forest greens,
> bruised purples, sickly cyan spirit-glow, warm amber lantern accents. Clean
> transparent background, centered subject, no panel borders, no text.

A programmatic halftone + subtle vignette/comic framing is applied over the whole
canvas at runtime so placeholder and final art read cohesively.

### Technical delivery rules (every asset)
- **Format:** PNG-24 with alpha (transparent background).
- **Resolution:** deliver at **2× the @1x size** in the table (e.g. a 90×110 @1x
  frame is delivered 180×220).
- **Animations:** a single **horizontal strip**, left→right, fixed frame size,
  no padding between frames. Frame count exactly as specified.
- **Anchor:** characters/obstacles trimmed so the subject sits at the
  **bottom-center** of each frame (feet at the bottom edge); spheres/UI centered.
- **Facing:** characters face **right** (direction of travel).
- **Backgrounds:** horizontally **tileable** (left edge continues into right edge).
- **Filenames:** exactly as in the table, placed in `assets/`.

### Asset table

| # | File | Type | Frames | @1x size | Notes |
|---|------|------|--------|----------|-------|
| 1 | `bikram_run.png` | player | 8 | 90×110 | run cycle, faces right |
| 2 | `bikram_jump.png` | player | 2 | 90×110 | frame1 rise, frame2 double-jump flip |
| 3 | `bikram_hurt.png` | player | 1 | 90×110 | recoil |
| 4 | `bikram_dash.png` | player | 4 | 110×110 | glowing Spirit Dash |
| 5 | `betaal_idle.png` | goal | 4 | 120×150 | princess waiting at level end |
| 6 | `betaal_rescued.png` | goal | 2 | 120×150 | cheer / rescued |
| 7 | `snake.png` | obstacle | 4 | 120×70 | ground, slither |
| 8 | `bat.png` | obstacle | 4 | 90×70 | wing flap |
| 9 | `spirit.png` | obstacle | 4 | 110×130 | translucent floating spirit |
| 10 | `sphere.png` | power-up | 4 | 70×70 | pulsing energy sphere |
| 11 | `ground_tile.png` | terrain | 1 | 60×60 | seamless repeat |
| 12 | `ground_edge.png` | terrain | 1 | 60×60 | pit edge (cap) |
| 13 | `platform_log.png` | terrain | 1 | 180×60 | floating log platform |
| 14 | `bg_far.png` | parallax | 1 | 1080×960 | sky/canopy + moon, tileable-X |
| 15 | `bg_mid.png` | parallax | 1 | 1080×960 | tree silhouettes, tileable-X |
| 16 | `bg_near.png` | parallax | 1 | 1080×960 | detailed foliage, tileable-X |
| 17 | `decor.png` | decor | 3 | 90×90 | mushroom / bush / fern (non-colliding) |
| 18 | `ui_hearts.png` | UI | 2 | 60×60 | frame1 full heart, frame2 empty heart |
| 19 | `title_logo.png` | UI | 1 | 480×240 | comic title (optional; web font fallback) |

### manifest.json schema
```json
{
  "bikram_run":   { "file": "bikram_run.png",   "frames": 8, "fw": 90,  "fh": 110 },
  "bg_far":       { "file": "bg_far.png",       "frames": 1, "fw": 1080,"fh": 960 }
}
```
`fw`/`fh` are @1x frame sizes; the loader scales the 2× art down to these. Missing
files fall back to programmatic placeholders keyed by the same name, so the game
is fully playable before any art arrives.

### Per-asset prompt pack (paste into your image generator, prepend the Master style)

1. **bikram_run.png** — "Heroic young man 'Bikram' in a torn explorer outfit and turban, mid-run cycle, 8 sequential frames in one horizontal strip, side view facing right, feet at bottom edge of each frame, consistent size."
2. **bikram_jump.png** — "Same hero, 2 frames: (1) leaping upward arms up, (2) mid-air somersault/double-jump flip. Horizontal strip, facing right."
3. **bikram_hurt.png** — "Same hero, single frame, recoiling in pain, leaning back, stars/impact spark accent."
4. **bikram_dash.png** — "Same hero glowing with cyan spirit energy, streaking dash pose, 4-frame pulsing glow strip, facing right."
5. **betaal_idle.png** — "Ethereal princess 'Betaal' in a flowing dark-violet gown with faint spectral glow, waiting/looking around, 4-frame gentle idle strip, facing left or front."
6. **betaal_rescued.png** — "Same princess, 2 frames cheering / arms raised in relief."
7. **snake.png** — "Menacing forest serpent coiled low to the ground, 4-frame slither strip, side view, fits a wide short frame."
8. **bat.png** — "Spooky bat, 4-frame wing-flap strip, side view facing right."
9. **spirit.png** — "Translucent ghostly forest spirit, wispy tendrils, semi-transparent, sickly cyan glow, 4-frame floating strip."
10. **sphere.png** — "Glowing amber/cyan energy sphere with crackling power, 4-frame pulse strip, centered."
11. **ground_tile.png** — "Top surface of haunted forest dirt/grass, seamless left-right tile, comic halftone shading."
12. **ground_edge.png** — "Same ground tile as a pit edge / broken cliff cap, left and right usable."
13. **platform_log.png** — "Mossy fallen log floating platform, wide, flat top to stand on."
14. **bg_far.png** — "Far background: misty night sky, full moon, distant canopy silhouette, seamless horizontally, muted purples."
15. **bg_mid.png** — "Mid background: dense tree-trunk silhouettes, seamless horizontally, deep green/black."
16. **bg_near.png** — "Near background: detailed creepy foliage, hanging vines, glowing fungus, seamless horizontally."
17. **decor.png** — "3 non-colliding props in one strip: glowing mushroom, thorny bush, fern."
18. **ui_hearts.png** — "2 frames: (1) full comic heart, (2) empty/outline heart, bold ink, halftone."
19. **title_logo.png** — "Comic logo lettering 'SPIRIT FOREST RUN' with subtitle 'Bikram & the Betaal', 80s comic, bold ink + halftone."

## Testing

- `node:test` unit tests (no framework) for pure logic:
  - `physics.js` — gravity integration, jump/double-jump state, AABB overlap.
  - `sprite.js` — frame advance/looping given dt and fps.
  - `spawner.js` — level data → ordered spawn list respecting min-gap and budgets.
  - `player.js` — jump/double-jump/landing/coyote/health-and-invuln transitions.
  - `scoring.js` — score math + localStorage persistence (with an injected store).
  - `levels.js` — each level data validates (monotonic difficulty, length > 0,
    spawns within bounds, reachable pits given jump distance).
- Render loop, art, and feel verified by playing; controller smoke-tests in
  headless Chrome (load + tap-driven run, screenshots) as part of integration.
- Target meaningful branch coverage of logic modules, not canvas drawing.

## Non-goals (v1)

- No real image assets authored by the project (user supplies them; placeholders
  ship meanwhile).
- No endless/procedural mode (levels are hand-authored).
- No accounts, networking, or online leaderboards.
- No audio in v1 scope beyond optional simple WebAudio blips (jump/hit/sphere/win)
  reusing the prior approach — included as a small module, no asset files.
- No in-app level editor.
