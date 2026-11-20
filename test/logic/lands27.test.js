// The twenty-seven-land world: Sugarplum Meadows, Fossil Flats, Aurora Ice Shelf, Moonberry Orchard, Lexicon Library, Slumber Sky (r22-r27).
// The count is forced to 27 before anything is imported. lands21, lands15 and lands tests keep checking the older shapes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rng } from '../helpers.js';

globalThis.SPELLBEASTS_LANDS = 27;
globalThis.SPELLBEASTS_ARENA = true;
const { REGIONS, ALL_REGIONS, SPECIES, NEST_SPECIES, ARENA_SPECIES, bookSpecies, speciesInRegion, arenaSpeciesOf } = await import('../../js/logic/species.js');
const { UNLOCKS, REGION_STEPS, REGION_END, TOTAL_STEPS, isUnlocked, unlockRequirement, updateUnlocks, maxStep, regionOfStep, advanceTrail } = await import('../../js/logic/world.js');
const { wildHearts, cleanRunDamage, heartTier, pickWild, prizeFor, battleBonus } = await import('../../js/logic/battle.js');
const { TROPHIES, evaluateTrophies } = await import('../../js/logic/trophies.js');
const { EGG_PRICES, eggPrice, eggNeeded } = await import('../../js/logic/hatch.js');
const { freshProfile } = await import('../../js/logic/storage-schema.js');
const { SAMPLE_WORDS } = await import('../../data/sample-words.js');
const { buyEgg, hatchEgg } = await import('../../js/logic/collection.js');

const mk = (over = {}) => Object.assign(freshProfile({ name: 'T', avatarSpecies: 'x' }), over);
const mastered = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`w${i}`, { correctDays: ['a', 'b', 'c'] }]));
const NEW = ['r22', 'r23', 'r24', 'r25', 'r26', 'r27'];

