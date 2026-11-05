import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTrophies } from '../../js/logic/trophies.js';

const base = { eggsHatched: 0, sessionsCompleted: 0, bestRun: 0, masteredCount: 0, dayStreak: 0, creaturesCount: 0, maxStage: 1, battlesWon: 0 };

test('nothing earned at the start', () => assert.deepEqual(evaluateTrophies(base), []));
test('each trophy triggers on its condition', () => {
  const cases = {
    'first-hatch': { eggsHatched: 1 }, 'busy-bee': { sessionsCompleted: 5 },
    'perfect-flight': { sessionJustCompleted: true, sessionMisses: 0 }, 'streak-10': { bestRun: 10 },
    comeback: { turn: { comeback: true } }, 'capital-idea': { turn: { correct: true, word: 'Monday' } },
    'mastered-10': { masteredCount: 10 }, 'mastered-25': { masteredCount: 25 }, 'mastered-50': { masteredCount: 50 },
    'day-streak-3': { dayStreak: 3 }, 'day-streak-7': { dayStreak: 7 }, collector: { creaturesCount: 10 },
    'fully-evolved': { maxStage: 3 }, champion: { battlesWon: 10 },
  };
  for (const [id, patch] of Object.entries(cases)) assert.ok(evaluateTrophies({ ...base, ...patch }).includes(id), id);
});
test('near-misses do not trigger', () => {
  assert.deepEqual(evaluateTrophies({ ...base, bestRun: 9, sessionsCompleted: 4, masteredCount: 9, turn: { correct: true, word: 'garden' } }), []);
  assert.equal(evaluateTrophies({ ...base, sessionJustCompleted: true, sessionMisses: 1 }).includes('perfect-flight'), false);
});
test('already-earned trophies are never returned again', () => {
  assert.deepEqual(evaluateTrophies({ ...base, bestRun: 10 }, { 'streak-10': '2026-11-05' }), []);
});
