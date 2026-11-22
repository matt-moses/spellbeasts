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

import { createPatch, dig, flag as flagTile, safeLeft, prizeFor as patchPrize, LEVELS as PATCH_LEVELS } from '../../js/logic/patch.js';
import { createSpace, stepSpace, fire, SIZES } from '../../js/logic/space.js';

test('Berry Patch: the first tap is always safe and opens up; flags block digging; a win needs every safe tile', () => {
  for (const d of DIFFICULTIES) for (let seed = 1; seed < 40; seed++) {
    const g = createPatch({ rng: seeded(seed), difficulty: d });
    const first = (seed * 7) % g.tiles.length;
    assert.equal(dig(g, first) === 'boom', false);
    assert.equal(g.tiles.filter((t) => t.skunk).length, PATCH_LEVELS[d].skunks);
    assert.equal(g.tiles[first].near, 0, 'the first tap opens a clear area');
  }
  const g = createPatch({ rng: seeded(4), difficulty: 'easy' });
  dig(g, 12);
  const hidden = g.tiles.find((t) => t.state === 'hidden' && !t.skunk);
  if (hidden) { assert.ok(flagTile(g, hidden.index)); assert.equal(dig(g, hidden.index), 'ignored'); flagTile(g, hidden.index); }
  let r;
  for (const t of g.tiles) if (!t.skunk && t.state !== 'open') r = dig(g, t.index);
  assert.equal(safeLeft(g), 0); assert.equal(g.won, true); assert.equal(patchPrize(g), 3); assert.ok(r === 'win' || g.won);
});
test('Berry Patch: three skunks end the game, show every skunk, and pay nothing back', () => {
  const g = createPatch({ rng: seeded(2), difficulty: 'normal' });
  dig(g, 0);
  for (const t of g.tiles.filter((x) => x.skunk)) if (!g.over) dig(g, t.index);
  assert.equal(g.over, true); assert.equal(g.won, false); assert.equal(g.hearts, 0); assert.equal(patchPrize(g), 0);
  assert.ok(g.tiles.filter((t) => t.skunk).every((t) => t.state === 'boom'));
});
test('Star Drift: zapping splits big rocks, waves refill, bumps cost hearts, and idling in the open loses', () => {
  const g = createSpace({ rng: seeded(6), difficulty: 'normal' });
  g.rocks = [{ x: 50, y: 30, vx: 0, vy: 0, size: 3, r: SIZES[3] }]; g.ship.a = 0;
  assert.equal(fire(g), true); assert.equal(fire(g), false, 'cooling down');
  for (let i = 0; i < 40; i++) stepSpace(g, 1 / 60);
  assert.equal(g.score, 1); assert.equal(g.rocks.length, 2); assert.ok(g.rocks.every((r) => r.size === 2));
  const w = createSpace({ rng: seeded(6), difficulty: 'easy' }); w.rocks = []; stepSpace(w, 1 / 60);
  assert.equal(w.wave, 2); assert.equal(w.rocks.length, 4);
  const b = createSpace({ rng: seeded(6), difficulty: 'hard' }); b.safe = 0; b.rocks = [{ x: 50, y: 50, vx: 0, vy: 0, size: 3, r: 7 }];
  stepSpace(b, 1 / 60); assert.equal(b.hearts, 2); stepSpace(b, 1 / 60); assert.equal(b.hearts, 2, 'safe for a moment');
  const idle = createSpace({ rng: seeded(6), difficulty: 'hard' }); idle.rocks.forEach((r) => { r.vx = r.vy = 0; });
  for (let i = 0; i < 60 * 30; i++) stepSpace(idle, 1 / 60);
  assert.equal(idle.over, false, 'stationary rocks far away never hurt');
});

import { createHangman, guess, advance, shown, prizeFor as hangPrize } from '../../js/logic/hangman.js';
import { createSnake, stepSnake, turn, move } from '../../js/logic/snake.js';

