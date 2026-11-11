// The twelve-land world (plan.md Phase 1). The count is forced to 12 before anything is imported, so this file checks the
// full data whatever the shipped default is; the rest of the suite checks the shipped default.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rng } from '../helpers.js';

globalThis.SPELLBEASTS_LANDS = 12;
globalThis.SPELLBEASTS_ARENA = true;
const { REGIONS, ALL_REGIONS, SPECIES, ALL_SPECIES, NEST_SPECIES, ARENA_SPECIES, bookSpecies, speciesInRegion, arenaSpeciesOf } = await import('../../js/logic/species.js');
const { UNLOCKS, REGION_STEPS, REGION_END, TOTAL_STEPS, LANDMARKS, isUnlocked, unlockRequirement, updateUnlocks, maxStep, regionOfStep, advanceTrail, claimLandmark } = await import('../../js/logic/world.js');
const { wildHearts, cleanRunDamage, heartTier, pickWild, prizeFor, battleBonus } = await import('../../js/logic/battle.js');
const { TROPHIES, evaluateTrophies } = await import('../../js/logic/trophies.js');
const { EGG_PRICES, eggPrice, eggNeeded, duplicateCrickets } = await import('../../js/logic/hatch.js');
const { freshProfile } = await import('../../js/logic/storage-schema.js');
const { addStarter, buyEgg, hatchEgg, warmEggs } = await import('../../js/logic/collection.js');

const mk = (over = {}) => Object.assign(freshProfile({ name: 'T', avatarSpecies: 'x' }), over);
const mastered = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`w${i}`, { correctDays: ['a', 'b', 'c'] }]));

