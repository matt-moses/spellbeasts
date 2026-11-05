import test from 'node:test';
import assert from 'node:assert/strict';
import { rankVoices, voiceScore, pickVoice, voiceLabel } from '../../js/platform/speech.js';

const V = (name, lang, localService = true) => ({ name, lang, voiceURI: name, localService });
const voices = [V('eSpeak English', 'en-US'), V('Fred', 'en-US'), V('Microsoft Aria Online (Natural)', 'en-US', false), V('Google UK English Female', 'en-GB', false), V('Amelie', 'fr-FR'), V('Plain Voice', 'en-US')];

test('only English voices, natural ones first, robotic ones last', () => {
  const r = rankVoices(voices).map((v) => v.name);
  assert.equal(r[0], 'Microsoft Aria Online (Natural)');
  assert.ok(!r.includes('Amelie'));
  assert.deepEqual(r.slice(-2).sort(), ['Fred', 'eSpeak English']);
  assert.ok(r.indexOf('Plain Voice') < r.indexOf('Fred'));
});
test('ties keep the original order and empty input is safe', () => {
  assert.deepEqual(rankVoices([V('A', 'en-US'), V('B', 'en-US')]).map((v) => v.name), ['A', 'B']);
  assert.deepEqual(rankVoices([]), []); assert.deepEqual(rankVoices(), []);
});
test('automatic choice is the best voice; a saved voice wins; a vanished one falls back', () => {
  assert.equal(pickVoice(voices, null).name, 'Microsoft Aria Online (Natural)');
  assert.equal(pickVoice(voices, 'Plain Voice').name, 'Plain Voice');
  assert.equal(pickVoice(voices, 'gone').name, 'Microsoft Aria Online (Natural)');
  assert.equal(pickVoice([V('Amelie', 'fr-FR')], null).name, 'Amelie');
});
test('natural voices get a star in the label', () => {
  assert.match(voiceLabel(voices[2]), /★/); assert.doesNotMatch(voiceLabel(voices[5]), /★/);
  assert.ok(voiceScore(voices[2]) > voiceScore(voices[5]));
});
