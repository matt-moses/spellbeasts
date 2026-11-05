import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdultBirthYear, birthYearChoices, statsRows, sortRows, mostMissed, previewImport, importIntoList, createListFromImport, renameList, editWord, deleteWord, resetSampleList, setActiveList, renameProfile, deleteProfile, resetProgress, exportJson, parseBackup } from '../../js/logic/parent.js';
import { freshState, freshProfile } from '../../js/logic/storage-schema.js';
import { addStarter } from '../../js/logic/collection.js';
import { applyAttempt } from '../../js/logic/leitner.js';
import { rng } from '../helpers.js';

function world() {
  const state = freshState();
  const p = freshProfile({ name: 'Sam', avatarSpecies: 'burrowby', now: '2026-11-05T00:00:00Z' });
  addStarter(p, 'burrowby', '2026-11-05T00:00:00Z');
  state.profiles.p1 = p;
  return { state, p };
}
const T = '2026-11-05';
const attempt = (p, word, correct, day = T, firstTry = true) => { const ws = (p.wordStats.sample ??= {}); ws[word] = applyAttempt(ws[word], { correct, firstTry, today: day }); };

test('adult gate: a birth year counts only if the person is certainly 18 or older', () => {
  assert.equal(isAdultBirthYear(2007, 2026), true);          // 19 years apart: at least 18 whatever the birthday
  assert.equal(isAdultBirthYear(1980, 2026), true);
  assert.equal(isAdultBirthYear(2008, 2026), false);         // 18 apart: might not have had the birthday yet
  assert.equal(isAdultBirthYear(2015, 2026), false);
  assert.equal(isAdultBirthYear(2026, 2026), false);
  assert.equal(isAdultBirthYear(2030, 2026), false);         // future
  assert.equal(isAdultBirthYear(1800, 2026), false);         // implausibly old
  for (const bad of ['', 'abc', null, undefined, NaN, 1990.5, '19 90']) assert.equal(isAdultBirthYear(bad, 2026), false, String(bad));
  assert.equal(isAdultBirthYear('1990', 2026), true);        // the select hands over a string
});
test('birth year choices run from this year back 100 years', () => {
  const c = birthYearChoices(2026);
  assert.equal(c.length, 101);
  assert.deepEqual([c[0], c.at(-1)], [2026, 1926]);
});

test('stats rows: attempts, accuracy, box, due, mastered, last missed; unseen words are blank', () => {
  const { state, p } = world();
  attempt(p, 'garden', true); attempt(p, 'island', false);
  attempt(p, 'island', true, T, false);
  const rows = statsRows(p, state.wordLists.sample);
  const g = rows.find((r) => r.word === 'garden'), i = rows.find((r) => r.word === 'island'), u = rows.find((r) => r.word === 'window');
  assert.deepEqual([g.attempts, g.accuracy, g.box, g.nextDue, g.mastered, g.missed], [1, 100, 2, '2026-11-07', false, 0]);
  assert.deepEqual([i.attempts, i.accuracy, i.box, i.lastMissed, i.missed], [2, 0, 1, T, 1]);
  assert.deepEqual([u.attempts, u.accuracy, u.box, u.nextDue], [0, null, null, null]);
  assert.equal(rows.length, 15);
});
test('sorting puts empty values last in both directions and is stable; most-missed ranks correctly', () => {
  const { state, p } = world();
  attempt(p, 'garden', false); attempt(p, 'island', false); attempt(p, 'island', false, '2026-11-06');
  attempt(p, 'pencil', true);
  const rows = statsRows(p, state.wordLists.sample);
  const asc = sortRows(rows, 'accuracy', 'asc'), desc = sortRows(rows, 'accuracy', 'desc');
  assert.equal(asc.at(-1).accuracy, null); assert.equal(desc.at(-1).accuracy, null);
  assert.equal(desc[0].word, 'pencil');
  assert.deepEqual(sortRows(rows, 'word', 'asc').slice(0, 2).map((r) => r.word), ['bicycle', 'Canada']);
  assert.deepEqual(mostMissed(rows).map((r) => r.word), ['island', 'garden']);
  assert.equal(mostMissed(rows, 1).length, 1);
});

