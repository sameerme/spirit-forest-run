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
