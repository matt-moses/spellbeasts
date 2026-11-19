// Seasonal looks: Thanksgiving for November up to Thanksgiving Day, Christmas from the day after through December.
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
test('2026: Thanksgiving look all of November up to Thanksgiving Day (Nov 26), then Christmas', () => {
  assert.equal(on(2026, 10, 31), null);
  for (let d = 1; d <= 26; d++) assert.equal(on(2026, 11, d), 'thanksgiving', `Nov ${d}`);
  for (let d = 27; d <= 30; d++) assert.equal(on(2026, 11, d), 'christmas', `Nov ${d}`);
});
test('the switch always happens the day after Thanksgiving, whichever date that is', () => {
  for (let y = 2024; y <= 2035; y++) {
    const t = thanksgivingDay(y);
    assert.equal(new Date(y, 10, t).getDay(), 4, `${y} is a Thursday`);
    assert.equal(on(y, 11, 1), 'thanksgiving');
    assert.equal(on(y, 11, t), 'thanksgiving');
    assert.equal(on(y, 11, t + 1), 'christmas');
    assert.equal(on(y, 11, 30), 'christmas');
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
