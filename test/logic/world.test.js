import test from 'node:test';
import assert from 'node:assert/strict';
import { UNLOCKS, isUnlocked, unlockRequirement, updateUnlocks, maxStep, advanceTrail, claimLandmark, LANDMARKS, REGION_STEPS, REGION_END, TOTAL_STEPS, regionOfStep } from '../../js/logic/world.js';
import { startSession } from '../../js/logic/session.js';
import { freshProfile, freshState } from '../../js/logic/storage-schema.js';
import { buyEgg } from '../../js/logic/collection.js';
import { rng } from '../helpers.js';

const mk = (over = {}) => Object.assign(freshProfile({ name: 'T', avatarSpecies: 'x' }), over);
const mastered = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`w${i}`, { correctDays: ['a', 'b', 'c'] }]));

test('unlock table matches the PRD', () => {
  assert.deepEqual(UNLOCKS, [{ level: 1, mastered: 0 }, { level: 2, mastered: 0 }, { level: 4, mastered: 0 }, { level: 6, mastered: 15 }, { level: 8, mastered: 25 }, { level: 10, mastered: 40 }, { level: 12, mastered: 44 }, { level: 14, mastered: 47 }, { level: 16, mastered: 50 }]);
});
test('a region needs BOTH level and mastery', () => {
  for (let i = 2; i < 9; i++) {
    const u = UNLOCKS[i];
    assert.equal(isUnlocked(i, { level: u.level, mastered: u.mastered }), true, `region ${i + 1}`);
    assert.equal(isUnlocked(i, { level: u.level + 5, mastered: u.mastered - 1 }), false, `region ${i + 1} mastery short`);
    assert.equal(isUnlocked(i, { level: u.level - 1, mastered: u.mastered + 50 }), false, `region ${i + 1} level short`);
  }
  assert.equal(isUnlocked(1, { level: 2, mastered: 0 }), true);
  assert.equal(isUnlocked(1, { level: 1, mastered: 99 }), false);
  assert.equal(unlockRequirement(2), 'Reach level 4');
  assert.equal(unlockRequirement(1), 'Reach level 2');
});
test('updateUnlocks adds regions in order and reports only new ones', () => {
  const p = mk({ level: 4 });   // Ember Peaks needs no mastery
  assert.deepEqual(updateUnlocks(p), ['r2', 'r3']);
  assert.deepEqual(updateUnlocks(p), []);
  assert.deepEqual(p.map.unlockedRegions, ['r1', 'r2', 'r3']);
});
test('the token walks to the gate of the last unlocked region and waits', () => {
  const p = mk();
  assert.equal(maxStep(p), REGION_STEPS[0]);
  for (let i = 0; i < REGION_STEPS[0]; i++) assert.equal(advanceTrail(p).moved, true);
  const r = advanceTrail(p);
  assert.deepEqual(r, { moved: false, atGate: true });
  assert.equal(p.map.trailStep, REGION_STEPS[0]);
  p.map.unlockedRegions.push('r2');
  assert.equal(advanceTrail(p).moved, true);
  assert.equal(regionOfStep(1), 'r1'); assert.equal(regionOfStep(30), 'r1'); assert.equal(regionOfStep(31), 'r2'); assert.equal(regionOfStep(TOTAL_STEPS), 'r9');
});
test('landmarks: every 10 steps, claimable once and only when reached', () => {
  assert.equal(LANDMARKS.length, Math.floor(TOTAL_STEPS / 10));
  const p = mk();
  assert.deepEqual(claimLandmark(p, 'L10'), { ok: false });       // not reached yet
  p.map.trailStep = 10;
  const r = claimLandmark(p, 'L10', rng(7));
  assert.equal(r.ok, true);
  assert.ok(r.crickets >= 5 && r.crickets <= 15);
  assert.equal(p.crickets, r.crickets);
  assert.deepEqual(claimLandmark(p, 'L10', rng(7)), { ok: false });
  assert.equal(p.crickets, r.crickets);
  assert.deepEqual(claimLandmark(p, 'L20'), { ok: false });
  assert.deepEqual(claimLandmark(p, 'nope'), { ok: false });
});
test('chest reward range over many claims; egg boost only when an egg is waiting', () => {
  const seen = new Set(); let boosts = 0;
  for (let seed = 1; seed < 200; seed++) {
    const p = mk({ crickets: 20 }); buyEgg(p, 'r1'); p.crickets = 0; p.map.trailStep = 10;
    const r = claimLandmark(p, 'L10', rng(seed));
    seen.add(r.crickets); if (r.boost) { boosts++; assert.equal(p.eggs[0].progress, 3); }
  }
  assert.ok(Math.min(...seen) === 5 && Math.max(...seen) === 15);
  assert.ok(boosts > 15 && boosts < 70, `boosts ${boosts}`);
  const noEgg = mk(); noEgg.map.trailStep = 10;
  for (let seed = 1; seed < 100; seed++) { const q = mk(); q.map.trailStep = 10; assert.equal(claimLandmark(q, 'L10', rng(seed)).boost, 0); }
  void noEgg;
});
test('in a session, only first-try correct answers move the token; misses and retries do not', () => {
  const state = freshState(); const p = mk(); const list = state.wordLists.sample;
  p.wordStats.sample = Object.fromEntries(list.words.slice(0, 12).map((w) => [w.word, { box: 1, nextDue: '2026-11-04', correctDays: [], attempts: 1, firstTries: 1, firstTryCorrect: 0, lastMissed: '2026-11-04', lastBoxDate: '2026-11-04' }]));
  const s = startSession({ profile: p, list, today: '2026-11-05', rng: rng(2) });
  const w = s.next(); s.submit('zzz'); s.submitCorrection(w.word);       // miss: no step
  assert.equal(p.map.trailStep, 0);
  for (let x = s.next(); x; x = s.next()) s.submit(x.word);
  assert.equal(p.map.trailStep, s.tally.correctFirstTry);                 // retries did not move it
  assert.equal(s.tally.steps, s.tally.correctFirstTry);
});
test('reaching the unlock thresholds mid-session reports the new region', () => {
  const state = freshState(); const p = mk({ xp: 95 }); const list = state.wordLists.sample;
  const s = startSession({ profile: p, list, today: '2026-11-05', rng: rng(3) });
  for (let x = s.next(); x; x = s.next()) s.submit(x.word);
  const sum = s.finish();
  assert.ok(sum.level >= 2);
  assert.deepEqual(sum.unlocked, ['r2']);
});

