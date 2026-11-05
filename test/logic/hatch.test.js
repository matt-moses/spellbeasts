import test from 'node:test';
import assert from 'node:assert/strict';
import { rollEgg, rollRarity, eggPrice, eggNeeded, duplicateCrickets, addEggProgress, feedCreature, canEvolve, evolve } from '../../js/logic/hatch.js';
import { rng } from '../helpers.js';

const region = { common: 'c', uncommon: 'u', rare: 'r' };

test('prices rise by region and duplicates pay half', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map(eggPrice), [20, 30, 40, 50, 60, 75, 90, 105, 125]);
  assert.equal(duplicateCrickets(0), 10);
  assert.equal(duplicateCrickets(5), 37);
});
test('rarity weights are roughly 60/30/10', () => {
  const r = rng(42), n = 20000, c = { common: 0, uncommon: 0, rare: 0 };
  for (let i = 0; i < n; i++) c[rollRarity(r)]++;
  assert.ok(Math.abs(c.common / n - 0.6) < 0.02);
  assert.ok(Math.abs(c.uncommon / n - 0.3) < 0.02);
  assert.ok(Math.abs(c.rare / n - 0.1) < 0.02);
});
test('owned species is re-rolled once; a second owned roll is a duplicate', () => {
  const seq = [0.1, 0.95]; // common (owned) -> re-roll -> rare
  let i = 0;
  const res = rollEgg({ regionSpecies: region, owned: new Set(['c']), rng: () => seq[i++] });
  assert.deepEqual(res, { species: 'r', duplicate: false });
  i = 0;
  const dup = rollEgg({ regionSpecies: region, owned: new Set(['c']), rng: () => 0.1 });
  assert.deepEqual(dup, { species: 'c', duplicate: true });
});
test('egg progress clamps and flags ready', () => {
  let e = { progress: 8, needed: eggNeeded(0) };
  assert.equal(addEggProgress(e, 1).ready, false);
  e = addEggProgress(e, 5);
  assert.equal(e.progress, 10);
  assert.equal(e.ready, true);
});
test('stage 1 -> 2 needs 30 fed AND level 3', () => {
  const c = { stage: 1, fed: 30 };
  assert.equal(canEvolve(c, { level: 2, mastered: 50 }), false);
  assert.equal(canEvolve({ stage: 1, fed: 29 }, { level: 9, mastered: 50 }), false);
  assert.equal(canEvolve(c, { level: 3, mastered: 0 }), true);
});
test('stage 2 -> 3 needs 60 more fed AND 10 mastered; stage 3 is final', () => {
  assert.equal(canEvolve({ stage: 2, fed: 60 }, { level: 9, mastered: 9 }), false);
  assert.equal(canEvolve({ stage: 2, fed: 59 }, { level: 9, mastered: 10 }), false);
  const e = evolve({ stage: 2, fed: 60 }, { level: 9, mastered: 10 });
  assert.deepEqual(e, { stage: 3, fed: 0 });
  assert.equal(canEvolve(e, { level: 99, mastered: 99 }), false);
});
test('feeding is capped at what the stage needs', () => {
  assert.equal(feedCreature({ stage: 1, fed: 25 }, 20).fed, 30);
  assert.equal(feedCreature({ stage: 3, fed: 0 }, 20).fed, 0);
});
