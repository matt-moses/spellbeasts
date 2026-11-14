import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addTime, formatDuration, recentTotals, normalizeTime, isPracticeRoute, TICK_CAP_MS, DAY_HISTORY_CAP } from '../../js/logic/playtime.js';
import { freshProfile, migrate } from '../../js/logic/storage-schema.js';

test('play and practice are counted separately', () => {
  const p = freshProfile({ name: 'A', avatarSpecies: 'x' });
  addTime(p, 1000, { practicing: false, date: '2026-11-13' });
  addTime(p, 1000, { practicing: true, date: '2026-11-13' });
  assert.equal(p.time.playMs, 2000);
  assert.equal(p.time.practiceMs, 1000);
  assert.deepEqual(p.time.days['2026-11-13'], { playMs: 2000, practiceMs: 1000 });
});
test('long gaps and junk are not counted', () => {
  const p = freshProfile({ name: 'A', avatarSpecies: 'x' });
  assert.equal(addTime(p, 60000, { practicing: true, date: '2026-11-13' }), TICK_CAP_MS);
  for (const bad of [-5, NaN, undefined, 0]) assert.equal(addTime(p, bad, { practicing: true, date: '2026-11-13' }), 0);
});
test('old saves gain a time record; junk is repaired', () => {
  const { state } = migrate({ version: 1, settings: {}, wordLists: {}, profiles: { p1: { name: 'Old', avatarSpecies: 'x' }, p2: { name: 'J', avatarSpecies: 'x', time: { playMs: 'lots', days: [] } } } });
  assert.deepEqual(state.profiles.p1.time, { playMs: 0, practiceMs: 0, days: {} });
  assert.deepEqual(normalizeTime(state.profiles.p2.time), { playMs: 0, practiceMs: 0, days: {} });
  const p = { time: 'broken' };
  addTime(p, 1000, { practicing: false, date: '2026-11-13' });
  assert.equal(p.time.playMs, 1000);
});
test('day history is capped to the newest days', () => {
  const p = freshProfile({ name: 'A', avatarSpecies: 'x' });
  for (let i = 0; i < DAY_HISTORY_CAP + 10; i++) addTime(p, 1000, { practicing: false, date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10) });
  assert.equal(Object.keys(p.time.days).length, DAY_HISTORY_CAP);
  assert.equal(p.time.playMs, (DAY_HISTORY_CAP + 10) * 1000, 'totals keep everything');
});
test('recentTotals sums the last n calendar days, across a month end', () => {
  const t = { playMs: 0, practiceMs: 0, days: { '2026-10-30': { playMs: 1000, practiceMs: 500 }, '2026-11-02': { playMs: 2000, practiceMs: 0 }, '2026-10-20': { playMs: 9999, practiceMs: 9999 } } };
  assert.deepEqual(recentTotals(t, '2026-11-02', 7), { playMs: 3000, practiceMs: 500 });
});
test('formatDuration', () => {
  assert.equal(formatDuration(0), '0 s');
  assert.equal(formatDuration(45000), '45 s');
  assert.equal(formatDuration(12 * 60000), '12 min');
  assert.equal(formatDuration(65 * 60000), '1 h 05 min');
});
test('which routes count as practice', () => {
  for (const r of ['practice', 'battle', 'learn']) assert.ok(isPracticeRoute(r));
  for (const r of ['home', 'map', 'care', 'parent', '']) assert.ok(!isPracticeRoute(r));
});
