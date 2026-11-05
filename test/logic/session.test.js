import test from 'node:test';
import assert from 'node:assert/strict';
import { startSession } from '../../js/logic/session.js';
import { freshState, freshProfile } from '../../js/logic/storage-schema.js';
import { rng } from '../helpers.js';

const TODAY = '2026-11-05';
function setup(seed = 1, { seeded = false } = {}) {
  const state = freshState();
  const profile = freshProfile({ name: 'T', avatarSpecies: 'x' });
  const list = state.wordLists.sample;
  if (seeded) { // 12 words seen yesterday and due today
    profile.wordStats.sample = Object.fromEntries(list.words.slice(0, 12).map((w) => [w.word, { box: 1, nextDue: '2026-11-04', correctDays: [], attempts: 1, firstTries: 1, firstTryCorrect: 0, lastMissed: '2026-11-04', lastBoxDate: '2026-11-04' }]));
  }
  const s = startSession({ profile, list, today: TODAY, rng: rng(seed) });
  return { profile, list, s };
}

test('a perfect session pays out first-try, streak and session bonuses', () => {
  const { profile, s } = setup();
  assert.equal(s.total, 3);   // fresh profile: nothing due, max 3 new words (PRD 8.3)
  let n = 0;
  for (let w = s.next(); w; w = s.next()) { assert.equal(s.submit(w.word).correct, true); n++; }
  assert.equal(n, s.total);
  const sum = s.finish();
  const streakBonuses = Math.floor(n / 5) * 2;
  assert.equal(sum.crickets, n * 3 + streakBonuses + 10);   // + session 5 + first-of-day 5
  assert.equal(sum.xp, n * 10 + 15);
  assert.equal(profile.crickets, sum.crickets);
  assert.equal(profile.sessions.length, 1);
  assert.equal(sum.misses, 0);
});
test('a miss requires a correct copy, requeues, and the retry pays less', () => {
  const { profile, s } = setup(2, { seeded: true });
  const w = s.next();
  const r = s.submit(w.word.slice(0, -1));
  assert.equal(r.correct, false);
  assert.equal(r.reward.crickets, 0);
  assert.equal(s.mode, 'correcting');
  assert.throws(() => s.submit('x'));
  assert.equal(s.submitCorrection('nope'), false);
  assert.equal(s.submitCorrection(w.word), true);
  assert.equal(profile.wordStats.sample[w.word].box, 1);
  let seenAgain = false, comeback = false;
  for (let x = s.next(); x; x = s.next()) {
    const res = s.submit(x.word);
    if (x.word === w.word) { seenAgain = true; if (res.comeback) { comeback = true; assert.equal(res.reward.crickets, 1); } }
  }
  assert.ok(seenAgain && comeback);
  assert.equal(s.tally.comebacks, 1);
});
test('capitalization-only miss is flagged', () => {
  const { s } = setup(5, { seeded: true });
  let w = s.next();
  while (!/^[A-Z]/.test(w.word)) { s.submit(w.word); w = s.next(); if (!w) return; }
  const r = s.submit(w.word.toLowerCase());
  assert.equal(r.caseOnly, true);
});
test('stats persist per word and the box moves once per day', () => {
  const { profile, s } = setup(3, { seeded: true });
  const first = s.next();
  s.submit(first.word);
  assert.equal(profile.wordStats.sample[first.word].box, 2);
  assert.deepEqual(profile.wordStats.sample[first.word].correctDays, [TODAY]);
});
test('second session the same day gets no first-session bonus', () => {
  const { profile, list, s } = setup(4, { seeded: true });
  for (let w = s.next(); w; w = s.next()) s.submit(w.word);
  const a = s.finish();
  const s2 = startSession({ profile, list, today: TODAY, rng: rng(4) });
  assert.ok(s2);
  for (let w = s2.next(); w; w = s2.next()) s2.submit(w.word);
  assert.equal(s2.finish().firstSessionOfDay, false);
  assert.equal(a.firstSessionOfDay, true);
});
test('finish is idempotent; level-up is reported', () => {
  const { profile, s } = setup(6, { seeded: true });
  profile.xp = 95;
  for (let w = s.next(); w; w = s.next()) s.submit(w.word);
  const a = s.finish(), b = s.finish();
  assert.strictEqual(a, b);
  assert.equal(profile.sessions.length, 1);
  assert.equal(a.leveledUp, true);
  assert.ok(profile.level >= 2);
});
test('returns null when nothing is due or new', () => {
  const state = freshState();
  const profile = freshProfile({ name: 'T', avatarSpecies: 'x' });
  const list = { words: [{ word: 'a' }] };
  profile.wordStats.sample = { a: { box: 2, nextDue: '2026-12-01', correctDays: [], attempts: 1, firstTries: 1, firstTryCorrect: 1, lastMissed: null, lastBoxDate: TODAY } };
  assert.equal(startSession({ profile, list, today: TODAY }), null);
  assert.ok(startSession({ profile, list, today: TODAY, bonus: true }));
  void state;
});
