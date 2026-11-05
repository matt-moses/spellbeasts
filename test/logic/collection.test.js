import test from 'node:test';
import assert from 'node:assert/strict';
import { addStarter, buyEgg, warmEggs, readyEggs, hatchEgg, feed, tryEvolve, evolveHint, masteredCount } from '../../js/logic/collection.js';
import { freshProfile } from '../../js/logic/storage-schema.js';
import { SPECIES, REGIONS, STARTER_IDS, speciesInRegion } from '../../js/logic/species.js';
import { PART_NAMES, ART_KEYS } from '../../js/assets/creatures.js';

const mk = (over = {}) => Object.assign(freshProfile({ name: 'T', avatarSpecies: 'x' }), over);

test('species data: 18 species, 3 per region with one of each rarity, unique ids', () => {
  assert.equal(SPECIES.length, 18);
  assert.equal(new Set(SPECIES.map((s) => s.id)).size, 18);
  for (const r of REGIONS) {
    const here = SPECIES.filter((s) => s.region === r.id);
    assert.deepEqual(here.map((s) => s.rarity).sort(), ['common', 'rare', 'uncommon']);
    assert.equal(Object.keys(speciesInRegion(r.id)).length, 3);
  }
  assert.equal(STARTER_IDS.length, 3);
  for (const id of STARTER_IDS) assert.equal(SPECIES.find((s) => s.id === id).rarity, 'common');
});
test('species art only uses parts the builder knows', () => {
  for (const s of SPECIES) {
    const a = s.art;
    assert.ok(ART_KEYS.body.includes(a.body) && ART_KEYS.ears.includes(a.ears) && ART_KEYS.tail.includes(a.tail) && ART_KEYS.face.includes(a.face), s.id);
    for (const p of [...(a.s1 ?? []), ...(a.s2 ?? []), ...(a.s3 ?? [])]) assert.ok(PART_NAMES.has(p), `${s.id}: ${p}`);
    assert.equal(a.pal.length, 3);
  }
});
test('starter becomes avatar and companion', () => {
  const p = mk(); const c = addStarter(p, 'burrowby');
  assert.equal(p.avatarSpecies, 'burrowby');
  assert.equal(p.companion, c.id);
  assert.equal(p.creatures.length, 1);
});
test('buying eggs: region prices, locked regions, not enough crickets', () => {
  const p = mk({ crickets: 25 });
  assert.deepEqual(buyEgg(p, 'r2'), { ok: false, reason: 'locked' });
  assert.equal(buyEgg(p, 'r1').ok, true);
  assert.equal(p.crickets, 5);
  assert.deepEqual(buyEgg(p, 'r1'), { ok: false, reason: 'crickets' });
  p.map.unlockedRegions.push('r2'); p.crickets = 100;
  buyEgg(p, 'r2');
  assert.equal(p.crickets, 70);   // r2 egg costs 30
});
test('correct answers warm the first unfinished egg; hatching needs it ready', () => {
  const p = mk({ crickets: 100 }); buyEgg(p, 'r1'); buyEgg(p, 'r1');
  const [a, b] = p.eggs;
  assert.deepEqual(hatchEgg(p, a.id), { ok: false });
  for (let i = 0; i < a.needed; i++) warmEggs(p);
  assert.equal(readyEggs(p).length, 1);
  assert.equal(p.eggs[1].progress, 0);
  warmEggs(p);
  assert.equal(p.eggs[1].progress, 1);
  assert.equal(b.id, p.eggs[1].id);
});
test('hatching adds the creature, counts the hatch and earns First Hatch; species come from the egg region', () => {
  const p = mk({ crickets: 20 }); buyEgg(p, 'r1');
  for (let i = 0; i < p.eggs[0].needed; i++) warmEggs(p);
  const r = hatchEgg(p, p.eggs[0].id, () => 0.05, '2026-11-05');
  assert.equal(r.ok, true);
  assert.equal(r.species, 'burrowby');
  assert.equal(p.eggs.length, 0);
  assert.ok(r.trophies.includes('first-hatch'));
  assert.equal(p.creatures[0].stage, 1);
});
test('a duplicate hatch pays half the egg price and adds a friendship heart', () => {
  const p = mk({ crickets: 20 }); addStarter(p, 'burrowby'); buyEgg(p, 'r1');
  for (let i = 0; i < p.eggs[0].needed; i++) warmEggs(p);
  const before = p.crickets;
  const r = hatchEgg(p, p.eggs[0].id, () => 0.05);
  assert.equal(r.duplicate, true);
  assert.equal(p.crickets, before + 10);
  assert.equal(p.creatures.length, 1);
  assert.equal(p.creatures[0].hearts, 1);
});
test('feeding spends only what fits and what you have', () => {
  const p = mk({ crickets: 12 }); const c = addStarter(p, 'burrowby');
  assert.equal(feed(p, c.id, 10), 10);
  assert.equal(feed(p, c.id, 10), 2);          // only 2 crickets left
  assert.equal(c.fed, 12);
  p.crickets = 100;
  assert.equal(feed(p, c.id, 50), 18);          // stage 1 needs 30 total
  assert.equal(feed(p, c.id, 10), 0);
});
test('evolution needs feeding AND level / mastery; reaching stage 3 earns Fully Evolved', () => {
  const p = mk({ crickets: 500, level: 2 }); const c = addStarter(p, 'burrowby');
  feed(p, c.id, 30);
  assert.equal(tryEvolve(p, c.id).ok, false);
  assert.match(evolveHint(p, c), /level 3/);
  p.level = 3;
  assert.equal(tryEvolve(p, c.id).ok, true);
  assert.equal(c.stage, 2); assert.equal(c.fed, 0);
  feed(p, c.id, 60);
  assert.match(evolveHint(p, c), /master 10 more words/);
  assert.equal(tryEvolve(p, c.id).ok, false);
  p.wordStats[p.activeListId] = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`w${i}`, { correctDays: ['a', 'b', 'c'] }]));
  assert.equal(masteredCount(p), 10);
  const r = tryEvolve(p, c.id, '2026-11-05');
  assert.equal(r.ok, true);
  assert.equal(c.stage, 3);
  assert.ok(r.trophies.includes('fully-evolved'));
  assert.equal(evolveHint(p, c), 'Fully evolved!');
});