test('the answer that unlocks a region can already step the token past the old gate', () => {
  const state = freshState(); const p = mk({ xp: 90, level: 1 }); const list = state.wordLists.sample;
  p.map.trailStep = REGION_STEPS[0];                        // waiting at the gate of region 2
  const s = startSession({ profile: p, list, today: '2026-11-05', rng: rng(5) });
  const w = s.next();
  s.submit(w.word);                                          // +10 XP -> level 2 -> region 2 opens
  assert.deepEqual(p.map.unlockedRegions, ['r1', 'r2']);
  assert.equal(p.map.trailStep, REGION_STEPS[0] + 1);
});

test('each land has a longer stretch of trail than the one before (progressively harder)', () => {
  for (let i = 1; i < REGION_STEPS.length; i++) assert.ok(REGION_STEPS[i] > REGION_STEPS[i - 1], `land ${i + 1}`);
  assert.equal(REGION_END.at(-1), TOTAL_STEPS);
  const p = mk(); p.map.unlockedRegions = ['r1', 'r2', 'r3'];
  assert.equal(maxStep(p), REGION_END[2]);
});
test('unlock requirements keep rising, and stay reachable with a 50-word list', () => {
  for (let i = 1; i < UNLOCKS.length; i++) { assert.ok(UNLOCKS[i].level > UNLOCKS[i - 1].level); assert.ok(UNLOCKS[i].mastered >= UNLOCKS[i - 1].mastered); }
  assert.ok(UNLOCKS.at(-1).mastered <= 50);
});