test('twenty-seven lands, r1 to r27 in order, the last six named as chosen', () => {
  assert.deepEqual(REGIONS.map((r) => r.id), Array.from({ length: 27 }, (_, i) => `r${i + 1}`));
  assert.equal(REGIONS.length, ALL_REGIONS.length);
  assert.deepEqual(REGIONS.slice(21).map((r) => r.name), ['Sugarplum Meadows', 'Fossil Flats', 'Aurora Ice Shelf', 'Moonberry Orchard', 'Lexicon Library', 'Slumber Sky']);
  assert.equal(new Set(REGIONS.map((r) => r.name)).size, 27);
});
test('108 species: unique, and every land has one common, uncommon, rare and arena creature', () => {
  assert.equal(SPECIES.length, 108);
  assert.equal(new Set(SPECIES.map((s) => s.id)).size, 108);
  assert.equal(new Set(SPECIES.map((s) => s.name)).size, 108);
  for (const r of REGIONS) {
    assert.deepEqual(SPECIES.filter((s) => s.region === r.id).map((s) => s.rarity).sort(), ['arena', 'common', 'rare', 'uncommon'], r.id);
    assert.deepEqual(Object.keys(speciesInRegion(r.id)), ['common', 'uncommon', 'rare']);
    assert.ok(arenaSpeciesOf(r.id), `${r.id} has an arena creature`);
  }
  assert.equal(NEST_SPECIES.length, 81);
  assert.equal(ARENA_SPECIES.length, 27);
  assert.equal(bookSpecies().length, 108);
});
test('unlock rules for lands 22 to 27 keep rising and need level and mastery', () => {
  assert.equal(UNLOCKS.length, 27);
  for (let i = 1; i < 27; i++) { assert.ok(UNLOCKS[i].level > UNLOCKS[i - 1].level, `level ${i}`); assert.ok(UNLOCKS[i].mastered >= UNLOCKS[i - 1].mastered, `mastered ${i}`); }
  assert.deepEqual(UNLOCKS.slice(21), [{ level: 42, mastered: 100 }, { level: 44, mastered: 104 }, { level: 46, mastered: 108 }, { level: 48, mastered: 112 }, { level: 50, mastered: 116 }, { level: 52, mastered: 120 }]);
  for (let i = 21; i < 27; i++) {
    const u = UNLOCKS[i];
    assert.equal(isUnlocked(i, { level: u.level, mastered: u.mastered }), true);
    assert.equal(isUnlocked(i, { level: u.level + 9, mastered: u.mastered - 1 }), false, 'mastery short');
    assert.equal(isUnlocked(i, { level: u.level - 1, mastered: u.mastered + 99 }), false, 'level short');
  }
  assert.equal(unlockRequirement(21), 'Reach level 42 and 100 words mastered');
  assert.equal(unlockRequirement(26), 'Reach level 52 and 120 words mastered');
  assert.ok(SAMPLE_WORDS.length >= UNLOCKS.at(-1).mastered, 'the bundled list can master the last land');
});
test('updateUnlocks opens lands 22 to 27 in order, each only when both halves are met', () => {
  const p = mk({ level: 52, wordStats: { sample: mastered(99) } });
  assert.equal(updateUnlocks(p).at(-1), 'r21');
  p.wordStats.sample = mastered(100);
  assert.deepEqual(updateUnlocks(p), ['r22']);
  p.wordStats.sample = mastered(120);
  assert.deepEqual(updateUnlocks(p), ['r23', 'r24', 'r25', 'r26', 'r27']);
  assert.equal(p.map.unlockedRegions.length, 27);
});
test('the trail grows 72 to 82 steps to 1512 and the token stops at each new gate', () => {
  assert.deepEqual(REGION_STEPS.slice(21), [72, 74, 76, 78, 80, 82]);
  assert.equal(TOTAL_STEPS, 1512);
  for (let i = 1; i < 27; i++) assert.ok(REGION_STEPS[i] > REGION_STEPS[i - 1]);
  for (let i = 0; i < 27; i++) {
    assert.equal(regionOfStep(REGION_END[i]), `r${i + 1}`);
    if (i < 26) assert.equal(regionOfStep(REGION_END[i] + 1), `r${i + 2}`);
  }
  const p = mk({ map: { trailStep: 0, claimedLandmarks: [], unlockedRegions: ALL_REGIONS.slice(0, 22).map((r) => r.id) } });
  assert.equal(maxStep(p), REGION_END[21]);
  p.map.trailStep = REGION_END[21];
  assert.deepEqual(advanceTrail(p), { moved: false, atGate: true });
  p.map.unlockedRegions.push('r23', 'r24', 'r25', 'r26', 'r27');
  p.map.trailStep = TOTAL_STEPS - 1;
  assert.deepEqual(advanceTrail(p), { moved: true, atGate: false });
  assert.deepEqual(advanceTrail(p), { moved: false, atGate: false });
});
test('a save from the twenty-one-land game keeps its place and finds the trail extended', () => {
  const old = mk({ level: 40, wordStats: { sample: mastered(96) } });
  old.map = { trailStep: REGION_END[20], claimedLandmarks: [], unlockedRegions: ALL_REGIONS.slice(0, 21).map((r) => r.id) };
  assert.equal(REGION_END[20], 1050);
  assert.deepEqual(updateUnlocks(old), []);
  assert.equal(old.map.trailStep, 1050);
  assert.deepEqual(advanceTrail(old), { moved: false, atGate: true });
  old.level = 42; old.wordStats.sample = mastered(100);
  assert.deepEqual(updateUnlocks(old), ['r22']);
  assert.deepEqual(advanceTrail(old), { moved: true, atGate: false });
});
test('eggs are priced and take longer in every land, rising all the way', () => {
  assert.deepEqual(EGG_PRICES.slice(21), [550, 600, 655, 715, 780, 850]);
  assert.equal(EGG_PRICES.length, 27);
  for (let i = 1; i < 27; i++) { assert.ok(eggPrice(i) > eggPrice(i - 1)); assert.ok(eggNeeded(i) > eggNeeded(i - 1)); }
});
test('eggs from lands 22 to 27 hatch only that land\'s three Nest creatures, never the arena one', () => {
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
test('lands 22 to 27 are the eighth and ninth battle tiers, and a clean run still always wins', () => {
  assert.deepEqual(Array.from({ length: 27 }, (_, i) => heartTier(i)), [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8]);
  for (let land = 0; land < 27; land++) for (let words = 1; words <= 12; words++) {
    const h = wildHearts(words, land);
    assert.ok(h >= 1 && h <= cleanRunDamage(words), `land ${land}, ${words} words: ${h} hearts`);
  }
});
test('wild creatures and prizes in the newest lands', () => {
  for (const [li, id] of NEW.map((id, k) => [21 + k, id])) {
    const nest = new Set(Object.values(speciesInRegion(id)));
    const arena = arenaSpeciesOf(id);
    const r = rng(5), count = {};
    for (let i = 0; i < 10000; i++) { const w = pickWild({ regionId: id, owned: new Set(), rng: r }); count[w.species] = (count[w.species] ?? 0) + 1; assert.ok(nest.has(w.species) || w.species === arena); }
    assert.ok(Math.abs(count[arena] / 10000 - 0.4) < 0.03, `${id} arena share ${count[arena] / 10000}`);
    assert.deepEqual(prizeFor({ species: arena, owned: new Set(), landIndex: li, rng: () => 0.99 }), { kind: 'befriend', species: arena, crickets: 0 });
    assert.deepEqual(prizeFor({ species: arena, owned: new Set([arena]), landIndex: li }), { kind: 'crickets', species: arena, crickets: battleBonus(li) });
  }
});
test('the grand-voyager trophy opens at 27 lands only, once, and the older ones still fire', () => {
  assert.ok(TROPHIES.some((t) => t.id === 'explorer-27'));
  const ex = (n, have = {}) => evaluateTrophies({ regionsOpen: n }, have).filter((id) => id.startsWith('explorer'));
  assert.deepEqual(ex(26), ['explorer-3', 'explorer-6', 'explorer-9', 'explorer-12', 'explorer-15', 'explorer-21']);
  assert.deepEqual(ex(27), ['explorer-3', 'explorer-6', 'explorer-9', 'explorer-12', 'explorer-15', 'explorer-21', 'explorer-27']);
  assert.deepEqual(ex(27, { 'explorer-3': 'x', 'explorer-6': 'x', 'explorer-9': 'x', 'explorer-12': 'x', 'explorer-15': 'x', 'explorer-21': 'x', 'explorer-27': 'x' }), []);
});
