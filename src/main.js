import { VW, VH, TILE, GROUND_TOP, PLAYER_X, COLORS, ENERGY_PER_SPHERE, COMBO_CAP, COIN_PER_SPHERE, SPHERE_SCORE, ENEMY_KILL_SCORE } from './constants.js';
import { loadAssets } from './engine/loader.js';
import { createInput } from './engine/input.js';
import { createCamera } from './engine/camera.js';
import { applyComic } from './engine/halftone.js';
import { createAudio } from './engine/audio.js';
import { createMusic } from './engine/music.js';
import { createFx } from './engine/fx.js';
import { frameRect, createSprite } from './engine/sprite.js';
import { createPlayer } from './game/player.js';
import { createLevelRuntime } from './game/level.js';
import { LEVELS } from './game/levels/levels.js';
import { drawHud } from './game/hud.js';
import { drawOverlay } from './game/scenes.js';
import { createGhosts } from './game/ghosts.js';
import { loadProgress, saveProgress } from './game/scoring.js';
import { loadMeta, addCoins, unlockSkin, selectSkin, recordDailyPlay, skinById, SKINS } from './game/meta.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const shareBtn = document.getElementById('shareBtn');
const dlBtn = document.getElementById('dlBtn');
const muteBtn = document.getElementById('muteBtn');
const furyBtn = document.getElementById('furyBtn');
const toastEl = document.getElementById('toast');

// Tarang+ store link, chosen by platform (App Store on iOS, Play Store elsewhere).
const TARANG_IOS = 'https://apps.apple.com/us/app/tarangplus/id1478384536';
const TARANG_ANDROID = 'https://play.google.com/store/apps/details?id=com.otl.tarangplus&hl=en_IN';
function tarangUrl() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isIOS ? TARANG_IOS : TARANG_ANDROID;
}
dlBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
dlBtn.addEventListener('click', (e) => { e.stopPropagation(); window.open(tarangUrl(), '_blank', 'noopener'); });
const audio = createAudio();
const music = createMusic();
const store = window.localStorage;

// Global sound toggle — controls BOTH music and sound effects.
let soundOn = store.getItem('sfr-sound') !== '0';
function applySound() {
  music.setEnabled(soundOn);
  if (soundOn) music.start(); else music.stop();
  audio.setMuted(!soundOn);
  muteBtn.textContent = soundOn ? '🔊' : '🔇';
}
music.setEnabled(soundOn);
audio.setMuted(!soundOn);
muteBtn.textContent = soundOn ? '🔊' : '🔇';
furyBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
furyBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (game.scene === SCENE.PLAY && game.player.startFury()) { fx.shake(8); }
});
muteBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  soundOn = !soundOn;
  store.setItem('sfr-sound', soundOn ? '1' : '0');
  applySound();
});

const SHARE_URL = 'https://sameerme.github.io/spirit-forest-run/';
let toastTimer = null;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2200);
}
function shareGame() {
  const text = `I scored ${game.score} in Spirit Forest Run (ବିକ୍ରମ ବେତାଳ)! Can you beat me?`;
  if (navigator.share) {
    navigator.share({ title: 'Spirit Forest Run', text, url: SHARE_URL }).catch(() => {});
  } else if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(`${text} ${SHARE_URL}`).then(() => showToast('Link copied!')).catch(() => showToast(SHARE_URL));
  } else {
    showToast(SHARE_URL);
  }
}
// keep the share tap from also restarting the game (canvas-parent listens for clicks)
shareBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
shareBtn.addEventListener('click', (e) => { e.stopPropagation(); shareGame(); });

// ---- Juice + skins ----
const fx = createFx();
let skinFilter = skinById(loadMeta(store).skin).filter;

const skinBtn = document.getElementById('skinBtn');
const skinsPanel = document.getElementById('skinsPanel');
const skinsList = document.getElementById('skinsList');
const skinsClose = document.getElementById('skinsClose');
const skinsCoins = document.getElementById('skinsCoins');

