import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/platform/store.js';
import { createSpeaker, pickVoice, rateFor } from '../js/platform/speech.js';
import { createAudio } from '../js/platform/audio.js';
import { freshProfile } from '../js/logic/storage-schema.js';

const fakeStorage = (init = {}, { failWrites = false } = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { if (failWrites) throw new Error('quota'); m.set(k, v); }, removeItem: (k) => m.delete(k), _m: m };
};

test('store: empty storage -> fresh state, saves and reloads', () => {
  const st = fakeStorage();
  const a = createStore({ storage: st });
  a.state.profiles.p = freshProfile({ name: 'Sam', avatarSpecies: 'x' });
  assert.equal(a.save(), true);
  const b = createStore({ storage: st });
  assert.equal(b.state.profiles.p.name, 'Sam');
  assert.equal(b.warning, false);
});
test('store: corrupt JSON -> fresh state with warning', () => {
  const s = createStore({ storage: fakeStorage({ 'spellbeasts.v1': '{nope' }) });
  assert.equal(Object.keys(s.state.profiles).length, 0);
  assert.equal(s.warning, true);
  s.dismissWarning();
  assert.equal(s.warning, false);
});
test('store: storage that throws on write -> works in memory, not persistent', () => {
  const s = createStore({ storage: fakeStorage({}, { failWrites: true }) });
  assert.equal(s.persistent, false);
  assert.equal(s.save(), false);
  assert.ok(s.state.wordLists.sample);
});
test('store: no localStorage at all -> still works', () => {
  const s = createStore({ storage: null });
  assert.equal(s.persistent, false);
  assert.ok(s.state);
});
test('store: getItem throwing is handled', () => {
  const st = { getItem() { throw new Error('denied'); }, setItem() {}, removeItem() {} };
  const s = createStore({ storage: st });
  assert.ok(s.state);
  assert.equal(s.persistent, false);
});

const voices = [{ voiceURI: 'a', lang: 'fr-FR' }, { voiceURI: 'b', lang: 'en-GB' }, { voiceURI: 'c', lang: 'en-US' }];
test('speech: voice preference', () => {
  assert.equal(pickVoice(voices, null).voiceURI, 'c');
  assert.equal(pickVoice(voices, 'b').voiceURI, 'b');
  assert.equal(pickVoice(voices, 'gone').voiceURI, 'c');
  assert.equal(pickVoice(voices.slice(0, 2), null).voiceURI, 'b');
  assert.equal(pickVoice([], null), null);
});
test('speech: rates', () => {
  assert.equal(rateFor(false, 0.9), 0.9);
  assert.equal(rateFor(true, 0.9), 0.6);
  assert.equal(rateFor(true, 0.5), 0.5);
});
test('speech: speak uses voice and slow rate; reports no-voice help', () => {
  const spoken = [];
  const synth = { getVoices: () => voices, cancel() {}, speak: (u) => spoken.push(u) };
  class U { constructor(t) { this.text = t; } }
  const sp = createSpeaker({ synth, Utterance: U, getSettings: () => ({ rate: 0.9 }) });
  assert.equal(sp.available, true);
  sp.speak('garden'); sp.speak('garden', { slow: true });
  assert.deepEqual(spoken.map((u) => [u.text, u.rate, u.voice.voiceURI]), [['garden', 0.9, 'c'], ['garden', 0.6, 'c']]);
  const none = createSpeaker({ synth: { getVoices: () => [], cancel() {}, speak() {} }, Utterance: U });
  assert.equal(none.available, false);
  assert.match(none.helpMessage, /voice/i);
  assert.equal(createSpeaker({ synth: undefined, Utterance: undefined }).speak('x'), false);
});

function fakeCtx() {
  const made = [];
  const node = () => ({ connect() {}, frequency: {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, start() {}, stop() {} });
  return { made, currentTime: 0, destination: {}, createOscillator() { made.push(1); return node(); }, createGain: node };
}
test('audio: sound toggle silences effects', () => {
  const c = fakeCtx(); const s = { sound: true, music: true };
  const a = createAudio({ makeContext: () => c, getSettings: () => s });
  assert.equal(a.play('correct'), true);
  assert.equal(c.made.length, 2);
  s.sound = false;
  assert.equal(a.play('correct'), false);
  assert.equal(c.made.length, 2);
});
test('audio: music respects its own toggle and mute, and stops when muted', () => {
  const c = fakeCtx(); const s = { sound: true, music: false };
  let tick = null;
  const a = createAudio({ makeContext: () => c, getSettings: () => s, setTimer: (f) => { tick = f; return 1; }, clearTimer: () => { tick = null; } });
  assert.equal(a.startMusic(), false);
  s.music = true;
  assert.equal(a.startMusic(), true);
  tick(); assert.equal(c.made.length, 1);
  s.sound = false; tick();
  assert.equal(a.musicPlaying, false);
  assert.equal(c.made.length, 1);
});
test('audio: unknown sounds and context failure are safe', () => {
  const a = createAudio({ makeContext: () => { throw new Error('no audio'); }, getSettings: () => ({ sound: true, music: true }) });
  assert.equal(a.play('nope'), false);
  assert.doesNotThrow(() => a.play('chime'));
});
