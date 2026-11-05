import test from 'node:test';
import assert from 'node:assert/strict';
import { FAQ } from '../../js/ui/help-content.js';

const items = FAQ.flatMap((g) => g.items);
const words = (s) => s.trim().split(/\s+/);

test('there is a good spread of questions in clear groups', () => {
  assert.ok(items.length >= 15);
  assert.ok(FAQ.length >= 4);
  assert.equal(new Set(items.map((i) => i.q)).size, items.length, 'questions are unique');
});
test('every question ends with ? and every answer is a short, plain few sentences', () => {
  for (const { q, a } of items) {
    assert.match(q, /\?$/, q);
    assert.ok(words(a).length >= 5 && words(a).length <= 40, `"${q}" answer has ${words(a).length} words`);
    for (const sentence of a.split(/(?<=[.!?])\s+/)) assert.ok(words(sentence).length <= 22, `"${q}": sentence too long: ${sentence}`);
  }
});
test('answers use kid-sized words (few very long words) and no jargon', () => {
  for (const { q, a } of items) {
    const long = words(a).filter((w) => w.replace(/[^a-z]/gi, '').length >= 11);
    assert.ok(long.length <= 1, `"${q}" has long words: ${long}`);
    assert.doesNotMatch(a, /\b(localStorage|browser|algorithm|schedule|spaced|Leitner|JSON)\b/i, q);
  }
});
test('the FAQs cover the main things a kid will wonder about', () => {
  const text = items.map((i) => `${i.q} ${i.a}`).join(' ').toLowerCase();
  for (const topic of ['capital', 'crickets', 'egg', 'berries', 'mastered', 'streak', 'foggy', 'hear', 'trophies', 'level']) assert.ok(text.includes(topic), `missing: ${topic}`);
});
