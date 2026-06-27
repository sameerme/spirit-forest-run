// Persistent meta-progression: coins, unlockable skins, daily streak.
// All state lives in an injected `store` (localStorage or a fake) so it is testable.

export const SKINS = [
  { id: 'default', name: 'KING',    cost: 0,   filter: 'none' },
  { id: 'emerald', name: 'EMERALD', cost: 40,  filter: 'hue-rotate(115deg) saturate(1.25)' },
  { id: 'azure',   name: 'AZURE',   cost: 80,  filter: 'hue-rotate(200deg) saturate(1.3)' },
  { id: 'shadow',  name: 'SHADOW',  cost: 130, filter: 'grayscale(1) contrast(1.4) brightness(0.95)' },
  { id: 'inferno', name: 'INFERNO', cost: 200, filter: 'hue-rotate(-35deg) saturate(1.7) brightness(1.1)' },
];

export function skinById(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}

export function loadMeta(store) {
  let unlocked;
  try { unlocked = JSON.parse(store.getItem('sfr-skins') || '["default"]'); } catch { unlocked = ['default']; }
  if (!Array.isArray(unlocked) || !unlocked.includes('default')) unlocked = ['default'];
  return {
    coins: Number(store.getItem('sfr-coins') || 0),
    unlocked,
    skin: store.getItem('sfr-skin') || 'default',
    high: Number(store.getItem('sfr-high') || 0),
    streak: Number(store.getItem('sfr-streak') || 0),
  };
}

export function addCoins(store, n) {
  const c = Math.max(0, Number(store.getItem('sfr-coins') || 0) + n);
  store.setItem('sfr-coins', String(c));
  return c;
}

// Spend coins if affordable. Returns { ok, coins }.
export function spendCoins(store, n) {
  const have = Number(store.getItem('sfr-coins') || 0);
  if (have < n) return { ok: false, coins: have };
  const left = have - n;
  store.setItem('sfr-coins', String(left));
  return { ok: true, coins: left };
}

// Try to unlock a skin. Returns { ok, coins, unlocked }.
export function unlockSkin(store, id) {
  const skin = skinById(id);
  const meta = loadMeta(store);
  if (meta.unlocked.includes(id)) return { ok: true, coins: meta.coins, unlocked: meta.unlocked };
  if (meta.coins < skin.cost) return { ok: false, coins: meta.coins, unlocked: meta.unlocked };
  const unlocked = [...meta.unlocked, id];
  store.setItem('sfr-skins', JSON.stringify(unlocked));
  store.setItem('sfr-coins', String(meta.coins - skin.cost));
  return { ok: true, coins: meta.coins - skin.cost, unlocked };
}

export function selectSkin(store, id) {
  store.setItem('sfr-skin', id);
}

export function dayString(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

// Record a play for today; advances the streak if yesterday was the last play,
// resets to 1 on a gap, unchanged if already played today. Returns the streak.
export function recordDailyPlay(store, today = dayString()) {
  const last = store.getItem('sfr-last-play') || '';
  let streak = Number(store.getItem('sfr-streak') || 0);
  if (last === today) return streak || 1;
  const prev = new Date(`${today}T00:00:00Z`);
  prev.setUTCDate(prev.getUTCDate() - 1);
  const yesterday = prev.toISOString().slice(0, 10);
  streak = last === yesterday ? streak + 1 : 1;
  store.setItem('sfr-streak', String(streak));
  store.setItem('sfr-last-play', today);
  return streak;
}
