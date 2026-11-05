import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunner, stepRunner, jump, score, prizeFor as runPrize, PLAYER_X1, HEARTS } from '../../js/logic/runner.js';
import { createMemory, flip, settle, prizeFor as memPrize } from '../../js/logic/memory.js';
import { rng } from '../helpers.js';

function run(g, chooser, maxT = 90, dt = 1 / 60) {
  for (let t = 0; t < maxT && !g.over; t += dt) { if (chooser(g)) jump(g); stepRunner(g, dt); }
  return g;
}
// A good player: hop when the next obstacle is about to arrive.
const bot = (g) => { const o = g.obstacles.find((x) => x.x + x.w > 14 && !x.hit); return !!o && g.y === 0 && o.x - PLAYER_X1 < g.speed * 0.44 - (5 + o.w) / 2; };   // centre the hop over the obstacle

test('runner: a player who hops at the right moment survives a long run and the game speeds up', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const g = run(createRunner({ rng: rng(seed) }), bot, 60);
    assert.equal(g.over, false, `seed ${seed} ended after ${g.t.toFixed(1)}s`);
    assert.equal(g.hearts, HEARTS);
    assert.ok(g.speed > 35, 'speeds up');
    assert.ok(g.obstacles.length >= 0 && score(g) > 1000);
  }
});
test('runner: never hopping loses all three hearts and ends the run', () => {
  const g = run(createRunner({ rng: rng(3) }), () => false);
  assert.equal(g.over, true); assert.equal(g.hearts, 0); assert.equal(g.hits, 3);
  assert.ok(score(g) > 0 && score(g) < 800);
});
test('runner: a bump gives a moment of safety, a hop only works from the ground, and stepping a finished run does nothing', () => {
  const g = createRunner({ rng: rng(1) });
  g.obstacles.push({ x: 15, w: 7, h: 12, kind: 'log', hit: false });
  stepRunner(g, 0.01); assert.equal(g.hearts, HEARTS - 1); assert.ok(g.safe > 0.9);
  g.obstacles.push({ x: 15, w: 7, h: 12, kind: 'log', hit: false });
  stepRunner(g, 0.01); assert.equal(g.hearts, HEARTS - 1, 'safe time protects');
  const h = createRunner({ rng: rng(2) }); jump(h); stepRunner(h, 0.05); const y = h.y; jump(h); assert.equal(h.vy < 110, true); assert.ok(y > 0);
  const done = run(createRunner({ rng: rng(3) }), () => false); const snap = JSON.stringify({ ...done, rng: 0 }); stepRunner(done, 1); assert.equal(JSON.stringify({ ...done, rng: 0 }), snap);
});
test('runner: berry prizes grow with the distance, capped at 5', () => {
  assert.equal(runPrize({ dist: 150 }), 0); assert.equal(runPrize({ dist: 450 }), 2); assert.equal(runPrize({ dist: 99999 }), 5);
});

test('memory: shuffled pairs; matching keeps cards, a mismatch must settle before the next flip', () => {
  const g = createMemory({ pairs: ['a', 'b', 'c'], rng: rng(5) });
  assert.equal(g.cards.length, 6);
  const idx = (id) => g.cards.filter((c) => c.id === id).map((c) => c.index);
  const [a1, a2] = idx('a'), [b1] = idx('b');
  assert.equal(flip(g, a1), 'first'); assert.equal(flip(g, a1), 'ignored', 'same card twice');
  assert.equal(flip(g, b1), 'mismatch'); assert.equal(g.moves, 1);
  assert.equal(flip(g, a2), 'ignored', 'locked until settled');
  settle(g); assert.deepEqual([g.cards[a1].state, g.cards[b1].state], ['down', 'down']);
  assert.equal(flip(g, a1), 'first'); assert.equal(flip(g, a2), 'match');
  assert.deepEqual([g.cards[a1].state, g.cards[a2].state], ['matched', 'matched']);
  assert.equal(flip(g, a1), 'ignored', 'matched cards stay');
});
test('memory: finishing all pairs ends it, and prizes reward fewer moves', () => {
  const g = createMemory({ pairs: ['a', 'b', 'c', 'd'], rng: rng(9) });
  for (const id of ['a', 'b', 'c', 'd']) { const [x, y] = g.cards.filter((c) => c.id === id).map((c) => c.index); flip(g, x); flip(g, y); }
  assert.equal(g.done, true); assert.equal(g.moves, 4); assert.equal(memPrize(g), 3);
  assert.equal(memPrize({ moves: 7, pairCount: 4 }), 2); assert.equal(memPrize({ moves: 30, pairCount: 4 }), 1);
  assert.equal(flip(g, 0), 'ignored');
});
test('memory: shuffle differs by seed', () => {
  const orders = new Set(); for (let s = 1; s < 20; s++) orders.add(createMemory({ pairs: [1, 2, 3, 4, 5, 6], rng: rng(s) }).cards.map((c) => c.id).join(''));
  assert.ok(orders.size > 10);
});
