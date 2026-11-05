import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAnswer } from '../../js/logic/answer.js';

test('exact match is correct', () => assert.equal(checkAnswer('garden', 'garden').correct, true));
test('trims outer whitespace only', () => {
  assert.equal(checkAnswer('  garden \n', 'garden').correct, true);
  assert.equal(checkAnswer('gar den', 'garden').correct, false);
});
test('case-sensitive: monday for Monday is wrong with a capitalization note', () => {
  const r = checkAnswer('monday', 'Monday');
  assert.equal(r.correct, false);
  assert.equal(r.caseOnly, true);
});
test('spelling error is not caseOnly and diff marks bad letters', () => {
  const r = checkAnswer('gardin', 'garden');
  assert.equal(r.caseOnly, false);
  assert.deepEqual(r.diff.filter((d) => !d.ok).map((d) => d.ch), ['e']);
});
test('empty and missing input are wrong', () => {
  assert.equal(checkAnswer('', 'a').correct, false);
  assert.equal(checkAnswer(undefined, 'a').caseOnly, false);
});
test('short answer marks missing letters', () => {
  assert.equal(checkAnswer('gard', 'garden').diff.filter((d) => !d.ok).length, 2);
});
