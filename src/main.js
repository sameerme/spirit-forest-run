import { VW, VH, TILE, GROUND_TOP, PLAYER_X, COLORS, ENERGY_PER_SPHERE, COMBO_CAP, COIN_PER_SPHERE, SPHERE_SCORE, PROMO, PROMO_FONT, BANNER } from './constants.js';
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
import { loadProgress, saveProgress } from './game/scoring.js';
import { loadMeta, addCoins, unlockSkin, selectSkin, recordDailyPlay, skinById, SKINS } from './game/meta.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const shareBtn = document.getElementById('shareBtn');
const dlBtn = document.getElementById('dlBtn');
const muteBtn = document.getElementById('muteBtn');
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
    } else if (ev.type === 'stomp') {
      game.bonus += SPHERE_SCORE * 2;
      fx.burst(ev.x, ev.y, COLORS.spirit, 16);
      fx.popup(ev.x, ev.y - 8, '+100', COLORS.text);
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
const bgImages = new Map();
function loadBg(levelIndex) {
  if (levelIndex < 0 || levelIndex >= LEVELS.length) return;
  if (bgImages.has(levelIndex)) return bgImages.get(levelIndex);
  const entry = { img: new Image(), ready: false };
  entry.img.onload = () => { entry.ready = true; };
  entry.img.src = `assets/bg_l${levelIndex + 1}.jpg`;
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

// Set ctx.font to the promo font at the largest size that fits maxW, then return.
// Greedy word-wrap using the current ctx.font.
function wrapText(text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const wd of words) {
    const test = cur ? `${cur} ${wd}` : wd;
    if (cur && ctx.measureText(test).width > maxW) { lines.push(cur); cur = wd; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}
// Shrink ctx.font (given weight) until text fits maxW.
function shrinkToFit(text, maxW, baseSize, weight) {
  let s = baseSize;
  ctx.font = `${weight} ${s}px ${PROMO_FONT}`;
  while (s > 14 && ctx.measureText(text).width > maxW) { s -= 1; ctx.font = `${weight} ${s}px ${PROMO_FONT}`; }
}

// Recurring promo billboard in the canopy band (decorative, no collision).
function drawBanner(x) {
  const { w, h, y } = BANNER;
  ctx.save();
  // drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.roundRect(x + 6, y + 8, w, h, 16); ctx.fill();
  // panel
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#2a1f50'); g.addColorStop(1, '#140f2c');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, 16); ctx.fill();
  // halftone texture, clipped to the panel
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 16); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let yy = y; yy < y + h; yy += 8) for (let xx = x; xx < x + w; xx += 8) { ctx.beginPath(); ctx.arc(xx, yy, 1.3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  // comic ink + accent borders
  ctx.lineWidth = 5; ctx.strokeStyle = COLORS.bikram; ctx.beginPath(); ctx.roundRect(x, y, w, h, 16); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = COLORS.ink; ctx.beginPath(); ctx.roundRect(x + 5, y + 5, w - 10, h - 10, 12); ctx.stroke();
  // little "PROMO" tab
  ctx.fillStyle = COLORS.bikram; ctx.beginPath(); ctx.roundRect(x + 16, y - 12, 96, 26, 8); ctx.fill();
  ctx.fillStyle = COLORS.ink; ctx.font = '18px Bangers, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('PROMO', x + 64, y + 7);
  // content (Odia): left-aligned with padding, date wrapped to <=2 lines, all
  // clipped to the panel. Conservative wrap target so it fits even when a mobile
  // web-font renders wider than it measures.
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x + 6, y, w - 12, h, 12); ctx.clip();
  ctx.textAlign = 'left';
  const padX = 40;
  const tx = x + padX;
  const innerW = w - padX - 18;
  // title
  shrinkToFit(PROMO.title, innerW * 0.95, 34, 800);
  ctx.fillStyle = COLORS.text; ctx.fillText(PROMO.title, tx, y + 52);
  // date: explicit config lines (or auto-wrap a plain string); shrink so the
  // widest line fits the box even when a mobile web-font renders wider.
  let ds = 23;
  ctx.font = `600 ${ds}px ${PROMO_FONT}`;
  const lines = Array.isArray(PROMO.date) ? PROMO.date : wrapText(PROMO.date, innerW * 0.6);
  const widest = () => Math.max(...lines.map((l) => ctx.measureText(l).width));
  while (ds > 14 && widest() > innerW) { ds -= 1; ctx.font = `600 ${ds}px ${PROMO_FONT}`; }
  ctx.fillStyle = COLORS.energy;
  let dy = y + 90;
  for (let i = 0; i < lines.length && i < 2; i++) { ctx.fillText(lines[i], tx, dy); dy += ds + 5; }
  ctx.restore();
  ctx.restore();
}

function drawBanners() {
  const { w, spacing, parallax } = BANNER;
  const camX = game.camera.x * parallax;
  const start = (VW - w) / 2; // first banner centred on the opening screen (frame 1)
  const first = Math.max(0, Math.floor((camX - w - start) / spacing));
  const last = Math.floor((camX + VW - start) / spacing);
  for (let k = first; k <= last; k++) {
    const worldX = start + k * spacing; // banner #0 at the start, then every `spacing` px
    drawBanner(worldX - camX);
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

  // Fake a run with a bouncing gait + slight body rock while grounded; a forward
  // lean while airborne. (Single-frame sprite, so the motion sells the running.)
  let bob = 0, rot = 0;
  const ph = performance.now() / 1000 * 16;
  if (p.grounded && game.scene === SCENE.PLAY) {
    bob = -Math.abs(Math.sin(ph)) * 6;  // bounce up off the ground
    rot = Math.sin(ph) * 0.05;          // gentle rock
  } else if (!p.grounded) {
    rot = p.vy < 0 ? -0.12 : 0.10;      // lean into the jump / fall
  }

  ctx.save();
  if (skinFilter && skinFilter !== 'none') ctx.filter = skinFilter; // selected skin tint
  ctx.translate(cx, feet);
  ctx.rotate(rot);
  ctx.drawImage(a.img, fr.sx, fr.sy, fr.sw, fr.sh, -dw / 2, -dh + bob, dw, dh);
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
  const playing = game.scene === SCENE.PLAY || game.scene === SCENE.CLEAR;
  // Screen shake offsets the gameplay layer only.
  const sh = fx.shakeOffset();
  ctx.save();
  ctx.translate(sh.x, sh.y);
  if (playing) drawBanners();
  drawGround();
  if (playing) {
    drawGoal();
    game.runtime.draw(ctx, assets, game.camera);
    drawPlayer();
  }
  ctx.restore();
  applyComic(ctx, VW, VH);
  if (game.scene === SCENE.PLAY) {
    drawHud(ctx, assets, {
      hearts: game.player.hearts, energy: game.player.energy, score: game.score,
      level: game.levelIndex + 1, combo: game.combo, coins: game.baseCoins + game.runCoins,
    });
  }
  if (game.scene === SCENE.TITLE) drawOverlay(ctx, 'title', { high: game.high, streak: dailyStreak, coins: game.baseCoins });
  if (game.scene === SCENE.LEVEL) drawOverlay(ctx, 'level', { level: game.levelIndex + 1 });
  if (game.scene === SCENE.CLEAR) drawOverlay(ctx, 'clear', { score: game.score });
  if (game.scene === SCENE.GAMEOVER) drawOverlay(ctx, 'gameover', { score: game.score, high: game.high, newHigh: game.newHigh });
  if (game.scene === SCENE.VICTORY) drawOverlay(ctx, 'victory', { score: game.score, high: game.high, newHigh: game.newHigh });
  fx.draw(ctx); // particles, score popups, confetti — on top (confetti over end screens)
  // HTML overlay buttons by scene.
  const showEnd = game.scene === SCENE.GAMEOVER || game.scene === SCENE.VICTORY;
  if (shareBtn.hidden === showEnd) shareBtn.hidden = !showEnd;
  if (dlBtn.hidden === showEnd) dlBtn.hidden = !showEnd;
  if (!showEnd && !toastEl.hidden) toastEl.hidden = true;
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
  // Preload the Odia promo font so the banner renders correctly from the start.
  try {
    if (document.fonts && document.fonts.load) {
      const promoText = `${PROMO.title} ${[].concat(PROMO.date).join(' ')}`;
      await Promise.race([
        Promise.all([
          document.fonts.load('800 44px "Baloo Bhaina 2"', promoText),
          document.fonts.load('600 28px "Baloo Bhaina 2"', promoText),
        ]),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    }
  } catch { /* fall back to system Odia font */ }
  assets = await loadAssets();
  anims = {
    run: createSprite(3, 11), // 3 run frames (wide-contact + two strides)
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
