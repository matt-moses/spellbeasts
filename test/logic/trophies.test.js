import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTrophies, TROPHIES } from '../../js/logic/trophies.js';

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
    'sessions-25': { sessionsCompleted: 25 }, 'sessions-50': { sessionsCompleted: 50 }, 'perfect-5': { perfectSessions: 5 }, 'streak-20': { bestRun: 20 },
    'first-try-100': { firstTryTotal: 100 }, 'first-try-500': { firstTryTotal: 500 }, 'word-master': { wordsInList: 12, masteredCount: 12 },
    'day-streak-14': { dayStreak: 14 }, 'day-streak-30': { dayStreak: 30 }, 'level-5': { level: 5 }, 'level-10': { level: 10 }, 'level-15': { level: 15 },
    'explorer-3': { regionsOpen: 3 }, 'explorer-6': { regionsOpen: 6 }, 'explorer-9': { regionsOpen: 9 }, ...(TROPHIES.some((t) => t.id === 'explorer-12') ? { 'explorer-12': { regionsOpen: 12 } } : {}), 'walk-50': { trailStep: 50 }, 'walk-150': { trailStep: 150 },
    'stars-5': { starsOpened: 5 }, 'stars-20': { starsOpened: 20 }, 'collector-20': { creaturesCount: 20 }, 'collector-all': { speciesOwned: 27, speciesTotal: 27 },
    'rare-find': { rareOwned: 1 }, 'hearts-5': { heartsTotal: 5 }, 'growing-family': { evolvedCount: 3 },
    'berries-25': { berriesFed: 25 }, 'baths-10': { baths: 10 }, 'pets-100': { pets: 100 }, 'games-10': { games: 10 }, 'sparkle-1': { sparkles: 1 }, 'sparkle-7': { sparkles: 7 },
  };
  assert.equal(Object.keys(cases).length, TROPHIES.length, 'every trophy has a test case');
  for (const [id, patch] of Object.entries(cases)) assert.ok(evaluateTrophies({ ...base, ...patch }).includes(id), id);
});
test('near-misses do not trigger', () => {
  assert.deepEqual(evaluateTrophies({ ...base, bestRun: 9, sessionsCompleted: 4, masteredCount: 9, turn: { correct: true, word: 'garden' } }), []);
  assert.equal(evaluateTrophies({ ...base, sessionJustCompleted: true, sessionMisses: 1 }).includes('perfect-flight'), false);
});
test('already-earned trophies are never returned again', () => {
  assert.deepEqual(evaluateTrophies({ ...base, bestRun: 10 }, { 'streak-10': '2026-11-05' }), []);
});

test('trophy ids and names are unique, and there are plenty to earn', () => {
  assert.equal(new Set(TROPHIES.map((t) => t.id)).size, TROPHIES.length);
  assert.equal(new Set(TROPHIES.map((t) => t.name)).size, TROPHIES.length);
  assert.ok(TROPHIES.length >= 40);
});
test('Word Master needs a list of 10+ words and every word mastered', () => {
  assert.equal(evaluateTrophies({ ...base, wordsInList: 5, masteredCount: 5 }).includes('word-master'), false);
  assert.equal(evaluateTrophies({ ...base, wordsInList: 12, masteredCount: 11 }).includes('word-master'), false);
  assert.equal(evaluateTrophies({ ...base, wordsInList: 12, masteredCount: 12 }).includes('word-master'), true);
});