const WORDS = ['garden', 'rainbow', 'whisper', 'island', 'library', 'Monday', 'cat', 'twilight', 'ice-cream'].map((word) => ({ word, definition: `about ${word}` }));
test('Hangman: picks three fitting words, hits reveal letters, misses cost hearts, and solving scores', () => {
  const g = createHangman({ words: WORDS, rng: seeded(3), difficulty: 'normal' });
  assert.equal(g.picks.length, 3); assert.ok(g.picks.every((w) => w.word.length >= 5 && w.word.length <= 8));
  assert.equal(guess(g, '1'), 'ignored');
  let solved = 0;
  for (let r = 0; r < 3; r++) {
    const word = g.entry.word.toLowerCase();
    const wrong = 'abcdefghijklmnopqrstuvwxyz'.split('').find((c) => !word.includes(c));
    assert.equal(guess(g, wrong), 'miss'); assert.equal(guess(g, wrong), 'ignored'); assert.equal(g.lives, 5);
    let last; for (const c of new Set(word.replace(/[^a-z]/g, ''))) last = guess(g, c);
    assert.equal(last, 'solved'); assert.ok(shown(g).every(Boolean)); solved += 1;
    advance(g);
  }
  assert.equal(g.over, true); assert.equal(g.solved, 3); assert.equal(hangPrize(g), 3);
});
test('Hangman: running out of hearts fails the word, a hyphen is always shown, case does not matter', () => {
  const g = createHangman({ words: [{ word: 'Ice-Cream', definition: '' }, { word: 'Monday', definition: '' }, { word: 'garden', definition: '' }], rng: seeded(1), difficulty: 'hard' });
  assert.equal(g.picks.length, 3);
  const h = createHangman({ words: [{ word: 'Ice-Cream', definition: '' }], rng: seeded(1), difficulty: 'easy' });
  assert.equal(shown(h)[3], '-'); assert.equal(guess(h, 'I'), 'hit'); assert.equal(shown(h)[0], 'I');
  let r; for (const c of 'bdfghjklnopqstuvwxyz') { r = guess(h, c); if (r === 'failed') break; }
  assert.equal(r, 'failed'); assert.equal(h.lives, 0); assert.equal(advance(h), false);
  assert.equal(createHangman({ words: [], rng: seeded(1) }).over, true);
});
test('Caterpillar: eats, grows, cannot reverse, wraps on Easy, hits walls and itself otherwise', () => {
  const g = createSnake({ rng: seeded(8), difficulty: 'normal' });
  g.food = { x: 6, y: 6 };
  move(g); assert.equal(g.score, 1); assert.equal(g.body.length, 4);
  assert.equal(turn(g, 'left'), false, 'no reversing'); assert.equal(turn(g, 'up'), true);
  move(g); assert.deepEqual(g.body[0], { x: 6, y: 5 });
  g.body = [{ x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }, { x: 5, y: 5 }, { x: 5, y: 4 }]; g.dir = 'up'; g.queued = null; g.food = { x: 0, y: 0 };
  turn(g, 'left'); move(g); assert.equal(g.over, true, 'ran into its own tail');
  const w = createSnake({ rng: seeded(8), difficulty: 'normal' }); w.body = [{ x: 11, y: 3 }, { x: 10, y: 3 }]; w.food = { x: 0, y: 0 };
  move(w); assert.equal(w.over, true);
  const e = createSnake({ rng: seeded(8), difficulty: 'easy' }); e.body = [{ x: 11, y: 3 }, { x: 10, y: 3 }]; e.food = { x: 5, y: 5 };
  move(e); assert.equal(e.over, false); assert.deepEqual(e.body[0], { x: 0, y: 3 });
  const t = createSnake({ rng: seeded(8), difficulty: 'hard' }); stepSnake(t, 0.5); assert.equal(t.body[0].x, 8);
});

import { favoritesOf, isFavorite, toggleFavorite } from '../../js/logic/gamescores.js';
test('favorites toggle per trainer, keep the order they were added in, and ignore unknown games', () => {
  const p = {};
  assert.deepEqual(favoritesOf(p), []);
  assert.equal(toggleFavorite(p, 'snake'), true); assert.equal(toggleFavorite(p, 'catch'), true);
  assert.deepEqual(favoritesOf(p), ['snake', 'catch']); assert.equal(isFavorite(p, 'snake'), true);
  assert.equal(toggleFavorite(p, 'snake'), false); assert.deepEqual(favoritesOf(p), ['catch']);
  assert.equal(toggleFavorite(p, 'nonsense'), false); assert.deepEqual(favoritesOf(p), ['catch']);
  assert.deepEqual(favoritesOf({ gameFavorites: ['run', 'gone', 7] }), ['run'], 'a damaged list is cleaned up');
});
