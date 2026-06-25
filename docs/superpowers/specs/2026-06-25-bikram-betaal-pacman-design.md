# Bikram Betaal: The Hunt — Design

**Date:** 2026-06-25
**Status:** Approved

## Concept

A Pac-Man-style arcade game themed on the Vikram-Betaal folklore, with a role
reversal: **Bikram** (King Vikramaditya) hunts the **Betaal** spirits through a
maze. Contact normally means a Betaal eats Bikram — but eating a **magic lamp**
(the power-pellet) turns the Betaals vulnerable for a few seconds, during which
Bikram can eat them. Lose all lives and it is over; clear the maze to advance.

Scope: a faithful, polished single-maze arcade game (Proposal A). The
folklore "riddles" idea is a documented stretch goal, not built in v1.

## Decisions (locked)

- **Core mechanic:** power-pellet mode (magic lamp grants a timed "powered" state).
- **Tech:** HTML5 Canvas + vanilla JS (ES modules), no build step.
- **Persistence:** high score in `localStorage`.
- **Input:** keyboard (arrows / WASD) + on-screen D-pad for touch.
- **Audio:** WebAudio-generated tones, no binary asset files.

## Architecture

Single-folder static site. `index.html` loads ES modules; runs by opening the
file or via `python3 -m http.server`. One `<canvas>` driven by
`requestAnimationFrame`. Logic split into small, single-purpose files.

```
bikram_betaal/
├── index.html          # canvas, HUD, overlay screens
├── styles.css          # layout, HUD, mobile D-pad, design tokens
├── src/
│   ├── main.js         # game loop, state machine, input wiring
│   ├── maze.js         # tile grid + maze layout data + dot/lamp counts
│   ├── player.js       # Bikram: movement, buffered turns, power state, lives
│   ├── betaal.js       # one Betaal entity: movement + mode handling
│   ├── ai.js           # per-personality target-tile logic
│   ├── pathing.js      # tile <-> pixel math, alignment, direction, collision
│   ├── audio.js        # WebAudio beeps (waka, lamp, eat, death)
│   └── constants.js    # tunables: speeds, timings, scores, colors
├── test/               # node:test unit tests for pure logic
└── README.md
```

## Maze & Coordinate Model

- Maze is a 2D tile grid. Legend: `#` wall, `.` dot, `o` lamp, ` ` empty,
  `S` shrine (Betaal home/respawn), `P` Bikram spawn, `-` tunnel mouth.
- Entities hold a pixel position and a current direction.
- **Turning rule:** an entity may change direction only when aligned to a tile
  center and the target tile is not a wall. A queued/"buffered" direction is
  applied at the next valid alignment. This produces clean grid movement.
- Horizontal side tunnels wrap left<->right.

## Entities & Rules

### Bikram (player)
- 4-directional movement with a buffered next-direction.
- 3 lives.
- States: `normal` (Betaal contact costs a life) and `powered` (can eat
  frightened Betaals).
- Eating a dot scores points and decrements the remaining-dot counter.

### Betaals (4)
Each has a distinct personality implemented as a target-tile function in `ai.js`:
1. **Chaser** — targets Bikram's current tile.
2. **Ambusher** — targets the tile 4 ahead of Bikram's facing direction.
3. **Roamer** — picks a mostly-random legal direction at junctions.
4. **Shy** — chases when far from Bikram; retreats to its home corner when close.

Modes:
- `scatter` — head to home corner. Alternates with `chase` on a timer.
- `chase` — pursue using personality target tile.
- `frightened` — triggered when a lamp is eaten; slower, visually pale, flees
  (moves away from Bikram / random). Lasts ~7s (shorter at higher levels).
- `eaten` — only eyes; returns to the shrine, then revives to `scatter`/`chase`.

### Magic Lamps (4, the power-pellets)
- Eating one sets all non-`eaten` Betaals to `frightened`.
- Eating frightened Betaals scores a combo: 200 → 400 → 800 → 1600, reset at
  each new lamp.
- Lamps are consumed (count toward maze completion); eaten Betaals revive from
  the shrine.

## Game State Machine (`main.js`)

```
READY ──> PLAYING
PLAYING ──(all dots+lamps eaten)──> LEVEL_CLEAR ──> PLAYING (next level, faster)
PLAYING ──(caught while normal)──> DYING ──> PLAYING (lives > 0)
                                         └─> GAME_OVER (lives == 0)
```

- Overlays render for READY, LEVEL_CLEAR, GAME_OVER.
- Next level: increase Betaal speed, shorten frightened duration.

## HUD, Input, Persistence

- HUD: score, high score (localStorage), remaining lives (icons), level.
- Input: Arrow keys / WASD; on-screen D-pad for touch devices.
- Audio: short WebAudio tones for dot, lamp, eating a Betaal, and death.

## Visual Direction

Not a flat reskin. "Haunted forest at night": dark indigo background, warm gold
accent for Bikram and lamps, pale spectral tint for frightened Betaals. CSS
custom properties for color/spacing tokens. Subtle glow on lamps and frightened
Betaals. HUD/overlay transitions use only compositor-friendly properties
(transform/opacity). Clear hierarchy and contrast on overlay text.

## Testing

- Unit tests with Node's built-in `node:test` (no framework) for pure logic:
  - `pathing.js`: tile/pixel conversion, center alignment, wall collision,
    tunnel wrap, direction legality.
  - `ai.js`: each personality's target tile given a known board state.
  - scoring/combo logic and remaining-dot/win detection.
- The render loop and feel are verified by playing (canvas drawing not unit
  tested).
- Aim for meaningful branch coverage of the logic modules, not canvas code.

## Stretch Goal (NOT in v1) — Betaal's Riddles

When Bikram eats a Betaal, it poses a one-line riddle; a correct answer grants
a bonus and a longer respawn delay, a wrong answer respawns it immediately.
Leave hooks so this slots in without rework:
- `betaal.js`: an `onEaten` hook point.
- `main.js`: reserve a `RIDDLE` state in the state machine.

## Non-Goals (v1)

- Multiple maze layouts (one hand-authored maze).
- Sprite-sheet art / external image assets (drawn with canvas primitives).
- Networked leaderboards or accounts.
- The riddle mechanic (documented above as a stretch goal only).
