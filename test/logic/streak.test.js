import test from 'node:test';
import assert from 'node:assert/strict';
import { recordPlay, displayStreak, weekKey, playedToday } from '../../js/logic/streak.js';

const fresh = () => ({ current: 0, best: 0, lastPlayDate: null, restUsedWeek: null });
const play = (days) => days.reduce((s, d) => recordPlay(s, d), fresh());

test('weeks start Monday', () => {
  assert.equal(weekKey('2026-11-05'), '2026-11-02');   // Thursday
  assert.equal(weekKey('2026-11-02'), '2026-11-02');
  assert.equal(weekKey('2026-11-08'), '2026-11-02');   // Sunday
});
test('consecutive days build the streak; same day does not double count', () => {
  const s = play(['2026-11-02', '2026-11-02', '2026-11-03', '2026-11-04']);
  assert.equal(s.current, 3);
  assert.equal(s.best, 3);
});
test('one missed day is forgiven once per week', () => {
  let s = play(['2026-11-02', '2026-11-04']);          // missed Tue
  assert.equal(s.current, 2);
  assert.equal(s.restUsedWeek, '2026-11-02');
  s = recordPlay(s, '2026-11-06');                     // missed Thu, rest already used this week
  assert.equal(s.current, 1);
  assert.equal(s.best, 2);
});
test('rest day is available again the next week', () => {
  // Wed 11-04 uses the week-of-11-02 rest day; Mon 11-09 resets (4 missed days); Wed 11-11 uses the new week's rest day.
  const s = play(['2026-11-02', '2026-11-04', '2026-11-09', '2026-11-11']);
  assert.equal(s.current, 2);
  assert.equal(s.restUsedWeek, '2026-11-09');
  assert.equal(s.best, 2);
});
test('two or more missed days reset the streak', () => {
  assert.equal(play(['2026-11-02', '2026-11-03', '2026-11-06']).current, 1);
});
test('display: hungry streak shows as kept while a rest day can still save it', () => {
  const s = play(['2026-11-02', '2026-11-03']);
  assert.equal(displayStreak(s, '2026-11-03'), 2);
  assert.equal(displayStreak(s, '2026-11-04'), 2);     // yesterday played
  assert.equal(displayStreak(s, '2026-11-05'), 2);     // one missed day, rest available
  assert.equal(displayStreak(s, '2026-11-07'), 0);     // gone
  assert.equal(displayStreak(fresh(), '2026-11-05'), 0);
  assert.equal(playedToday(s, '2026-11-03'), true);
  assert.equal(playedToday(s, '2026-11-04'), false);
});
