import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMeta, addCoins, unlockSkin, selectSkin, recordDailyPlay, skinById, SKINS } from '../src/game/meta.js';

function fakeStore(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _m: m };
}

test('loadMeta returns sane defaults', () => {
  const meta = loadMeta(fakeStore());
  assert.deepEqual(meta.unlocked, ['default']);
  assert.equal(meta.coins, 0);
  assert.equal(meta.skin, 'default');
});

test('addCoins accumulates and never goes negative', () => {
  const s = fakeStore();
  assert.equal(addCoins(s, 30), 30);
  assert.equal(addCoins(s, 5), 35);
  assert.equal(addCoins(s, -100), 0);
});

test('unlockSkin requires enough coins, then unlocks and deducts', () => {
  const s = fakeStore({ 'sfr-coins': '50' });
  const azure = SKINS.find((x) => x.id === 'azure'); // cost 80
  let r = unlockSkin(s, 'azure');
  assert.equal(r.ok, false, 'cannot afford 80 with 50');
  addCoins(s, 40); // now 90
  r = unlockSkin(s, 'azure');
  assert.equal(r.ok, true);
  assert.equal(r.coins, 90 - azure.cost);
  assert.ok(r.unlocked.includes('azure'));
  // re-unlock is a no-op success, no extra charge
  const r2 = unlockSkin(s, 'azure');
  assert.equal(r2.ok, true);
  assert.equal(r2.coins, 90 - azure.cost);
});

test('selectSkin persists and loadMeta reflects it', () => {
  const s = fakeStore({ 'sfr-skins': '["default","emerald"]', 'sfr-coins': '0' });
  selectSkin(s, 'emerald');
  assert.equal(loadMeta(s).skin, 'emerald');
});

test('daily streak: increments on consecutive days, resets on a gap', () => {
  const s = fakeStore();
  assert.equal(recordDailyPlay(s, '2026-06-26'), 1);
  assert.equal(recordDailyPlay(s, '2026-06-26'), 1, 'same day unchanged');
  assert.equal(recordDailyPlay(s, '2026-06-27'), 2, 'next day +1');
  assert.equal(recordDailyPlay(s, '2026-06-28'), 3);
  assert.equal(recordDailyPlay(s, '2026-07-05'), 1, 'gap resets');
});

test('skinById falls back to default for unknown ids', () => {
  assert.equal(skinById('nope').id, 'default');
});
