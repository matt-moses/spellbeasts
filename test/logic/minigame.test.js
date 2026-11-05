import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatchGame, stepCatchGame, maxScore, SPAWN_EVERY } from '../../js/logic/minigame.js';
import { rng } from '../helpers.js';

const play = (g, chooser, dt = 0.05) => { for (let i = 0; i < 4000 && !g.done; i++) stepCatchGame(g, dt, chooser(g)); return g; };
// the x of the lowest berry that is still falling (what a good player moves under)
const target = (g) => { const f = g.items.filter((it) => it.state === 'falling'); return f.length ? f.reduce((a, b) => (a.y > b.y ? a : b)).x : g.px; };

test('the game is deterministic for a given rng', () => {
  const a = createCatchGame({ rng: rng(3) }), b = createCatchGame({ rng: rng(3) });
  assert.deepEqual(a.items, b.items);
  assert.equal(a.items.length, 15);
  assert.ok(a.items.every((it) => it.x >= 8 && it.x <= 92));
});
test('berries start falling one at a time on a schedule', () => {
  const g = createCatchGame({ rng: rng(1) });
  stepCatchGame(g, 0.01, 50);
  assert.equal(g.items.filter((it) => it.state === 'falling').length, 1);
  stepCatchGame(g, SPAWN_EVERY * 2, 50);
  assert.ok(g.items.filter((it) => it.state !== 'waiting').length >= 3);
});
test('a player who follows the berries catches (almost) everything', () => {
  const g = play(createCatchGame({ rng: rng(7) }), target);
  assert.equal(g.done, true);
  assert.ok(g.caught >= 15, `caught ${g.caught}`);
  assert.equal(g.missed, 0);
});
test('a player who never moves catches only what lands on them; the game still ends', () => {
  const g = play(createCatchGame({ rng: rng(7) }), () => 50);
  assert.equal(g.done, true);
  assert.ok(g.caught < 15);
  assert.equal(g.items.every((it) => it.state === 'caught' || it.state === 'missed'), true);
  assert.ok(g.caught + g.missed >= 15);
});
test('golden berries are worth 2 and the best possible score accounts for them', () => {
  const g = play(createCatchGame({ rng: rng(11), count: 40 }), target);
  assert.equal(g.caught, maxScore(g));
  assert.ok(maxScore(g) > 40);
});
test('the player cannot leave the field, and a finished game stays finished', () => {
  const g = createCatchGame({ rng: rng(2) });
  stepCatchGame(g, 0.1, -500); assert.ok(g.px >= 0);
  stepCatchGame(g, 0.1, 9999); assert.ok(g.px <= 100);
  play(g, target);
  const snapshot = JSON.stringify(g);
  stepCatchGame(g, 1, 10);
  assert.equal(JSON.stringify(g), snapshot);
});
