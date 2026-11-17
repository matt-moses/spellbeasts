// The fifteen-land world: Frostwood, Sunken Bazaar, Starfall Summit (r13-r15). The count is forced to 15 before anything is
// imported. lands.test.js keeps checking the twelve-land shape, so the older switch positions stay covered.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rng } from '../helpers.js';

globalThis.SPELLBEASTS_LANDS = 15;
globalThis.SPELLBEASTS_ARENA = true;
const { REGIONS, ALL_REGIONS, SPECIES, NEST_SPECIES, ARENA_SPECIES, bookSpecies, speciesInRegion, arenaSpeciesOf } = await import('../../js/logic/species.js');
const { UNLOCKS, REGION_STEPS, REGION_END, TOTAL_STEPS, LANDMARKS, isUnlocked, unlockRequirement, updateUnlocks, maxStep, regionOfStep, advanceTrail } = await import('../../js/logic/world.js');
const { wildHearts, cleanRunDamage, heartTier, pickWild, prizeFor, battleBonus } = await import('../../js/logic/battle.js');
const { TROPHIES, evaluateTrophies } = await import('../../js/logic/trophies.js');
const { EGG_PRICES, eggPrice, eggNeeded } = await import('../../js/logic/hatch.js');
const { freshProfile } = await import('../../js/logic/storage-schema.js');
const { buyEgg, hatchEgg } = await import('../../js/logic/collection.js');

const mk = (over = {}) => Object.assign(freshProfile({ name: 'T', avatarSpecies: 'x' }), over);
const mastered = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`w${i}`, { correctDays: ['a', 'b', 'c'] }]));
const NEW = ['r13', 'r14', 'r15'];

