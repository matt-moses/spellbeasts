import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAttempt, addDays, daysBetween, isMastered, isDue, newWordStat } from '../../js/logic/leitner.js';

const D1 = '2026-11-05';
test('date math', () => {
  assert.equal(addDays('2026-11-30', 2), '2026-12-02');
  assert.equal(addDays('2026-02-27', 2), '2026-03-01');
  assert.equal(daysBetween('2026-11-05', '2026-11-12'), 7);
});
test('first correct moves box 1 -> 2 with 2-day interval', () => {
  const s = applyAttempt(undefined, { correct: true, firstTry: true, today: D1 });
  assert.equal(s.box, 2);
  assert.equal(s.nextDue, '2026-11-07');
  assert.equal(s.firstTryCorrect, 1);
});
test('incorrect drops to box 1, due the same day', () => {
  let s = { ...newWordStat(), box: 4 };
  s = applyAttempt(s, { correct: false, firstTry: true, today: D1 });
  assert.equal(s.box, 1);
  assert.equal(s.nextDue, D1);
  assert.equal(s.lastMissed, D1);
});
test('box is capped at 5', () => {
  let s = { ...newWordStat(), box: 5 };
  s = applyAttempt(s, { correct: true, firstTry: true, today: D1 });
  assert.equal(s.box, 5);
  assert.equal(s.nextDue, addDays(D1, 14));
});
test('same-day retries never raise the box', () => {
  let s = applyAttempt(undefined, { correct: false, firstTry: true, today: D1 }); // box 1
  s = applyAttempt(s, { correct: true, firstTry: false, today: D1 });
  s = applyAttempt(s, { correct: true, firstTry: false, today: D1 });
  assert.equal(s.box, 1);
  assert.equal(s.correctDays.length, 0);
  assert.equal(s.attempts, 3);
});
test('a same-day second session cannot raise the box twice', () => {
  let s = applyAttempt(undefined, { correct: true, firstTry: true, today: D1 });
  s = applyAttempt(s, { correct: true, firstTry: true, today: D1 });
  assert.equal(s.box, 2);
  assert.deepEqual(s.correctDays, [D1]);
});
test('mastery needs first-try correct on 3 distinct days', () => {
  let s;
  for (const day of [D1, D1, '2026-11-06']) s = applyAttempt(s, { correct: true, firstTry: true, today: day });
  assert.equal(isMastered(s), false);
  s = applyAttempt(s, { correct: true, firstTry: true, today: '2026-11-09' });
  assert.equal(isMastered(s), true);
  assert.ok(s.box >= 4);
});
test('due logic', () => {
  const s = applyAttempt(undefined, { correct: true, firstTry: true, today: D1 });
  assert.equal(isDue(s, D1), false);
  assert.equal(isDue(s, '2026-11-07'), true);
  assert.equal(isDue(undefined, D1), false);
});
