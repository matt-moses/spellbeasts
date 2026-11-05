import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunner, stepRunner, jump, score, prizeFor as runPrize, PLAYER_X1, HEARTS, GRAVITY, JUMP_V, MAX_SPEED, GROUND_Y, spriteTop, hopLift, SPRITE_SIZE } from '../../js/logic/runner.js';
import { creatureSvg } from '../../js/assets/creatures.js';
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
test('runner: score tiers grow with the distance, capped at 5', () => {
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

// ---- Hop Run quality: gravity, fairness, frame-rate independence
const arc = (dt) => { const g = createRunner({ rng: rng(1) }); jump(g); const ys = []; let t = 0;
  do { stepRunner(g, dt); t += dt; ys.push(g.y); } while (g.y > 0 && t < 3); return { g, ys, t }; };
test('runner gravity: a hop rises, peaks near v²/2g, falls back, and lands exactly on the ground at rest', () => {
  const { g, ys, t } = arc(1 / 60);
  const peak = Math.max(...ys), i = ys.indexOf(peak);
  assert.ok(Math.abs(peak - JUMP_V ** 2 / (2 * GRAVITY)) < 1, `peak ${peak}`);
  assert.ok(ys.slice(0, i + 1).every((y, k, a) => k === 0 || y > a[k - 1]), 'only rising up to the peak');
  assert.ok(ys.slice(i).every((y, k, a) => k === 0 || y < a[k - 1] || y === 0), 'only falling after it');
  assert.ok(Math.abs(t - 2 * JUMP_V / GRAVITY) < 0.05, `airtime ${t}`);
  assert.equal(g.y, 0); assert.equal(g.vy, 0);
  assert.ok(ys[i - 1] - ys[i - 2] > ys[i] - ys[i - 1], 'decelerates on the way up (gravity pulls)');
});
test('runner gravity: the arc is the same at 30, 60 and 144 frames per second', () => {
  const peaks = [30, 60, 144].map((f) => Math.max(...arc(1 / f).ys));
  assert.ok(Math.max(...peaks) - Math.min(...peaks) < 1.5, peaks.join());
});
test('runner gravity: no double hop in the air, and standing still never drifts', () => {
  const g = createRunner({ rng: rng(1) }); jump(g); for (let i = 0; i < 10; i++) stepRunner(g, 1 / 60);
  const vy = g.vy; jump(g); assert.equal(g.vy, vy, 'mid-air jump ignored');
  const s = createRunner({ rng: rng(1) }); for (let i = 0; i < 20; i++) stepRunner(s, 1 / 60); assert.equal(s.y, 0); assert.equal(s.vy, 0);
});
test('runner fairness: a hop is high enough and long enough to clear the tallest obstacle even at top speed', () => {
  const tall = 14, w = 5, ts = []; const g = createRunner({ rng: rng(1) }); jump(g);
  for (let t = 0; t < 1.2; t += 1 / 240) { stepRunner(g, 1 / 240); if (g.y >= tall) ts.push(t); }
  const above = ts[ts.length - 1] - ts[0];
  assert.ok(above * MAX_SPEED > w + (PLAYER_X1 - 14) + 10, `only ${(above * MAX_SPEED).toFixed(1)} units of clearance at top speed`);
});
test('runner fairness: a sloppy but human player (reaction jitter) survives most runs; obstacles are always spaced for a landing', () => {
  let survived = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const jr = rng(seed + 500); const g = createRunner({ rng: rng(seed) }); let minRatio = Infinity, n = 0;
    for (let t = 0; t < 40 && !g.over; t += 1 / 60) {
      const o = g.obstacles.find((x) => x.x + x.w > 14 && !x.hit);
      if (o && g.y === 0 && o.x - PLAYER_X1 < g.speed * (0.44 + (jr() - 0.5) * 0.12) - (5 + o.w) / 2) jump(g);
      const before = g.obstacles.length; stepRunner(g, 1 / 60);
      const L = g.obstacles.length;
      if (L > before && L > 1) minRatio = Math.min(minRatio, (g.obstacles[L - 1].x - (g.obstacles[L - 2].x + g.obstacles[L - 2].w)) / g.speed);
    }
    assert.ok(minRatio > 0.9, `seed ${seed}: next obstacle only ${minRatio.toFixed(2)}s behind the last`);
    if (!g.over) survived++;
  }
  assert.ok(survived >= 32, `only ${survived}/40 sloppy runs survived 40s`);
});
test('runner fairness: hopping far too early or too late is punished, and a bump never costs two hearts at once', () => {
  for (const dx of [60, -3]) {
    const g = createRunner({ rng: rng(2) }); g.obstacles.push({ x: dx > 0 ? 19 + dx : 15, w: 7, h: 12, kind: 'log', hit: false });
    if (dx > 0) jump(g);
    for (let i = 0; i < 120; i++) stepRunner(g, 1 / 60);
    assert.equal(g.hearts, HEARTS - 1, `dx ${dx}`);
  }
});

test('runner look: the creature stands on the grass line (feet on the ground), and a hop lifts it off and back down', () => {
  const svg = creatureSvg('burrowby', 1, { size: SPRITE_SIZE });
  assert.match(svg, new RegExp(`width="${SPRITE_SIZE}"`)); assert.match(svg, /translate\(50 96\) scale/, 'feet are at 96% of the art box');
  const feet = spriteTop() + SPRITE_SIZE * 0.96;
  assert.ok(Math.abs(feet - GROUND_Y) < 0.01, `feet at ${feet}, ground at ${GROUND_Y}`);
  assert.ok(spriteTop() > 0 && spriteTop() + SPRITE_SIZE <= 60, 'sprite is inside the 60-high field');
  assert.equal(hopLift(0), 0); assert.ok(hopLift(23) > 10 && hopLift(23) < 20, 'a hop is clearly visible but stays on screen');
});
