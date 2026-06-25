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
    distance: 0,      // cumulative px travelled across all levels (drives the score)
    spheresTotal: 0,  // spheres banked from completed levels
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
    game.spheresTotal += game.runtime.spheres; // bank this level's spheres before the runtime is replaced
    const next = game.levelIndex + 1;
    if (next >= LEVELS.length) { game.scene = SCENE.VICTORY; }
    else startLevel(next);
    return;
  }
  if (game.scene === SCENE.GAMEOVER) { game = newGame(0); startLevel(0); return; }
  if (game.scene === SCENE.VICTORY) { game = newGame(0); startLevel(0); return; }
  // PLAY: a tap is a jump request (play the blip only when a jump is actually available)
  if (game.player.grounded || game.player.coyote > 0 || game.player.jumpsUsed < 2) audio.jump();
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
  game.distance += lvl.speed * dt; // accumulate progress across all levels (never resets mid-run)
  const floor = game.runtime.floorFor(game.camera, game.player);
  game.player.update(dt, floor);
  const { won, died } = game.runtime.update(dt, game.camera, game.player, audio);

  // Score starts at 0 and only ever climbs: distance progressed + spheres collected.
  game.score = computeScore({
    distance: game.distance,
    spheres: game.spheresTotal + game.runtime.spheres,
    hearts: 0,
    levelsCleared: 0,
  });
  if (game.score > game.high) { game.high = game.score; saveProgress(store, { high: game.high, level: game.levelIndex + 1 }); }

  if (won) {
    game.scene = SCENE.CLEAR;
    saveProgress(store, { high: game.high, level: Math.min(LEVELS.length, game.levelIndex + 2) });
    audio.win();
  } else if (died) {
    // Correction B: removed the dead no-op line
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
  // Dark scrim pushes the dense forest art back so foreground (ground, player,
  // enemies) stays readable.
  ctx.fillStyle = 'rgba(7, 5, 15, 0.5)';
  ctx.fillRect(0, 0, VW, VH);
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
