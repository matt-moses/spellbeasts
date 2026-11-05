import test from 'node:test';
import assert from 'node:assert/strict';
import { turnReward, sessionReward, xpForLevel, levelForXp, levelProgress } from '../../js/logic/rewards.js';

test('first try and retry rewards', () => {
  assert.deepEqual(turnReward({ correct: true, firstTry: true, streakBefore: 0 }), { crickets: 3, xp: 10, streak: 1, streakBonus: false });
  assert.equal(turnReward({ correct: true, firstTry: false, streakBefore: 0 }).crickets, 1);
  assert.equal(turnReward({ correct: true, firstTry: false, streakBefore: 0 }).xp, 5);
});
test('every 5th correct in a row adds +2', () => {
  assert.equal(turnReward({ correct: true, firstTry: true, streakBefore: 3 }).crickets, 3);
  const r = turnReward({ correct: true, firstTry: true, streakBefore: 4 });
  assert.equal(r.crickets, 5);
  assert.equal(r.streakBonus, true);
  assert.equal(turnReward({ correct: true, firstTry: true, streakBefore: 9 }).crickets, 5);
});
test('a miss pays nothing and resets the streak', () => {
  assert.deepEqual(turnReward({ correct: false, firstTry: true, streakBefore: 4 }), { crickets: 0, xp: 0, streak: 0, streakBonus: false });
});
test('mastery adds 25 XP', () => assert.equal(turnReward({ correct: true, firstTry: true, streakBefore: 0, newlyMastered: true }).xp, 35));
test('session rewards', () => {
  assert.deepEqual(sessionReward({ firstSessionOfDay: false }), { crickets: 5, xp: 15 });
  assert.deepEqual(sessionReward({ firstSessionOfDay: true }), { crickets: 10, xp: 15 });
});
test('level thresholds: n costs 50*n from the previous level', () => {
  assert.equal(xpForLevel(1), 0);
  assert.equal(xpForLevel(2), 100);
  assert.equal(xpForLevel(3), 250);
  assert.equal(xpForLevel(4), 450);
  for (let n = 2; n < 12; n++) assert.equal(xpForLevel(n) - xpForLevel(n - 1), 50 * n);
});
test('levelForXp boundaries', () => {
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(99), 1);
  assert.equal(levelForXp(100), 2);
  assert.equal(levelForXp(249), 2);
  assert.equal(levelForXp(250), 3);
  assert.deepEqual(levelProgress(150), { level: 2, into: 50, needed: 150 });
});