test('import: replace swaps the list and keeps progress only for words that remain', () => {
  const { state, p } = world();
  attempt(p, 'garden', true); attempt(p, 'island', true);
  const r = importIntoList(state, 'sample', 'garden|noun|a yard\nkettle|noun|a pot for water', 'replace');
  assert.deepEqual([r.ok, r.added], [true, 2]);
  assert.deepEqual(state.wordLists.sample.words.map((w) => w.word), ['garden', 'kettle']);
  assert.deepEqual(Object.keys(p.wordStats.sample), ['garden']);
});
test('import: add keeps everything, reports words already present, and skips them', () => {
  const { state, p } = world();
  attempt(p, 'garden', true);
  const pre = previewImport(state, 'sample', 'garden|n|x\nkettle|n|y', 'add');
  assert.equal(pre.errors.length, 1); assert.equal(pre.words.length, 1);
  const r = importIntoList(state, 'sample', 'garden|n|x\nkettle|n|y', 'add');
  assert.equal(r.added, 1);
  assert.equal(state.wordLists.sample.words.length, 16);
  assert.ok(p.wordStats.sample.garden);
});
test('import with nothing valid changes nothing', () => {
  const { state } = world();
  const r = importIntoList(state, 'sample', '# nothing\n|oops', 'replace');
  assert.equal(r.ok, false);
  assert.equal(state.wordLists.sample.words.length, 15);
  assert.equal(importIntoList(state, 'nope', 'a|b|c', 'add').ok, false);
});
test('a new named list can be created and chosen as a trainer\'s practice list', () => {
  const { state } = world();
  assert.equal(createListFromImport(state, '  ', 'a|b|c').ok, false);
  assert.equal(createListFromImport(state, 'Bee', '').ok, false);
  const r = createListFromImport(state, ' Two Bee ', 'kettle|noun|a pot\nlantern|noun|a light');
  assert.equal(r.ok, true);
  assert.equal(state.wordLists[r.id].name, 'Two Bee');
  assert.equal(setActiveList(state, 'p1', r.id), true);
  assert.equal(state.profiles.p1.activeListId, r.id);
  assert.equal(setActiveList(state, 'p1', 'nope'), false);
  assert.equal(renameList(state, r.id, 'Grade 4'), true);
  assert.equal(renameList(state, r.id, ' '), false);
  assert.equal(state.wordLists[r.id].name, 'Grade 4');
});
test('editing a word: validation, duplicates, and a re-spelled word starts fresh', () => {
  const { state, p } = world();
  attempt(p, 'garden', true); attempt(p, 'island', true);
  assert.equal(editWord(state, 'sample', 'garden', { word: '' }).ok, false);
  assert.match(editWord(state, 'sample', 'garden', { word: 'island' }).error, /already/);
  assert.equal(editWord(state, 'sample', 'nope', { word: 'x' }).ok, false);
  assert.equal(editWord(state, 'sample', 'garden', { word: 'garden', partOfSpeech: 'noun', definition: 'new text', sentence: '' }).ok, true);
  assert.equal(state.wordLists.sample.words.find((w) => w.word === 'garden').definition, 'new text');
  assert.equal('sentence' in state.wordLists.sample.words.find((w) => w.word === 'garden'), false);
  assert.ok(p.wordStats.sample.garden);                                   // same spelling: progress kept
  assert.equal(editWord(state, 'sample', 'island', { word: 'Island', definition: 'd' }).ok, true);
  assert.equal(p.wordStats.sample.island, undefined);                     // re-spelled: progress gone
});
test('deleting a word removes its progress; resetting the sample list restores it', () => {
  const { state, p } = world();
  attempt(p, 'garden', true); attempt(p, 'island', true);
  assert.equal(deleteWord(state, 'sample', 'garden'), true);
  assert.equal(deleteWord(state, 'sample', 'garden'), false);
  assert.equal(p.wordStats.sample.garden, undefined);
  assert.equal(state.wordLists.sample.words.length, 14);
  resetSampleList(state);
  assert.equal(state.wordLists.sample.words.length, 15);
  assert.ok(p.wordStats.sample.island);
});

test('profiles: rename, reset progress keeps the trainer and starter, delete', () => {
  const { state, p } = world();
  p.crickets = 99; p.xp = 500; p.level = 3; attempt(p, 'garden', true); p.trophies.x = T;
  assert.equal(renameProfile(state, 'p1', ' Sammy '), true);
  assert.equal(renameProfile(state, 'p1', ''), false);
  assert.equal(resetProgress(state, 'p1'), true);
  const q = state.profiles.p1;
  assert.deepEqual([q.name, q.avatarSpecies, q.crickets, q.xp, q.level, q.createdAt], ['Sammy', 'burrowby', 0, 0, 1, '2026-11-05T00:00:00Z']);
  assert.deepEqual(q.wordStats, {}); assert.deepEqual(q.trophies, {});
  assert.equal(q.creatures.length, 1);
  assert.equal(q.creatures[0].species, 'burrowby');
  assert.equal(deleteProfile(state, 'p1'), true);
  assert.equal(deleteProfile(state, 'p1'), false);
  assert.equal(resetProgress(state, 'p1'), false);
});

test('backup round-trips ALL data exactly, and bad files are rejected with a friendly message', () => {
  const { state, p } = world();
  p.crickets = 7; attempt(p, 'garden', true); p.eggs.push({ id: 'e', regionId: 'r1', progress: 2, needed: 10 });
  state.settings.rate = 0.7;
  createListFromImport(state, 'Extra', 'kettle|noun|pot');
  const back = parseBackup(exportJson(state));
  assert.equal(back.ok, true);
  assert.deepEqual(back.state, state);
  for (const bad of ['', '{nope', '[]', '42', '{"version":"1"}', '{"version":99,"settings":{},"wordLists":{},"profiles":{}}', '{"version":1,"wordLists":3,"profiles":{}}']) {
    const r = parseBackup(bad);
    assert.equal(r.ok, false, bad);
    assert.ok(r.error.length > 10);
  }
});
