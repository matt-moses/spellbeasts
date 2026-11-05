import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionQueue, nextWord, recordResult, sessionDone, buildSession, buildBonusSession } from '../../js/logic/scheduler.js';
import { applyAttempt } from '../../js/logic/leitner.js';
import { rng } from '../helpers.js';

const names = (n) => Array.from({ length: n }, (_, i) => `w${i}`);

function turnsOf(s, word, answerFn) { // returns turn numbers where word appeared
  const turns = [];
  for (let w = nextWord(s); w; w = nextWord(s)) {
    if (w === word) turns.push(s.turn);
    recordResult(s, w, answerFn(w, s.appearances[w]));
  }
  return turns;
}

test('missed word returns 3 turns later, then 7 turns after a correct retry', () => {
  const s = createSessionQueue(names(20));
  const turns = turnsOf(s, 'w0', (w, n) => !(w === 'w0' && n === 1));
  assert.deepEqual(turns, [1, 4, 11]);
});
test('word appears at most 4 times when always missed', () => {
  const s = createSessionQueue(names(20));
  const turns = turnsOf(s, 'w0', (w) => w !== 'w0');
  assert.equal(turns.length, 4);
  assert.equal(sessionDone(s), true);
});
test('missed again on the confirm goes back 3 later', () => {
  const s = createSessionQueue(names(20));
  const turns = turnsOf(s, 'w0', (w, n) => !(w === 'w0' && (n === 1 || n === 3)));
  assert.deepEqual(turns.slice(0, 4), [1, 4, 11, 14]);
});
test('short queue puts the word at the end', () => {
  const s = createSessionQueue(['a', 'b']);
  nextWord(s); recordResult(s, 'a', false);
  assert.deepEqual(s.queue, ['b', 'a']);
});
test('comeback and firstTry flags', () => {
  const s = createSessionQueue(names(10));
  nextWord(s);
  let r = recordResult(s, 'w0', false);
  assert.equal(r.firstTry, true);
  do { nextWord(s); if (s.current !== 'w0') recordResult(s, s.current, true); } while (s.current !== 'w0');
  r = recordResult(s, 'w0', true);
  assert.equal(r.comeback, true);
  assert.equal(r.retry, true);
});
test('a clean session ends after one pass', () => {
  const s = createSessionQueue(names(5));
  for (let w = nextWord(s); w; w = nextWord(s)) recordResult(s, w, true);
  assert.equal(s.turn, 5);
});

const TODAY = '2026-11-05';
const mk = (n) => names(n).map((word) => ({ word }));

test('session has 10-12 distinct words and at most 3 new', () => {
  for (let seed = 1; seed < 30; seed++) {
    const words = mk(40), stats = {};
    for (let i = 0; i < 20; i++) stats[`w${i}`] = applyAttempt(undefined, { correct: false, firstTry: true, today: '2026-11-01' });
    const r = buildSession({ words, stats, today: TODAY, rng: rng(seed) });
    assert.ok(r.words.length >= 10 && r.words.length <= 12, `size ${r.words.length}`);
    assert.equal(new Set(r.words).size, r.words.length);
    assert.ok(r.words.filter((w) => !stats[w]).length <= 3);
  }
});
test('overdue words come before new words and the most overdue is included', () => {
  const words = mk(30), stats = {};
  stats.w5 = applyAttempt(undefined, { correct: false, firstTry: true, today: '2026-10-01' });
  stats.w6 = applyAttempt(undefined, { correct: false, firstTry: true, today: '2026-11-04' });
  const r = buildSession({ words, stats, today: TODAY, rng: rng(3) });
  assert.ok(r.words.includes('w5') && r.words.includes('w6'));
});
test('nothing due and nothing new -> empty, with a bonus review of weakest words', () => {
  const words = mk(12), stats = {};
  words.forEach(({ word }, i) => { stats[word] = applyAttempt(undefined, { correct: true, firstTry: true, today: TODAY }); });
  assert.equal(buildSession({ words, stats, today: TODAY, rng: rng(1) }).kind, 'empty');
  const b = buildBonusSession({ words, stats, rng: rng(1) });
  assert.equal(b.kind, 'bonus');
  assert.ok(b.words.length >= 10);
});
test('small list fills from lowest box when new+due are few', () => {
  const words = mk(12), stats = {};
  for (let i = 0; i < 9; i++) stats[`w${i}`] = applyAttempt(undefined, { correct: true, firstTry: true, today: TODAY });
  const r = buildSession({ words, stats, today: TODAY, rng: rng(2) });
  assert.equal(r.kind, 'normal');
  assert.ok(r.words.length >= 10);
});
