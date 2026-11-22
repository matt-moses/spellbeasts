import test from 'node:test';
import assert from 'node:assert/strict';
import { freshProfile } from '../../js/logic/storage-schema.js';
import { addStarter } from '../../js/logic/collection.js';
import { CHEST_EVERY, chestsEarned, chestsPending, wordsToNextChest, openChest, REWARD_WEIGHTS } from '../../js/logic/chest.js';

const seeded = (s = 7) => { s = (s * 2654435761) % 2147483647 || 1; return () => (s = (s * 48271) % 2147483647) / 2147483647; };
function trainer(mastered) {
  const p = freshProfile({ name: 'T', avatarSpecies: 'pip' });
  p.wordStats[p.activeListId] = Object.fromEntries(Array.from({ length: mastered }, (_, i) => [`w${i}`, { correctDays: ['a', 'b', 'c'] }]));
  return p;
}
const starter = (p) => { const { STARTER_IDS } = globalThis.__ids; return addStarter(p, STARTER_IDS[0]); };
globalThis.__ids = await import('../../js/logic/species.js');

test('one chest for every five mastered words, and unopened chests wait', () => {
  assert.equal(CHEST_EVERY, 5);
  const p = trainer(12); starter(p);
  assert.deepEqual([chestsEarned(p), chestsPending(p), wordsToNextChest(p)], [2, 2, 3]);
  assert.equal(openChest(p, { rng: seeded(1) }).ok, true);
  assert.equal(chestsPending(p), 1);
  assert.equal(openChest(p, { rng: seeded(2) }).left, 0);
  assert.deepEqual(openChest(p, { rng: seeded(3) }), { ok: false });
});
test('every kind of reward arrives, pays out, and a chest is never empty', () => {
  const seen = {};
  for (let seed = 1; seed < 400; seed++) {
    const p = trainer(5); const pet = starter(p); p.crickets = 0; p.berries = 0;
    pet.care = { fed: 1, clean: 1, loved: 1, fun: 1, petTicks: 0, day: '2026-11-22', sparkleDay: null };
    const r = openChest(p, { rng: seeded(seed), today: '2026-11-22' });
    assert.ok(r.ok); seen[r.reward.kind] = (seen[r.reward.kind] ?? 0) + 1;
    if (r.reward.kind === 'crickets') assert.equal(p.crickets, r.reward.amount) && assert.ok(r.reward.amount >= 10);
    if (r.reward.kind === 'berries') assert.ok(p.berries >= 3 && p.berries <= 6);
    if (r.reward.kind === 'treat') assert.deepEqual(['fed', 'clean', 'loved', 'fun'].map((m) => pet.care[m]), [3, 3, 3, 3]);
    if (r.reward.kind === 'egg') { assert.equal(p.eggs.length, 1); assert.equal(p.eggs[0].progress, 0); assert.ok(p.map.unlockedRegions.includes(p.eggs[0].regionId)); }
  }
  assert.deepEqual(Object.keys(seen).sort(), Object.keys(REWARD_WEIGHTS).sort());
});
test('with no pet there is no treat; opening needs a waiting chest', () => {
  for (let seed = 1; seed < 200; seed++) { const p = trainer(5); const r = openChest(p, { rng: seeded(seed) }); assert.notEqual(r.reward.kind, 'treat'); }
  assert.equal(openChest(trainer(4), {}).ok, false);
});
