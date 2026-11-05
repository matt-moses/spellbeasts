import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWordList, mergeWords, pruneStats } from '../../js/logic/import.js';

test('pipe separator with optional sentence', () => {
  const r = parseWordList('garden | noun | a place for plants | We sat in the garden.\nisland|noun|land in water');
  assert.equal(r.separator, '|');
  assert.equal(r.words.length, 2);
  assert.equal(r.words[0].sentence, 'We sat in the garden.');
  assert.equal('sentence' in r.words[1], false);
});
test('tab separator', () => {
  const r = parseWordList('garden\tnoun\tplants\nisland\tnoun\twater');
  assert.equal(r.separator, '\t');
  assert.equal(r.words[1].definition, 'water');
});
test('comma separator keeps commas inside the definition', () => {
  const r = parseWordList('garden,noun,a place for plants, flowers, and food,We sat there.');
  assert.equal(r.separator, ',');
  assert.equal(r.words[0].definition, 'a place for plants, flowers, and food');
  assert.equal(r.words[0].sentence, 'We sat there.');
});
test('blank lines and # comments are ignored', () => {
  const r = parseWordList('# my list\n\ngarden|noun|plants\n   \n#x|y|z');
  assert.equal(r.words.length, 1);
  assert.equal(r.errors.length, 0);
});
test('reports missing word and duplicates with line numbers, imports the rest', () => {
  const r = parseWordList('garden|noun|a\n|noun|b\ngarden|noun|c\nisland|noun|d');
  assert.deepEqual(r.errors.map((e) => e.line), [2, 3]);
  assert.deepEqual(r.words.map((w) => w.word), ['garden', 'island']);
});
test('case-sensitive words are distinct', () => {
  assert.equal(parseWordList('Monday|n|a\nmonday|n|b').words.length, 2);
});
test('add mode reports words already in the list', () => {
  const r = parseWordList('garden|n|a\nisland|n|b', { existing: ['garden'] });
  assert.equal(r.errors.length, 1);
  assert.deepEqual(r.words.map((w) => w.word), ['island']);
});
test('replace vs add merge and progress pruning', () => {
  const cur = [{ word: 'a' }, { word: 'b' }], neu = [{ word: 'b' }, { word: 'c' }];
  assert.deepEqual(mergeWords(cur, neu, 'replace').map((w) => w.word), ['b', 'c']);
  assert.deepEqual(mergeWords(cur, neu, 'add').map((w) => w.word), ['a', 'b', 'c']);
  assert.deepEqual(Object.keys(pruneStats({ a: 1, b: 2 }, neu)), ['b']);
});
