// Seasonal looks: Thanksgiving from the week before Thanksgiving week, Christmas for all of December.
import test from 'node:test';
import assert from 'node:assert/strict';
import { seasonFor, thanksgivingDay } from '../../js/logic/season.js';

const on = (y, m, d) => seasonFor(new Date(y, m - 1, d, 12));

test('Thanksgiving is the fourth Thursday of November', () => {
  assert.equal(thanksgivingDay(2026), 26);
  assert.equal(thanksgivingDay(2027), 25);
  assert.equal(thanksgivingDay(2028), 23);
  assert.equal(thanksgivingDay(2029), 22);
});
test('2026: the Thanksgiving look runs Monday Nov 16 (the week before Thanksgiving week) to Sunday Nov 29', () => {
  assert.equal(on(2026, 11, 15), null);
  for (let d = 16; d <= 29; d++) assert.equal(on(2026, 11, d), 'thanksgiving', `Nov ${d}`);
  assert.equal(on(2026, 11, 30), null);
});
test('the window always starts on a Monday and ends on a Sunday', () => {
  for (let y = 2024; y <= 2035; y++) {
    const t = thanksgivingDay(y);
    assert.equal(new Date(y, 10, t - 10).getDay(), 1, `${y} start`);
    assert.equal(new Date(y, 10, t + 3).getDay(), 0, `${y} end`);
    assert.equal(on(y, 11, t - 11), null);
    assert.equal(on(y, 11, t - 10), 'thanksgiving');
    if (t + 3 <= 30) { assert.equal(on(y, 11, t + 3), 'thanksgiving'); assert.equal(on(y, 11, t + 4), t + 4 <= 30 ? null : 'christmas'); }   // a Nov 28 Thanksgiving runs into December, where Christmas wins
  }
});
test('Christmas covers every day of December and nothing else', () => {
  for (let d = 1; d <= 31; d++) assert.equal(on(2026, 12, d), 'christmas', `Dec ${d}`);
  assert.equal(on(2027, 1, 1), null);
  for (const m of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) assert.equal(on(2026, m, 15), null, `month ${m}`);
});
test('an override wins, and an unknown one means no theme', () => {
  assert.equal(seasonFor(new Date(2026, 5, 1), 'christmas'), 'christmas');
  assert.equal(seasonFor(new Date(2026, 11, 5), 'none'), null);
  assert.equal(seasonFor(new Date(2026, 11, 5), 'easter'), null);
});
