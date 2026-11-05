import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, freshProfile, migrate, validate, capSessions } from '../../js/logic/storage-schema.js';

test('fresh state is valid and ships the sample list', () => {
  const s = freshState();
  assert.equal(validate(s), true);
  assert.equal(s.wordLists.sample.words.length, 15);
  assert.ok(s.wordLists.sample.words.some((w) => w.word === 'Monday'));
});
test('missing key -> fresh state, no warning', () => assert.deepEqual(migrate(null), { state: freshState(), warning: false }));
test('corrupt data -> fresh state with warning', () => {
  for (const bad of ['x', 5, [], {}, { version: 'a' }, { version: 1, wordLists: 3, profiles: {} }]) assert.equal(migrate(bad).warning, true, JSON.stringify(bad));
});
test('partial profiles are filled with defaults', () => {
  const { state } = migrate({ version: 1, settings: {}, wordLists: {}, profiles: { p1: { name: 'Sam', avatarSpecies: 'x' } } });
  assert.equal(state.profiles.p1.crickets, 0);
  assert.deepEqual(state.profiles.p1.map.unlockedRegions, ['r1']);
  assert.equal(state.settings.rate, 0.9);
});
test('session history is capped at the last 200', () => {
  const p = freshProfile({ name: 'a', avatarSpecies: 'x' });
  p.sessions = Array.from({ length: 250 }, (_, i) => ({ i }));
  capSessions(p);
  assert.equal(p.sessions.length, 200);
  assert.equal(p.sessions[0].i, 50);
});
test('state round-trips through JSON unchanged', () => {
  const s = freshState();
  s.profiles.p = freshProfile({ name: 'a', avatarSpecies: 'x', now: '2026-11-05T00:00:00Z' });
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(s))).state, s);
});
