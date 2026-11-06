import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS, CHECKS, showExample, quizFor } from '../../js/logic/spells.js';
import { spellMasterSvg } from '../../js/assets/spellmaster.js';

const all = LESSONS.flatMap((l) => l.groups.flatMap((g) => g.examples.map((ex) => ({ lesson: l, group: g, ex }))));

test('every group has a known rule check, a heading, a rule and examples', () => {
  assert.ok(LESSONS.length >= 10);
  assert.equal(new Set(LESSONS.map((l) => l.id)).size, LESSONS.length, 'lesson ids are unique');
  for (const l of LESSONS) for (const g of l.groups) {
    assert.equal(typeof CHECKS[g.kind], 'function', `${l.id}: no check for ${g.kind}`);
    assert.ok(g.heading && g.rule && g.examples.length >= 4, `${l.id}/${g.kind} is incomplete`);
  }
});

test('every example word really follows the rule it is taught under', () => {
  for (const { group, ex } of all) {
    assert.ok(CHECKS[group.kind](ex), `"${ex.word}" does not follow the ${group.kind} rule`);
  }
});

test('the rule checks reject words that break them (the checks are not vacuous)', () => {
  assert.ok(!CHECKS.dropE({ base: 'hope', add: 'ing', word: 'hopeing' }));
  assert.ok(!CHECKS.double({ base: 'run', add: 'ing', word: 'runing' }));
  assert.ok(!CHECKS.double({ base: 'jump', add: 'ing', word: 'jumpping' }));
  assert.ok(!CHECKS.yToI({ base: 'play', add: 'ed', word: 'plaied' }));
  assert.ok(!CHECKS.es({ base: 'cat', add: 'es', word: 'cates' }));
  assert.ok(!CHECKS.ful({ base: 'help', add: 'ful', word: 'helpfull' }));
  assert.ok(!CHECKS.ie({ word: 'receive' }) && !CHECKS.ie({ word: 'ceiling' }));
  assert.ok(!CHECKS.softc({ word: 'cat' }) && !CHECKS.hardc({ word: 'city' }));
  assert.ok(!CHECKS.meet({ base: 'kind', add: 'ness', word: 'kindness' }));
});

test('the shown pieces always spell the finished word', () => {
  for (const { group, ex } of all) {
    const { result, terms } = showExample(group.kind, ex);
    assert.equal(result.map(([t]) => t).join(''), ex.word, `${ex.word}: result pieces`);
    if (terms) { // dropped letters are crossed out, so the kept letters plus the ending spell the word
      const kept = terms.map((t) => t.filter(([, f]) => f !== 'cut').map(([x]) => x).join(''));
      const joined = group.kind === 'yToI' ? kept[0] + 'i' + kept[1] : group.kind === 'double' ? kept[0] + kept[0].at(-1) + kept[1] : kept.join('');
      assert.equal(group.kind === 'prefix' ? kept.join('') : joined, ex.word, `${ex.word}: equation`);
    }
  }
});

test('every misspelling differs from its word and is never one of the lesson words', () => {
  const words = new Set(all.map(({ ex }) => ex.word));
  for (const { ex } of all) {
    if (!ex.wrong) continue;
    assert.notEqual(ex.wrong, ex.word);
    assert.ok(!words.has(ex.wrong), `"${ex.wrong}" is a lesson word`);
  }
  for (const w of new Set(all.map(({ ex }) => ex.word))) assert.equal(all.filter(({ ex }) => ex.word === w).length, 1, `"${w}" appears twice`);
});

test('every lesson has a quiz of up to four questions with the right answer among two options', () => {
  for (const l of LESSONS) {
    const qs = quizFor(l);
    assert.ok(qs.length >= 3 && qs.length <= 4, `${l.id}: ${qs.length} questions`);
    for (const q of qs) {
      assert.equal(q.options.length, 2);
      assert.deepEqual([...q.options].sort(), [q.word, q.wrong].sort());
    }
  }
});

test('the Spell Master art is a labelled SVG', () => {
  const svg = spellMasterSvg({ size: 100 });
  assert.match(svg, /^<svg[^>]*role="img"[^>]*aria-label="[^"]+"/);
  assert.match(svg, /<\/svg>$/);
  assert.equal((svg.match(/<svg/g) ?? []).length, 1);
});