function renderSkins() {
  const meta = loadMeta(store);
  skinsCoins.textContent = `${meta.coins} 🪙`;
  skinsList.innerHTML = '';
  for (const s of SKINS) {
    const owned = meta.unlocked.includes(s.id);
    const selected = meta.skin === s.id;
    const row = document.createElement('button');
    row.className = `skin-row${selected ? ' selected' : ''}`;
    row.textContent = selected ? `✓ ${s.name}` : owned ? s.name : `🔒 ${s.name} · ${s.cost}🪙`;
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      const m = loadMeta(store);
      if (!m.unlocked.includes(s.id)) {
        const r = unlockSkin(store, s.id);
        if (!r.ok) { showToast(`Need ${s.cost} 🪙 — collect spheres!`); return; }
      }
      selectSkin(store, s.id);
      skinFilter = skinById(s.id).filter;
      renderSkins();
    });
    skinsList.appendChild(row);
  }
}
skinBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
skinBtn.addEventListener('click', (e) => { e.stopPropagation(); renderSkins(); skinsPanel.hidden = false; });
skinsClose.addEventListener('click', (e) => { e.stopPropagation(); skinsPanel.hidden = true; });
skinsPanel.addEventListener('pointerdown', (e) => e.stopPropagation());
skinsPanel.addEventListener('click', (e) => e.stopPropagation());

const SCENE = { TITLE: 'title', LEVEL: 'level', PLAY: 'play', CLEAR: 'clear', GAMEOVER: 'gameover', VICTORY: 'victory' };

let assets = null;
let game = null;
let anims = null;
const ghosts = createGhosts(); // ambient floating ghosts in the upper sky
let dailyStreak = 0;

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
    bonus: 0,         // sphere points (with combo multiplier), cumulative
    combo: 1,         // current sphere multiplier
    runCoins: 0,      // coins collected this run (banked to meta on game over)
    high: prog.high,
    newHigh: false,   // set when this run beats the stored high
    baseCoins: loadMeta(store).coins, // coins banked before this run (for HUD total)
    sceneTimer: 0,
    ambientT: 7 + Math.random() * 7, // seconds until the next eerie one-shot
  };
}

function startLevel(index) {
  game.levelIndex = index;
  game.camera.reset();
  game.player = createPlayer();
  game.runtime = createLevelRuntime(LEVELS[index]);
  game.combo = 1;
  game.scene = SCENE.LEVEL;
  game.sceneTimer = 1100;
  fx.clear();
  loadBg(index);       // current level's background
  loadBg(index + 1);   // prefetch the next one
}

