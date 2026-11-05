import test from 'node:test';
import assert from 'node:assert/strict';
import { recordPlay } from '../../js/logic/streak.js';
import { careOf, moodOf, average, giveBerry, pet, finishBath, finishGame, claimSparkle, canPlay, GAME_COST, GAME_REFUND, METER_MAX, freshCareStats } from '../../js/logic/care.js';
import { freshProfile } from '../../js/logic/storage-schema.js';
import { addStarter } from '../../js/logic/collection.js';

function setup() {
  const p = freshProfile({ name: 'T', avatarSpecies: 'burrowby' });
  const c = addStarter(p, 'burrowby');
  return { p, c };
}
const D1 = '2026-11-05';

test('new trainers start with berries and zeroed care stats; creatures start at 3 of 5 on every meter', () => {
  const { p, c } = setup();
  assert.equal(p.berries, 3);
  assert.deepEqual(p.care, freshCareStats());
  const care = careOf(c, D1);
  assert.deepEqual([care.fed, care.clean, care.loved, care.fun], [3, 3, 3, 3]);
  assert.equal(moodOf(care), 'happy');
});
test('meters drift down a little each day, never below 0 and never more than 3 in one go', () => {
  const { c } = setup();
  const care = careOf(c, D1);
  careOf(c, D1);                                          // same day: no drift
  assert.equal(care.fed, 3);
  careOf(c, '2026-11-06');
  assert.deepEqual([care.fed, care.fun], [2, 2]);
  careOf(c, '2026-11-26');                                // a long absence only costs 3
  assert.deepEqual([care.fed, care.clean, care.loved, care.fun], [0, 0, 0, 0]);
  assert.equal(moodOf(care), 'sad');
});
test('mood ladder: sparkling needs every meter at 4+', () => {
  const m = (a, b, c, d) => moodOf({ fed: a, clean: b, loved: c, fun: d });
  assert.equal(m(4, 4, 4, 4), 'sparkling');
  assert.equal(m(5, 5, 5, 3), 'happy');
  assert.equal(m(2, 2, 3, 2), 'okay');
  assert.equal(m(1, 1, 2, 2), 'sad');
  assert.equal(average({ fed: 5, clean: 3, loved: 4, fun: 0 }), 3);
});
test('berries: cost one, fill the fed meter by 2, stop at full, and need some in the basket', () => {
  const { p, c } = setup();
  assert.deepEqual(giveBerry(p, c, D1), { ok: true });
  assert.deepEqual([p.berries, c.care.fed, p.care.berriesFed], [2, 5, 1]);
  assert.deepEqual(giveBerry(p, c, D1), { ok: false, reason: 'full' });
  assert.equal(p.berries, 2);                              // a refused berry is not spent
  p.berries = 0; c.care.fed = 1;
  assert.deepEqual(giveBerry(p, c, D1), { ok: false, reason: 'no-berries' });
});
test('petting: every third pet fills the loved meter a notch, capped at 5', () => {
  const { p, c } = setup();
  assert.equal(pet(p, c, D1).notch, false); assert.equal(pet(p, c, D1).notch, false);
  assert.equal(pet(p, c, D1).notch, true);
  assert.equal(c.care.loved, 4);
  for (let i = 0; i < 12; i++) pet(p, c, D1);
  assert.equal(c.care.loved, METER_MAX);
  assert.equal(p.care.pets, 15);
});
test('bath: +3 clean (capped) and counted', () => {
  const { p, c } = setup();
  finishBath(p, c, D1);
  assert.deepEqual([c.care.clean, p.care.baths], [5, 1]);
});
test('games cost 3 crickets, a great game (tier 2+) refunds 1, fun +3, and games never give berries', () => {
  const { p, c } = setup();
  p.crickets = 20; const berries = p.berries;
  assert.deepEqual(finishGame(p, c, D1, 3), { cost: GAME_COST, refund: 0 });          // tier 0: 3 caught
  assert.equal(p.crickets, 17);
  assert.deepEqual(finishGame(p, c, D1, 7), { cost: GAME_COST, refund: 0 });          // tier 1
  assert.deepEqual(finishGame(p, c, D1, 8), { cost: GAME_COST, refund: GAME_REFUND }); // tier 2 = great
  assert.equal(p.crickets, 20 - 3 - 3 - 3 + 1);
  assert.deepEqual(finishGame(p, c, D1, 0, 5), { cost: GAME_COST, refund: GAME_REFUND }); // a game's own tier wins
  assert.deepEqual([c.care.fun, p.berries, p.care.games], [5, berries, 4]);
});
test('canPlay needs the cost in crickets, and a game can never push crickets below zero', () => {
  const { p, c } = setup();
  p.crickets = 2; assert.equal(canPlay(p), false);
  p.crickets = 3; assert.equal(canPlay(p), true);
  p.crickets = 1; assert.deepEqual(finishGame(p, c, D1, 0), { cost: 1, refund: 0 }); assert.equal(p.crickets, 0);
});
test('sparkle gift: +3 crickets once per creature per day, only when every meter is 4+ and you practiced today', () => {
  const { p, c } = setup();
  p.streak = recordPlay(p.streak, D1);
  assert.deepEqual(claimSparkle(p, c, D1), { ok: false });
  Object.assign(careOf(c, D1), { fed: 4, clean: 5, loved: 4, fun: 4 });
  assert.deepEqual(claimSparkle(p, c, D1), { ok: true, crickets: 3 });
  assert.deepEqual(claimSparkle(p, c, D1), { ok: false });
  assert.deepEqual([p.crickets, p.care.sparkles], [3, 1]);
  Object.assign(careOf(c, '2026-11-06'), { fed: 4, clean: 4, loved: 4, fun: 4 });   // next day: not until you practice again
  assert.deepEqual(claimSparkle(p, c, '2026-11-06'), { ok: false, reason: 'no-practice' });
  p.streak = recordPlay(p.streak, '2026-11-06');
  assert.equal(claimSparkle(p, c, '2026-11-06').ok, true);
  assert.equal(p.crickets, 6);
});