test('twelve lands, r1 to r12 in order, and everything the data holds is live', () => {
  assert.deepEqual(REGIONS.map((r) => r.id), Array.from({ length: 12 }, (_, i) => `r${i + 1}`));
  assert.equal(REGIONS.length, ALL_REGIONS.length);
  assert.equal(SPECIES.length, ALL_SPECIES.length);
  assert.equal(new Set(REGIONS.map((r) => r.name)).size, 12);
});
test('48 species: ids and names unique, and every land has one common, uncommon, rare and arena creature', () => {
  assert.equal(SPECIES.length, 48);
  assert.equal(new Set(SPECIES.map((s) => s.id)).size, 48);
  assert.equal(new Set(SPECIES.map((s) => s.name)).size, 48);
  for (const r of REGIONS) {
    const own = SPECIES.filter((s) => s.region === r.id);
    assert.deepEqual(own.map((s) => s.rarity).sort(), ['arena', 'common', 'rare', 'uncommon'], r.id);
    const nest = speciesInRegion(r.id);
    assert.deepEqual(Object.keys(nest), ['common', 'uncommon', 'rare']);
    assert.ok(arenaSpeciesOf(r.id), `${r.id} has an arena creature`);
  }
  assert.equal(NEST_SPECIES.length, 36);
  assert.equal(ARENA_SPECIES.length, 12);
  assert.equal(bookSpecies().length, 48);
});
test('every species has art, a flavor line and a palette of three colours', () => {
  for (const s of SPECIES) {
    assert.ok(s.flavor.length > 10, s.id);
    assert.equal(s.art.pal.length, 3, s.id);
    for (const c of s.art.pal) assert.match(c, /^#[0-9a-f]{6}$/i, s.id);
  }
});
test('unlock rules never get easier and the new lands need level and mastery', () => {
  assert.equal(UNLOCKS.length, 12);
  for (let i = 1; i < 12; i++) { assert.ok(UNLOCKS[i].level > UNLOCKS[i - 1].level, `level ${i}`); assert.ok(UNLOCKS[i].mastered >= UNLOCKS[i - 1].mastered, `mastered ${i}`); }
  assert.deepEqual(UNLOCKS.slice(9), [{ level: 18, mastered: 53 }, { level: 20, mastered: 56 }, { level: 22, mastered: 60 }]);
  for (let i = 9; i < 12; i++) {
    const u = UNLOCKS[i];
    assert.equal(isUnlocked(i, { level: u.level, mastered: u.mastered }), true);
    assert.equal(isUnlocked(i, { level: u.level + 9, mastered: u.mastered - 1 }), false, 'mastery short');
    assert.equal(isUnlocked(i, { level: u.level - 1, mastered: u.mastered + 99 }), false, 'level short');
  }
  assert.equal(unlockRequirement(9), 'Reach level 18 and 53 words mastered');
  assert.equal(unlockRequirement(11), 'Reach level 22 and 60 words mastered');
});
test('updateUnlocks opens the new lands in order, each only when both halves are met', () => {
  const p = mk({ level: 22, wordStats: { sample: mastered(52) } });
  assert.deepEqual(updateUnlocks(p), ['r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9']);
  p.wordStats.sample = mastered(53);
  assert.deepEqual(updateUnlocks(p), ['r10']);
  p.wordStats.sample = mastered(60);
  assert.deepEqual(updateUnlocks(p), ['r11', 'r12']);
  assert.equal(p.map.unlockedRegions.length, 12);
});
test('the trail grows 48, 50, 52 steps to 492 and the token stops at each new gate', () => {
  assert.deepEqual(REGION_STEPS, [30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52]);
  assert.equal(TOTAL_STEPS, 492);
  for (let i = 1; i < 12; i++) assert.ok(REGION_STEPS[i] > REGION_STEPS[i - 1]);
  assert.equal(LANDMARKS.length, 49);
  for (let i = 0; i < 12; i++) {
    assert.equal(regionOfStep(REGION_END[i]), `r${i + 1}`);
    if (i < 11) assert.equal(regionOfStep(REGION_END[i] + 1), `r${i + 2}`);
  }
  const p = mk({ map: { trailStep: 0, claimedLandmarks: [], unlockedRegions: ALL_REGIONS.slice(0, 10).map((r) => r.id) } });
  assert.equal(maxStep(p), REGION_END[9]);
  p.map.trailStep = REGION_END[9];
  assert.deepEqual(advanceTrail(p), { moved: false, atGate: true });
  p.map.unlockedRegions.push('r11', 'r12');
  p.map.trailStep = TOTAL_STEPS - 1;
  assert.deepEqual(advanceTrail(p), { moved: true, atGate: false });
  assert.deepEqual(advanceTrail(p), { moved: false, atGate: false });
});
test('a save from the nine-land game keeps its place and finds the trail extended', () => {
  const old = mk({ level: 16, wordStats: { sample: mastered(50) } });
  old.map = { trailStep: 342, claimedLandmarks: LANDMARKS.filter((l) => l.step <= 340).map((l) => l.id), unlockedRegions: ALL_REGIONS.slice(0, 9).map((r) => r.id) };
  assert.deepEqual(updateUnlocks(old), []);                                  // nothing new opens by itself
  assert.equal(old.map.trailStep, 342);
  assert.equal(maxStep(old), 342);                                           // the token waits at the old end, now a gate
  assert.deepEqual(advanceTrail(old), { moved: false, atGate: true });
  assert.equal(LANDMARKS.filter((l) => !old.map.claimedLandmarks.includes(l.id)).length, 15);
  old.level = 18; old.wordStats.sample = mastered(53);
  assert.deepEqual(updateUnlocks(old), ['r10']);
  assert.deepEqual(advanceTrail(old), { moved: true, atGate: false });
});
test('landmark chests pay out in the new lands', () => {
  const p = mk({ map: { trailStep: TOTAL_STEPS, claimedLandmarks: [], unlockedRegions: ALL_REGIONS.map((r) => r.id) } });
  const r = claimLandmark(p, 'L490', rng(3));
  assert.equal(r.ok, true);
  assert.equal(claimLandmark(p, 'L490').ok, false);
});
test('eggs have a price and a hatch target in every land, rising all the way', () => {
  assert.equal(EGG_PRICES.length, 12);
  for (let i = 0; i < 12; i++) {
    assert.ok(Number.isInteger(eggPrice(i)) && eggPrice(i) > 0, `price ${i}`);
    assert.ok(eggNeeded(i) > 0 && duplicateCrickets(i) > 0);
    if (i) { assert.ok(eggPrice(i) > eggPrice(i - 1)); assert.ok(eggNeeded(i) > eggNeeded(i - 1)); }
  }
});
test('eggs from lands 10 to 12 hatch only that land\'s three Nest creatures, never the arena one', () => {
  for (const id of ['r10', 'r11', 'r12']) {
    const nest = new Set(Object.values(speciesInRegion(id)));
    const seen = new Set();
    const r = rng(11);
    for (let n = 0; n < 2000; n++) {
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
test('lands 10 to 12 are one tougher tier, and a clean run still always wins', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(heartTier), [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3]);
  for (let land = 0; land < 12; land++) for (let words = 1; words <= 12; words++) {
    const h = wildHearts(words, land);
    assert.ok(h >= 1 && h <= cleanRunDamage(words), `land ${land}, ${words} words: ${h} hearts`);
  }
});
test('wild creatures and prizes in the new lands', () => {
  for (const [li, id] of [[9, 'r10'], [10, 'r11'], [11, 'r12']]) {
    const nest = new Set(Object.values(speciesInRegion(id)));
    const arena = arenaSpeciesOf(id);
    const r = rng(5), count = {};
    for (let i = 0; i < 10000; i++) { const w = pickWild({ regionId: id, owned: new Set(), rng: r }); count[w.species] = (count[w.species] ?? 0) + 1; assert.ok(nest.has(w.species) || w.species === arena); }
    assert.ok(Math.abs(count[arena] / 10000 - 0.4) < 0.03, `${id} arena share ${count[arena] / 10000}`);
    assert.deepEqual(prizeFor({ species: arena, owned: new Set(), landIndex: li, rng: () => 0.99 }), { kind: 'befriend', species: arena, crickets: 0 });
    assert.deepEqual(prizeFor({ species: arena, owned: new Set([arena]), landIndex: li }), { kind: 'crickets', species: arena, crickets: battleBonus(li) });
  }
});
test('the world-traveller trophies: 9 lands and all 12 lands, each earned once', () => {
  assert.ok(TROPHIES.some((t) => t.id === 'explorer-12'));
  assert.deepEqual(evaluateTrophies({ regionsOpen: 9 }, {}).filter((id) => id.startsWith('explorer')), ['explorer-3', 'explorer-6', 'explorer-9']);
  assert.deepEqual(evaluateTrophies({ regionsOpen: 12 }, {}).filter((id) => id.startsWith('explorer')), ['explorer-3', 'explorer-6', 'explorer-9', 'explorer-12']);
  assert.deepEqual(evaluateTrophies({ regionsOpen: 12 }, { 'explorer-3': 'x', 'explorer-6': 'x', 'explorer-9': 'x', 'explorer-12': 'x' }).filter((id) => id.startsWith('explorer')), []);
});