function tap() {
  audio.resume();
  music.start(); // begins on first user gesture (idempotent; respects mute pref)
  audio.loadAmbient(['assets/sfx/howl.wav', 'assets/sfx/creepy.wav']); // idempotent

  if (game.scene === SCENE.TITLE) { startLevel(game.levelIndex); return; }
  if (game.scene === SCENE.LEVEL) { game.scene = SCENE.PLAY; return; }
  if (game.scene === SCENE.CLEAR) {
    const next = game.levelIndex + 1;
    if (next >= LEVELS.length) { endRun(SCENE.VICTORY); }
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

  // Occasional distant ambience (howl / creepy drone), randomized, mute-gated.
  game.ambientT -= dt;
  if (game.ambientT <= 0) { audio.ambient(0.3); game.ambientT = 12 + Math.random() * 13; }

  const lvl = LEVELS[game.levelIndex];
  game.camera.update(dt, lvl.speed);
  game.distance += lvl.speed * dt; // accumulate progress across all levels (never resets mid-run)
  const floor = game.runtime.floorFor(game.camera, game.player);
  game.player.update(dt, floor);
  const { won, died } = game.runtime.update(dt, game.camera, game.player, audio);

  // React to gameplay events for combo, coins, and juice.
  for (const ev of game.runtime.events) {
    if (ev.type === 'sphere') {
      game.combo = Math.min(game.combo + 1, COMBO_CAP);
      const pts = SPHERE_SCORE * game.combo;
      game.bonus += pts;
      game.runCoins += COIN_PER_SPHERE;
      fx.burst(ev.x, ev.y, COLORS.sphere, 12);
      fx.popup(ev.x, ev.y - 8, `+${pts}${game.combo > 1 ? ` x${game.combo}` : ''}`, COLORS.energy);
    } else if (ev.type === 'kill') {
      game.combo = Math.min(game.combo + 1, COMBO_CAP); // kills build the chain too
      const pts = ENEMY_KILL_SCORE * game.combo;
      game.bonus += pts;
      fx.burst(ev.x, ev.y, COLORS.spirit, 16);
      fx.popup(ev.x, ev.y - 8, `+${pts}`, COLORS.text);
    } else if (ev.type === 'shieldget') {
      fx.burst(ev.x, ev.y, COLORS.energy, 18);
      fx.popup(ev.x, ev.y - 8, 'SHIELD!', COLORS.energy);
    } else if (ev.type === 'hit') {
      game.combo = 1; // break the chain
      fx.shake(12);
      fx.burst(ev.x, ev.y, COLORS.heart, 18, 300);
    }
  }

  // Score: distance progressed + sphere/stomp bonus (starts at 0, only climbs).
  game.score = Math.floor(game.distance / 10) + game.bonus;
  if (game.score > game.high) {
    if (!game.newHigh && game.high > 0) game.newHigh = true; // beat a previous best
    game.high = game.score;
    saveProgress(store, { high: game.high, level: game.levelIndex + 1 });
  }

  if (won) {
    game.scene = SCENE.CLEAR;
    saveProgress(store, { high: game.high, level: Math.min(LEVELS.length, game.levelIndex + 2) });
    if (game.runCoins > 0) { addCoins(store, game.runCoins); game.runCoins = 0; } // bank progress
    audio.win();
  } else if (died) {
    endRun(SCENE.GAMEOVER);
  }
}

function endRun(scene) {
  if (game.runCoins > 0) { addCoins(store, game.runCoins); game.runCoins = 0; }
  game.scene = scene;
  if (scene === SCENE.VICTORY || game.newHigh) { fx.confetti(VW); audio.win(); }
}

// ---- draw ----
// Per-level backgrounds, lazy-loaded so the page/app only fetches the current
// level's image (~0.5MB) instead of all 15 up front.
const BG_W = 1080;
// Advertisement shown above the title on end screens.
const adImg = new Image();
let adReady = false;
adImg.onload = () => { adReady = true; };
adImg.src = `assets/${encodeURIComponent('Bikram Betal Dated Post.webp')}`;

const bgImages = new Map();
function loadBg(levelIndex) {
  if (levelIndex < 0 || levelIndex >= LEVELS.length) return;
  if (bgImages.has(levelIndex)) return bgImages.get(levelIndex);
  const entry = { img: new Image(), ready: false };
  entry.img.onload = () => { entry.ready = true; };
  entry.img.src = `assets/bg_l${levelIndex + 1}.webp`;
  bgImages.set(levelIndex, entry);
  return entry;
}

function drawBackground() {
  const entry = bgImages.get(game.levelIndex);
  if (entry && entry.ready) {
    const f = 0.4; // slow parallax
    let ox = -((game.camera.x * f) % BG_W);
    for (let x = ox; x < VW; x += BG_W) ctx.drawImage(entry.img, x, 0, BG_W, VH);
  } else {
    ctx.fillStyle = COLORS.sky2; // solid fallback until the image loads
    ctx.fillRect(0, 0, VW, VH);
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
  const dw = p.w + 16, dh = p.h + 14;
  const cx = PLAYER_X - 6 + dw / 2;     // sprite centre
  const feet = p.y - 8 + dh + 10;       // ground-contact line (nudged down so feet plant)

  // Power aura: fury (orange) or shield (cyan) ring around Bikram.
  if (p.fury > 0 || p.shield > 0) {
    const ay = feet - dh / 2;
    ctx.save();
    ctx.globalAlpha = 0.45 + 0.15 * Math.sin(performance.now() / 90);
    ctx.lineWidth = 4;
    ctx.strokeStyle = p.fury > 0 ? '#ff8a3a' : '#7fdfff';
    ctx.beginPath(); ctx.ellipse(cx, ay, dw * 0.72, dh * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // The 4-pose run cycle bakes the bounce into the frames (feet on a common
  // baseline, body height varies, peak lifted off the ground), so no extra
  // programmatic bob/rock is needed. Stays upright while airborne.
  ctx.save();
  if (skinFilter && skinFilter !== 'none') ctx.filter = skinFilter; // selected skin tint
  ctx.translate(cx, feet);
  ctx.drawImage(a.img, fr.sx, fr.sy, fr.sw, fr.sh, -dw / 2, -dh, dw, dh);
  ctx.restore();
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
  drawBackground();
  // Dark scrim pushes the dense forest art back so foreground (ground, player,
  // enemies) stays readable.
  ctx.fillStyle = 'rgba(7, 5, 15, 0.5)';
  ctx.fillRect(0, 0, VW, VH);
  ghosts.draw(ctx, assets); // atmospheric ghosts above the scrim, behind gameplay
  const playing = game.scene === SCENE.PLAY || game.scene === SCENE.CLEAR;
  // Screen shake offsets the gameplay layer only.
  const sh = fx.shakeOffset();
  ctx.save();
  ctx.translate(sh.x, sh.y);
  drawGround();
  if (playing) {
    drawGoal();
    game.runtime.draw(ctx, assets, game.camera);
    drawPlayer();
  }
  ctx.restore();
  applyComic(ctx, VW, VH);
  // Fury Mode: pulsing warm overlay.
  if (game.player.fury > 0) {
    ctx.save();
    ctx.globalAlpha = 0.16 + 0.06 * Math.sin(performance.now() / 70);
    ctx.fillStyle = '#ff6a1a'; ctx.fillRect(0, 0, VW, VH);
    ctx.restore();
  }
  if (game.scene === SCENE.PLAY) {
    drawHud(ctx, assets, {
      hearts: game.player.hearts, energy: game.player.energy, score: game.score,
      level: game.levelIndex + 1, combo: game.combo, coins: game.baseCoins + game.runCoins,
    });
  }
  if (game.scene === SCENE.TITLE) drawOverlay(ctx, 'title', { high: game.high, streak: dailyStreak, coins: game.baseCoins });
  if (game.scene === SCENE.LEVEL) drawOverlay(ctx, 'level', { level: game.levelIndex + 1 });
  if (game.scene === SCENE.CLEAR) drawOverlay(ctx, 'clear', { score: game.score, ad: adReady ? adImg : null });
  if (game.scene === SCENE.GAMEOVER) drawOverlay(ctx, 'gameover', { score: game.score, high: game.high, newHigh: game.newHigh, ad: adReady ? adImg : null });
  if (game.scene === SCENE.VICTORY) drawOverlay(ctx, 'victory', { score: game.score, high: game.high, newHigh: game.newHigh });
  fx.draw(ctx); // particles, score popups, confetti — on top (confetti over end screens)
  // HTML overlay buttons by scene.
  const showEnd = game.scene === SCENE.GAMEOVER || game.scene === SCENE.VICTORY;
  if (shareBtn.hidden === showEnd) shareBtn.hidden = !showEnd;
  if (dlBtn.hidden === showEnd) dlBtn.hidden = !showEnd;
  if (!showEnd && !toastEl.hidden) toastEl.hidden = true;
  const showFury = game.scene === SCENE.PLAY && game.player.canFury();
  if (furyBtn.hidden === showFury) furyBtn.hidden = !showFury;
  const onTitle = game.scene === SCENE.TITLE;
  if (skinBtn.hidden === onTitle) skinBtn.hidden = !onTitle;
  if (!onTitle && !skinsPanel.hidden) skinsPanel.hidden = true;
}

// ---- loop ----
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  ghosts.update(dt); // drift continuously across every scene
  fx.update(dt); // animate particles/popups/confetti on every scene (incl. end screens)
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
    run: createSprite(2, 9), // 2-pose run cycle: contact, push (2x-res frames)
    dash: createSprite(4, 14),
    betaal: createSprite(4, 6),
  };
  dailyStreak = recordDailyPlay(store); // count today's visit toward the streak
  game = newGame(0);
  loadBg(0); // level 1 background (also used behind the title)
  const input = createInput(canvas);
  input.onJump(tap);
  input.onDash(dash);
  document.addEventListener('visibilitychange', () => { last = performance.now(); });
  requestAnimationFrame(frame);
}

// Register the service worker for offline play / installability (PWA).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

boot();