test('fifteen lands, r1 to r15 in order, the last three named as chosen', () => {
  assert.deepEqual(REGIONS.map((r) => r.id), Array.from({ length: 15 }, (_, i) => `r${i + 1}`));
  assert.equal(REGIONS.length, ALL_REGIONS.length);
  assert.deepEqual(REGIONS.slice(12).map((r) => r.name), ['Frostwood', 'Sunken Bazaar', 'Starfall Summit']);
  assert.equal(new Set(REGIONS.map((r) => r.name)).size, 15);
});
test('60 species: unique, and every land has one common, uncommon, rare and arena creature', () => {
  assert.equal(SPECIES.length, 60);
  assert.equal(new Set(SPECIES.map((s) => s.id)).size, 60);
  assert.equal(new Set(SPECIES.map((s) => s.name)).size, 60);
  for (const r of REGIONS) {
    assert.deepEqual(SPECIES.filter((s) => s.region === r.id).map((s) => s.rarity).sort(), ['arena', 'common', 'rare', 'uncommon'], r.id);
    assert.deepEqual(Object.keys(speciesInRegion(r.id)), ['common', 'uncommon', 'rare']);
    assert.ok(arenaSpeciesOf(r.id), `${r.id} has an arena creature`);
  }
  assert.equal(NEST_SPECIES.length, 45);
  assert.equal(ARENA_SPECIES.length, 15);
  assert.equal(bookSpecies().length, 60);
});
test('unlock rules for lands 13 to 15 keep rising and need level and mastery', () => {
  assert.equal(UNLOCKS.length, 15);
  for (let i = 1; i < 15; i++) { assert.ok(UNLOCKS[i].level > UNLOCKS[i - 1].level, `level ${i}`); assert.ok(UNLOCKS[i].mastered >= UNLOCKS[i - 1].mastered, `mastered ${i}`); }
  assert.deepEqual(UNLOCKS.slice(12), [{ level: 24, mastered: 64 }, { level: 26, mastered: 68 }, { level: 28, mastered: 72 }]);
  for (let i = 12; i < 15; i++) {
    const u = UNLOCKS[i];
    assert.equal(isUnlocked(i, { level: u.level, mastered: u.mastered }), true);
    assert.equal(isUnlocked(i, { level: u.level + 9, mastered: u.mastered - 1 }), false, 'mastery short');
    assert.equal(isUnlocked(i, { level: u.level - 1, mastered: u.mastered + 99 }), false, 'level short');
  }
  assert.equal(unlockRequirement(12), 'Reach level 24 and 64 words mastered');
  assert.equal(unlockRequirement(14), 'Reach level 28 and 72 words mastered');
});
test('updateUnlocks opens lands 13 to 15 in order, each only when both halves are met', () => {
  const p = mk({ level: 28, wordStats: { sample: mastered(63) } });
  assert.equal(updateUnlocks(p).at(-1), 'r12');
  p.wordStats.sample = mastered(64);
  assert.deepEqual(updateUnlocks(p), ['r13']);
  p.wordStats.sample = mastered(72);
  assert.deepEqual(updateUnlocks(p), ['r14', 'r15']);
  assert.equal(p.map.unlockedRegions.length, 15);
});
test('the trail grows 54, 56, 58 steps to 660 and the token stops at each new gate', () => {
  assert.deepEqual(REGION_STEPS.slice(12), [54, 56, 58]);
  assert.equal(TOTAL_STEPS, 660);
  for (let i = 1; i < 15; i++) assert.ok(REGION_STEPS[i] > REGION_STEPS[i - 1]);
  for (let i = 0; i < 15; i++) {
    assert.equal(regionOfStep(REGION_END[i]), `r${i + 1}`);
    if (i < 14) assert.equal(regionOfStep(REGION_END[i] + 1), `r${i + 2}`);
  }
  const p = mk({ map: { trailStep: 0, claimedLandmarks: [], unlockedRegions: ALL_REGIONS.slice(0, 13).map((r) => r.id) } });
  assert.equal(maxStep(p), REGION_END[12]);
  p.map.trailStep = REGION_END[12];
  assert.deepEqual(advanceTrail(p), { moved: false, atGate: true });
  p.map.unlockedRegions.push('r14', 'r15');
  p.map.trailStep = TOTAL_STEPS - 1;
  assert.deepEqual(advanceTrail(p), { moved: true, atGate: false });
  assert.deepEqual(advanceTrail(p), { moved: false, atGate: false });
});
test('a save from the twelve-land game keeps its place and finds the trail extended', () => {
  const old = mk({ level: 22, wordStats: { sample: mastered(60) } });
  old.map = { trailStep: 492, claimedLandmarks: LANDMARKS.filter((l) => l.step <= 490).map((l) => l.id), unlockedRegions: ALL_REGIONS.slice(0, 12).map((r) => r.id) };
  assert.deepEqual(updateUnlocks(old), []);
  assert.equal(old.map.trailStep, 492);
  assert.equal(maxStep(old), 492);
  assert.deepEqual(advanceTrail(old), { moved: false, atGate: true });
  assert.equal(LANDMARKS.filter((l) => !old.map.claimedLandmarks.includes(l.id)).length, 17);
  old.level = 24; old.wordStats.sample = mastered(64);
  assert.deepEqual(updateUnlocks(old), ['r13']);
  assert.deepEqual(advanceTrail(old), { moved: true, atGate: false });
});
test('eggs are priced and take longer in every land, rising all the way', () => {
  assert.deepEqual(EGG_PRICES.slice(12), [215, 240, 270]);
  assert.equal(EGG_PRICES.length, 15);
  for (let i = 1; i < 15; i++) { assert.ok(eggPrice(i) > eggPrice(i - 1)); assert.ok(eggNeeded(i) > eggNeeded(i - 1)); }
});
test('eggs from lands 13 to 15 hatch only that land\'s three Nest creatures, never the arena one', () => {
  for (const id of NEW) {
    const nest = new Set(Object.values(speciesInRegion(id)));
    const seen = new Set(), r = rng(11);
    for (let n = 0; n < 1500; n++) {
      const p = mk({ crickets: 1e6, map: { trailStep: 0, claimedLandmarks: [], unlockedRegions: ALL_REGIONS.map((x) => x.id) } });
      const { egg } = buyEgg(p, id);
      egg.progress = egg.needed;
      const h = hatchEgg(p, egg.id, r);
      assert.equal(h.ok, true);
      assert.ok(nest.has(h.species), `${id} gave ${h.species}`);
      seen.add(h.species);
    }
    assert.equal(seen.size, 3, `${id} shows all three`);
  }
});
test('lands 13 to 15 are the fifth tier, and a clean run still always wins', () => {
  assert.deepEqual(Array.from({ length: 15 }, (_, i) => heartTier(i)), [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4]);
  for (let land = 0; land < 15; land++) for (let words = 1; words <= 12; words++) {
    const h = wildHearts(words, land);
    assert.ok(h >= 1 && h <= cleanRunDamage(words), `land ${land}, ${words} words: ${h} hearts`);
  }
});
test('wild creatures and prizes in the newest lands', () => {
  for (const [li, id] of [[12, 'r13'], [13, 'r14'], [14, 'r15']]) {
    const nest = new Set(Object.values(speciesInRegion(id)));
    const arena = arenaSpeciesOf(id);
    const r = rng(5), count = {};
    for (let i = 0; i < 10000; i++) { const w = pickWild({ regionId: id, owned: new Set(), rng: r }); count[w.species] = (count[w.species] ?? 0) + 1; assert.ok(nest.has(w.species) || w.species === arena); }
    assert.ok(Math.abs(count[arena] / 10000 - 0.4) < 0.03, `${id} arena share ${count[arena] / 10000}`);
    assert.deepEqual(prizeFor({ species: arena, owned: new Set(), landIndex: li, rng: () => 0.99 }), { kind: 'befriend', species: arena, crickets: 0 });
    assert.deepEqual(prizeFor({ species: arena, owned: new Set([arena]), landIndex: li }), { kind: 'crickets', species: arena, crickets: battleBonus(li) });
  }
});
test('the world-champion trophy opens at 15 lands only, once, and the older ones still fire', () => {
  assert.ok(TROPHIES.some((t) => t.id === 'explorer-15'));
  const ex = (n, have = {}) => evaluateTrophies({ regionsOpen: n }, have).filter((id) => id.startsWith('explorer'));
  assert.deepEqual(ex(14), ['explorer-3', 'explorer-6', 'explorer-9', 'explorer-12']);
  assert.deepEqual(ex(15), ['explorer-3', 'explorer-6', 'explorer-9', 'explorer-12', 'explorer-15']);
  assert.deepEqual(ex(15, { 'explorer-3': 'x', 'explorer-6': 'x', 'explorer-9': 'x', 'explorer-12': 'x', 'explorer-15': 'x' }), []);
});
