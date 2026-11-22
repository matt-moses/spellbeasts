import test from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTIES, recordScore, bestOf, difficultyOf, setDifficulty, handOf, bestText } from '../../js/logic/gamescores.js';
import { createFlap, stepFlap, flap, H } from '../../js/logic/flap.js';
import { createPop, stepPop, whack, HOLES } from '../../js/logic/pop.js';
import { createPattern, nextRound, press, prizeFor as patternPrize } from '../../js/logic/pattern.js';
import { createRunner } from '../../js/logic/runner.js';
import { createCatchGame } from '../../js/logic/minigame.js';
import { PAIRS } from '../../js/logic/memory.js';
import { defaultSettings } from '../../js/logic/storage-schema.js';

const seeded = (s = 7) => () => (s = (s * 16807) % 2147483647) / 2147483647;

test('difficulty defaults to normal, hand to left, and bad values are ignored', () => {
  const p = {};
  assert.equal(difficultyOf(p), 'normal'); assert.equal(setDifficulty(p, 'bogus'), 'normal'); assert.equal(setDifficulty(p, 'hard'), 'hard');
  assert.equal(handOf({}), 'left'); assert.equal(handOf({ hand: 'right' }), 'right'); assert.equal(handOf({ hand: 'x' }), 'left');
  assert.equal(defaultSettings().hand, 'left');
});
test('high scores are kept per game and difficulty; Memory Match prefers fewer moves; zero is never a best', () => {
  const p = {};
  assert.equal(bestText(p, 'run', 'easy'), 'No best yet');
  assert.deepEqual(recordScore(p, 'run', 'easy', 0), { best: null, previous: null, isNew: false });
  assert.equal(recordScore(p, 'run', 'easy', 120).isNew, true);
  assert.equal(recordScore(p, 'run', 'easy', 90).isNew, false); assert.equal(bestOf(p, 'run', 'easy'), 120);
  assert.equal(bestOf(p, 'run', 'hard'), null);
  recordScore(p, 'memory', 'normal', 14); assert.equal(recordScore(p, 'memory', 'normal', 10).isNew, true); assert.equal(recordScore(p, 'memory', 'normal', 12).isNew, false);
  assert.equal(bestOf(p, 'memory', 'normal'), 10);
  assert.equal(bestText(p, 'run', 'easy'), 'Best: 120 steps');
});
test('existing games scale with difficulty and normal is unchanged', () => {
  assert.deepEqual([createRunner({ difficulty: 'easy' }).hearts, createRunner().hearts, createRunner({ difficulty: 'hard' }).speed], [5, 3, 38]);
  assert.deepEqual(DIFFICULTIES.map((d) => createCatchGame({ difficulty: d }).items.length), [12, 15, 20]);
  assert.deepEqual([PAIRS.easy, PAIRS.normal, PAIRS.hard], [4, 6, 8]);
});
test('Sky Flap: a bot that aims for each gate survives on every difficulty; never flapping loses', () => {
  for (const d of DIFFICULTIES) {
    const g = createFlap({ rng: seeded(3), difficulty: d });
    for (let i = 0; i < 60 * 40 && !g.over; i++) {
      const next = g.gates.find((o) => o.x + 9 > 18);
      const target = next ? next.gapY + g.gap / 4 : H / 2;
      if (g.y > target && g.vy >= 0) flap(g);
      stepFlap(g, 1 / 60);
    }
    assert.ok(g.score >= 10, `${d}: passed ${g.score}`);
    const idle = createFlap({ rng: seeded(3), difficulty: d });
    for (let i = 0; i < 60 * 60 && !idle.over; i++) stepFlap(idle, 1 / 60);
    assert.ok(idle.over && idle.hearts === 0, `${d}: idle ends`);
  }
});
test('Critter Pop: tapping every critter scores; an empty hole scores nothing; the game ends on time', () => {
  const g = createPop({ rng: seeded(5), difficulty: 'normal' });
  let n = 0;
  while (!g.done) { stepPop(g, 0.05); g.holes.forEach((h, i) => { if (h.up && whack(g, i)) n += 1; }); }
  assert.equal(g.score, n); assert.ok(n >= 25, `popped ${n}`);
  assert.equal(whack(g, 0), false); assert.equal(g.holes.length, HOLES);
  const lazy = createPop({ rng: seeded(5), difficulty: 'hard' });
  while (!lazy.done) stepPop(lazy, 0.05);
  assert.equal(lazy.score, 0); assert.ok(lazy.escaped > 10);
});
test('Pattern Parrot: repeating correctly wins, a wrong pad ends it, and scores count rounds', () => {
  const g = createPattern({ rng: seeded(9), difficulty: 'easy' });
  assert.equal(press(g, 0), 'ignored');
  let last;
  for (let r = 1; r <= g.rounds; r++) { const seq = nextRound(g); assert.equal(seq.length, r); for (const p of seq) last = press(g, p); }
  assert.equal(last, 'win'); assert.equal(g.score, 5); assert.equal(patternPrize(g), 3);
  const w = createPattern({ rng: seeded(9), difficulty: 'normal' });
  nextRound(w); press(w, w.seq[0]); const s2 = nextRound(w);
  assert.equal(press(w, (s2[0] + 1) % 4), 'wrong'); assert.equal(w.score, 1); assert.equal(w.phase, 'over');
});
