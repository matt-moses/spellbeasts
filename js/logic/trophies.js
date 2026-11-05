// Trophy conditions (PRD 9.3). Pure: evaluate against a context snapshot.
export const TROPHIES = [
  { id: 'first-hatch', name: 'First Hatch', desc: 'Hatch your first egg', test: (c) => c.eggsHatched >= 1 },
  { id: 'busy-bee', name: 'Busy Bee', desc: 'Complete 5 sessions', test: (c) => c.sessionsCompleted >= 5 },
  { id: 'perfect-flight', name: 'Perfect Flight', desc: 'Finish a session with no misses', test: (c) => !!c.sessionJustCompleted && c.sessionMisses === 0 },
  { id: 'streak-10', name: 'Streak of 10', desc: '10 correct in a row', test: (c) => c.bestRun >= 10 },
  { id: 'comeback', name: 'Comeback', desc: 'Spell a missed word correctly in the same session', test: (c) => !!c.turn?.comeback },
  { id: 'capital-idea', name: 'Capital Idea', desc: 'Spell a capitalized word correctly', test: (c) => !!c.turn?.correct && /^\p{Lu}/u.test(c.turn.word ?? '') },
  { id: 'mastered-10', name: '10 Mastered', desc: 'Master 10 words', test: (c) => c.masteredCount >= 10 },
  { id: 'mastered-25', name: '25 Mastered', desc: 'Master 25 words', test: (c) => c.masteredCount >= 25 },
  { id: 'mastered-50', name: '50 Mastered', desc: 'Master 50 words', test: (c) => c.masteredCount >= 50 },
  { id: 'day-streak-3', name: '3-Day Streak', desc: 'Play 3 days in a row', test: (c) => c.dayStreak >= 3 },
  { id: 'day-streak-7', name: '7-Day Streak', desc: 'Play 7 days in a row', test: (c) => c.dayStreak >= 7 },
  { id: 'collector', name: 'Collector', desc: 'Own 10 creatures', test: (c) => c.creaturesCount >= 10 },
  { id: 'fully-evolved', name: 'Fully Evolved', desc: 'Evolve a creature to stage 3', test: (c) => c.maxStage >= 3 },
  { id: 'champion', name: 'Champion', desc: 'Win 10 battles', phase: 2, test: (c) => c.battlesWon >= 10 },
];

// earned: {[id]: date}. Returns ids newly earned (never ones already earned).
export function evaluateTrophies(ctx, earned = {}) {
  return TROPHIES.filter((t) => !earned[t.id] && t.test(ctx)).map((t) => t.id);
}
