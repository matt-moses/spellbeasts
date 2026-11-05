import test from 'node:test';
import assert from 'node:assert/strict';
import { spokenWord, spokenSentence } from '../../js/logic/pronounce.js';
import { parseWordList } from '../../js/logic/import.js';
import { editWord } from '../../js/logic/parent.js';
import { freshState } from '../../js/logic/storage-schema.js';

test('the word is read as spelled unless a pronunciation is set', () => {
  assert.equal(spokenWord({ word: 'laughter' }), 'laughter');
  assert.equal(spokenWord({ word: 'laughter', sayAs: ' laffter ' }), 'laffter');
  assert.equal(spokenWord({ word: 'laughter', sayAs: '   ' }), 'laughter');
  assert.equal(spokenWord(undefined), '');
});
test('a sentence uses the same pronunciation, whole word only, any capitals', () => {
  const r = { word: 'laughter', sayAs: 'laffter', sentence: 'Laughter filled the room. Her laughter was loud, not slaughtered.' };
  assert.equal(spokenSentence(r), 'laffter filled the room. Her laffter was loud, not slaughtered.');
  assert.equal(spokenSentence({ word: 'a', sentence: 'plain.' }), 'plain.');
  assert.equal(spokenSentence({ word: 'x' }), '');
  assert.equal(spokenSentence({ word: 'C++', sayAs: 'see plus plus', sentence: 'I like C++ a lot.' }), 'I like C++ a lot.', 'odd characters never break the pattern');
});
test('import: an optional fifth field sets the pronunciation (pipe and tab)', () => {
  const a = parseWordList('laughter | noun | the sound | We heard laughter. | laffter\ngarden | noun | plants');
  assert.equal(a.words[0].sayAs, 'laffter'); assert.equal('sayAs' in a.words[1], false);
  const b = parseWordList('laughter\tnoun\tthe sound\t\tlaffter');
  assert.equal(b.words[0].sayAs, 'laffter'); assert.equal('sentence' in b.words[0], false);
});
test('editing keeps, changes or clears it, and the answer stays the real spelling', () => {
  const st = freshState();
  assert.equal(editWord(st, 'sample', 'garden', { word: 'garden', partOfSpeech: 'noun', definition: 'd', sayAs: 'gar den' }).ok, true);
  const w = () => st.wordLists.sample.words.find((x) => x.word === 'garden');
  assert.equal(w().sayAs, 'gar den'); assert.equal(w().word, 'garden');
  editWord(st, 'sample', 'garden', { word: 'garden', definition: 'd', sayAs: '' });
  assert.equal('sayAs' in w(), false);
});
