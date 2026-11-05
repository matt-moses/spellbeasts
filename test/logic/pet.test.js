import test from 'node:test';
import assert from 'node:assert/strict';
import { createRotation } from '../../js/logic/pet.js';
import { rng } from '../helpers.js';

test('every item comes up once per cycle, in a random order', () => {
  const r = createRotation(['a', 'b', 'c', 'd', 'e'], rng(4));
  for (let cycle = 0; cycle < 4; cycle++) {
    const seen = Array.from({ length: 5 }, () => r.next());
    assert.deepEqual([...seen].sort(), ['a', 'b', 'c', 'd', 'e']);
  }
});
test('never the same item twice in a row, including across cycles', () => {
  for (let seed = 1; seed < 40; seed++) {
    const r = createRotation([1, 2, 3], rng(seed));
    const seq = Array.from({ length: 60 }, () => r.next());
    for (let i = 1; i < seq.length; i++) assert.notEqual(seq[i], seq[i - 1], `seed ${seed} at ${i}`);
  }
});
test('different seeds give different orders (it is actually random)', () => {
  const orders = new Set();
  for (let seed = 1; seed < 30; seed++) { const r = createRotation([1, 2, 3, 4, 5, 6], rng(seed)); orders.add(Array.from({ length: 6 }, () => r.next()).join('')); }
  assert.ok(orders.size > 10);
});
test('a single item just repeats; an empty list yields undefined', () => {
  const one = createRotation(['x']);
  assert.deepEqual([one.next(), one.next()], ['x', 'x']);
  assert.equal(createRotation([]).next(), undefined);
});
