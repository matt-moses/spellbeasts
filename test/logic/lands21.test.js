// The twenty-one-land world: Stormbreak Cliffs, Clockwork Glen, Glowcap Grotto, Bamboo Falls, Treasure Cove, Rainbow Reach (r16-r21).
// The count is forced to 21 before anything is imported. lands15.test.js and lands.test.js keep checking the older shapes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rng } from '../helpers.js';

globalThis.SPELLBEASTS_LANDS = 21;
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
const NEW = ['r16', 'r17', 'r18', 'r19', 'r20', 'r21'];

test('twenty-one lands, r1 to r21 in order, the last six named as chosen', () => {
  assert.deepEqual(REGIONS.map((r) => r.id), Array.from({ length: 21 }, (_, i) => `r${i + 1}`));
  assert.equal(REGIONS.length, 21);                    // the data holds more; only the first 21 are live here
  assert.deepEqual(REGIONS.slice(15).map((r) => r.name), ['Stormbreak Cliffs', 'Clockwork Glen', 'Glowcap Grotto', 'Bamboo Falls', 'Treasure Cove', 'Rainbow Reach']);
  assert.equal(new Set(REGIONS.map((r) => r.name)).size, 21);
});
test('84 species: unique, and every land has one common, uncommon, rare and arena creature', () => {
  assert.equal(SPECIES.length, 84);
  assert.equal(new Set(SPECIES.map((s) => s.id)).size, 84);
  assert.equal(new Set(SPECIES.map((s) => s.name)).size, 84);
  for (const r of REGIONS) {
    assert.deepEqual(SPECIES.filter((s) => s.region === r.id).map((s) => s.rarity).sort(), ['arena', 'common', 'rare', 'uncommon'], r.id);
    assert.deepEqual(Object.keys(speciesInRegion(r.id)), ['common', 'uncommon', 'rare']);
    assert.ok(arenaSpeciesOf(r.id), `${r.id} has an arena creature`);
  }
  assert.equal(NEST_SPECIES.length, 63);
  assert.equal(ARENA_SPECIES.length, 21);
  assert.equal(bookSpecies().length, 84);
});
test('unlock rules for lands 16 to 21 keep rising and need level and mastery', () => {
  assert.equal(UNLOCKS.length, 21);
  for (let i = 1; i < 21; i++) { assert.ok(UNLOCKS[i].level > UNLOCKS[i - 1].level, `level ${i}`); assert.ok(UNLOCKS[i].mastered >= UNLOCKS[i - 1].mastered, `mastered ${i}`); }
  assert.deepEqual(UNLOCKS.slice(15), [{ level: 30, mastered: 76 }, { level: 32, mastered: 80 }, { level: 34, mastered: 84 }, { level: 36, mastered: 88 }, { level: 38, mastered: 92 }, { level: 40, mastered: 96 }]);
  for (let i = 15; i < 21; i++) {
    const u = UNLOCKS[i];
    assert.equal(isUnlocked(i, { level: u.level, mastered: u.mastered }), true);
    assert.equal(isUnlocked(i, { level: u.level + 9, mastered: u.mastered - 1 }), false, 'mastery short');
    assert.equal(isUnlocked(i, { level: u.level - 1, mastered: u.mastered + 99 }), false, 'level short');
  }
  assert.equal(unlockRequirement(15), 'Reach level 30 and 76 words mastered');
  assert.equal(unlockRequirement(20), 'Reach level 40 and 96 words mastered');
  assert.ok(SAMPLE_WORDS.length >= UNLOCKS.at(-1).mastered, 'the bundled list can master the last land');
});
test('updateUnlocks opens lands 16 to 21 in order, each only when both halves are met', () => {
  const p = mk({ level: 40, wordStats: { sample: mastered(75) } });
  assert.equal(updateUnlocks(p).at(-1), 'r15');
  p.wordStats.sample = mastered(76);
  assert.deepEqual(updateUnlocks(p), ['r16']);
  p.wordStats.sample = mastered(96);
  assert.deepEqual(updateUnlocks(p), ['r17', 'r18', 'r19', 'r20', 'r21']);
  assert.equal(p.map.unlockedRegions.length, 21);
});
test('the trail grows 60 to 70 steps to 1050 and the token stops at each new gate', () => {
  assert.deepEqual(REGION_STEPS.slice(15), [60, 62, 64, 66, 68, 70]);
  assert.equal(TOTAL_STEPS, 1050);
  for (let i = 1; i < 21; i++) assert.ok(REGION_STEPS[i] > REGION_STEPS[i - 1]);
  for (let i = 0; i < 21; i++) {
    assert.equal(regionOfStep(REGION_END[i]), `r${i + 1}`);
    if (i < 20) assert.equal(regionOfStep(REGION_END[i] + 1), `r${i + 2}`);
  }
  const p = mk({ map: { trailStep: 0, claimedLandmarks: [], unlockedRegions: ALL_REGIONS.slice(0, 16).map((r) => r.id) } });
  assert.equal(maxStep(p), REGION_END[15]);
  p.map.trailStep = REGION_END[15];
  assert.deepEqual(advanceTrail(p), { moved: false, atGate: true });
  p.map.unlockedRegions.push('r17', 'r18', 'r19', 'r20', 'r21');
  p.map.trailStep = TOTAL_STEPS - 1;
  assert.deepEqual(advanceTrail(p), { moved: true, atGate: false });
  assert.deepEqual(advanceTrail(p), { moved: false, atGate: false });
});
test('a save from the fifteen-land game keeps its place and finds the trail extended', () => {
  const old = mk({ level: 28, wordStats: { sample: mastered(72) } });
  old.map = { trailStep: REGION_END[14], claimedLandmarks: [], unlockedRegions: ALL_REGIONS.slice(0, 15).map((r) => r.id) };
  assert.equal(REGION_END[14], 660);
  assert.deepEqual(updateUnlocks(old), []);
  assert.equal(old.map.trailStep, 660);
  assert.deepEqual(advanceTrail(old), { moved: false, atGate: true });
  old.level = 30; old.wordStats.sample = mastered(76);
  assert.deepEqual(updateUnlocks(old), ['r16']);
  assert.deepEqual(advanceTrail(old), { moved: true, atGate: false });
});
test('eggs are priced and take longer in every land, rising all the way', () => {
  assert.deepEqual(EGG_PRICES.slice(15, 21), [300, 335, 370, 410, 450, 500]);
  for (let i = 1; i < 21; i++) { assert.ok(eggPrice(i) > eggPrice(i - 1)); assert.ok(eggNeeded(i) > eggNeeded(i - 1)); }
});
test('eggs from lands 16 to 21 hatch only that land\'s three Nest creatures, never the arena one', () => {
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
test('lands 16 to 21 are the sixth and seventh battle tiers, and a clean run still always wins', () => {
  assert.deepEqual(Array.from({ length: 21 }, (_, i) => heartTier(i)), [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6]);
  for (let land = 0; land < 21; land++) for (let words = 1; words <= 12; words++) {
    const h = wildHearts(words, land);
    assert.ok(h >= 1 && h <= cleanRunDamage(words), `land ${land}, ${words} words: ${h} hearts`);
  }
});
test('wild creatures and prizes in the newest lands', () => {
  for (const [li, id] of NEW.map((id, k) => [15 + k, id])) {
    const nest = new Set(Object.values(speciesInRegion(id)));
    const arena = arenaSpeciesOf(id);
    const r = rng(5), count = {};
    for (let i = 0; i < 10000; i++) { const w = pickWild({ regionId: id, owned: new Set(), rng: r }); count[w.species] = (count[w.species] ?? 0) + 1; assert.ok(nest.has(w.species) || w.species === arena); }
    assert.ok(Math.abs(count[arena] / 10000 - 0.4) < 0.03, `${id} arena share ${count[arena] / 10000}`);
    assert.deepEqual(prizeFor({ species: arena, owned: new Set(), landIndex: li, rng: () => 0.99 }), { kind: 'befriend', species: arena, crickets: 0 });
    assert.deepEqual(prizeFor({ species: arena, owned: new Set([arena]), landIndex: li }), { kind: 'crickets', species: arena, crickets: battleBonus(li) });
  }
});
test('the realm-ruler trophy opens at 21 lands only, once, and the older ones still fire', () => {
  assert.ok(TROPHIES.some((t) => t.id === 'explorer-21'));
  const ex = (n, have = {}) => evaluateTrophies({ regionsOpen: n }, have).filter((id) => id.startsWith('explorer'));
  assert.deepEqual(ex(20), ['explorer-3', 'explorer-6', 'explorer-9', 'explorer-12', 'explorer-15']);
  assert.deepEqual(ex(21), ['explorer-3', 'explorer-6', 'explorer-9', 'explorer-12', 'explorer-15', 'explorer-21']);
  assert.deepEqual(ex(21, { 'explorer-3': 'x', 'explorer-6': 'x', 'explorer-9': 'x', 'explorer-12': 'x', 'explorer-15': 'x', 'explorer-21': 'x' }), []);
});
