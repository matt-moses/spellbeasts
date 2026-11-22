import test from 'node:test';
import assert from 'node:assert/strict';
import { credit, debit, total, LEDGER_DAYS } from '../../js/logic/ledger.js';
import { freshProfile, freshState } from '../../js/logic/storage-schema.js';
import { addStarter, buyEgg, feed } from '../../js/logic/collection.js';
import { finishGame, claimSparkle } from '../../js/logic/care.js';
import { openChest } from '../../js/logic/chest.js';
import { debugReport } from '../../js/logic/parent.js';

test('the ledger totals income and spending by source, per day, and keeps 60 days', () => {
  const p = {};
  credit(p, 'practice', 12, '2026-11-01'); credit(p, 'practice', 8, '2026-11-01'); debit(p, 'egg', 20, '2026-11-02');
  assert.deepEqual(p.ledger.earned, { practice: 20 }); assert.deepEqual(p.ledger.spent, { egg: 20 });
  assert.deepEqual(p.ledger.days['2026-11-01'], { earned: { practice: 20 }, spent: {} });
  assert.equal(credit(p, 'x', 0), 0); assert.equal(credit(p, 'x', -5), 0); assert.equal(total(p.ledger.earned), 20);
  for (let i = 0; i < LEDGER_DAYS + 10; i++) credit(p, 'practice', 1, new Date(Date.UTC(2027, 0, 1 + i)).toISOString().slice(0, 10));
  assert.equal(Object.keys(p.ledger.days).length, LEDGER_DAYS);
});
test('games, eggs, feeding and the sparkle all land in the ledger', () => {
  const p = freshProfile({ name: 'T', avatarSpecies: 'burrowby' }); const c = addStarter(p, 'burrowby');
  p.crickets = 200; p.streak = { current: 1, best: 1, lastPlayDate: '2026-11-05', restUsedWeek: null };
  finishGame(p, c, '2026-11-05', 0, 3);
  assert.deepEqual([p.ledger.spent.game, p.ledger.earned['game-refund']], [3, 1]);
  buyEgg(p, 'r1'); assert.equal(p.ledger.spent.egg, 20);
  feed(p, c.id, 5); assert.equal(p.ledger.spent.feed, 5);
  assert.equal(p.crickets, 200 - 3 + 1 - 20 - 5, 'the ledger matches what actually moved');
});
test('chest crickets are recorded, and the debug report carries the rules and an economy summary', () => {
  const st = freshState(); const p = freshProfile({ name: 'T', avatarSpecies: 'burrowby' }); addStarter(p, 'burrowby'); st.profiles.p1 = p;
  p.wordStats.sample = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`w${i}`, { correctDays: ['a', 'b', 'c'] }]));
  for (let i = 0; i < 10; i++) openChest(p, { rng: () => 0.01, today: '2026-11-05' });
  assert.ok(p.ledger.earned.chest > 0);
  credit(p, 'practice', 40, '2026-11-05'); credit(p, 'practice', 60, '2026-11-06');
  p.sessions.push({ date: '2026-11-05', mode: 'practice', words: 10, correctFirstTry: 8, misses: 2, crickets: 40 });
  const r = JSON.parse(debugReport(st));
  assert.equal(r.economyRules.games.cost, 3); assert.equal(r.economyRules.eggs.prices.length > 20, true);
  const e = r.summary[0].economy;
  assert.deepEqual([e.avgEarnedPerPracticeDay, e.practiceDaysTracked, e.avgCricketsPerSession, e.newestLandEggPrice], [50, 2, 40, 20]);
  assert.equal(e.practiceDaysToAffordNewestEgg, 1);
});
