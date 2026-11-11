// Trophy conditions (PRD 9.3, extended). Pure: evaluate against a context snapshot.
import { landCount } from '../config.js';

const ALL_TROPHIES = [
  // first steps
  { id: 'first-hatch', name: 'First Hatch', desc: 'Hatch your first egg', test: (c) => c.eggsHatched >= 1 },
  { id: 'capital-idea', name: 'Capital Idea', desc: 'Spell a capitalized word correctly', test: (c) => !!c.turn?.correct && /^\p{Lu}/u.test(c.turn.word ?? '') },
  { id: 'comeback', name: 'Comeback', desc: 'Spell a missed word correctly in the same session', test: (c) => !!c.turn?.comeback },
  { id: 'perfect-flight', name: 'Perfect Flight', desc: 'Finish a session with no misses', test: (c) => !!c.sessionJustCompleted && c.sessionMisses === 0 },
  // practice
  { id: 'busy-bee', name: 'Busy Bee', desc: 'Complete 5 sessions', test: (c) => c.sessionsCompleted >= 5 },
  { id: 'sessions-25', name: 'Practice Pro', desc: 'Complete 25 sessions', test: (c) => c.sessionsCompleted >= 25 },
  { id: 'sessions-50', name: 'Super Bee', desc: 'Complete 50 sessions', test: (c) => c.sessionsCompleted >= 50 },
  { id: 'perfect-5', name: 'Flawless Five', desc: 'Finish 5 sessions with no misses', test: (c) => c.perfectSessions >= 5 },
  { id: 'streak-10', name: 'Streak of 10', desc: '10 correct in a row', test: (c) => c.bestRun >= 10 },
  { id: 'streak-20', name: 'Unstoppable', desc: '20 correct in a row', test: (c) => c.bestRun >= 20 },
  { id: 'first-try-100', name: 'Sharp Speller', desc: 'Spell 100 words right on the first try', test: (c) => c.firstTryTotal >= 100 },
  { id: 'first-try-500', name: 'Word Wizard', desc: 'Spell 500 words right on the first try', test: (c) => c.firstTryTotal >= 500 },
  // mastery
  { id: 'mastered-10', name: '10 Mastered', desc: 'Master 10 words', test: (c) => c.masteredCount >= 10 },
  { id: 'mastered-25', name: '25 Mastered', desc: 'Master 25 words', test: (c) => c.masteredCount >= 25 },
  { id: 'mastered-50', name: '50 Mastered', desc: 'Master 50 words', test: (c) => c.masteredCount >= 50 },
  { id: 'word-master', name: 'Word Master', desc: 'Master every word in your list (10 or more words)', test: (c) => c.wordsInList >= 10 && c.masteredCount >= c.wordsInList },
  // days
  { id: 'day-streak-3', name: '3-Day Streak', desc: 'Play 3 days in a row', test: (c) => c.dayStreak >= 3 },
  { id: 'day-streak-7', name: '7-Day Streak', desc: 'Play 7 days in a row', test: (c) => c.dayStreak >= 7 },
  { id: 'day-streak-14', name: 'Fortnight Fan', desc: 'Play 14 days in a row', test: (c) => c.dayStreak >= 14 },
  { id: 'day-streak-30', name: 'Month of Magic', desc: 'Play 30 days in a row', test: (c) => c.dayStreak >= 30 },
  // levels
  { id: 'level-5', name: 'Rising Star', desc: 'Reach trainer level 5', test: (c) => c.level >= 5 },
  { id: 'level-10', name: 'Trainer Pro', desc: 'Reach trainer level 10', test: (c) => c.level >= 10 },
  { id: 'level-15', name: 'Legend', desc: 'Reach trainer level 15', test: (c) => c.level >= 15 },
  // the world
  { id: 'explorer-3', name: 'Trailblazer', desc: 'Open 3 lands', test: (c) => c.regionsOpen >= 3 },
  { id: 'explorer-6', name: 'Adventurer', desc: 'Open 6 lands', test: (c) => c.regionsOpen >= 6 },
  { id: 'explorer-9', name: 'World Traveler', desc: landCount() > 9 ? 'Open 9 lands' : 'Open all 9 lands', test: (c) => c.regionsOpen >= 9 },
  { id: 'explorer-12', name: 'Master Explorer', desc: 'Open all 12 lands', test: (c) => c.regionsOpen >= 12 },
  { id: 'walk-50', name: 'Long Walk', desc: 'Walk 50 steps along the trail', test: (c) => c.trailStep >= 50 },
  { id: 'walk-150', name: 'Marathon Walker', desc: 'Walk 150 steps along the trail', test: (c) => c.trailStep >= 150 },
  { id: 'stars-5', name: 'Treasure Hunter', desc: 'Open 5 treasure stars', test: (c) => c.starsOpened >= 5 },
  { id: 'stars-20', name: 'Star Collector', desc: 'Open 20 treasure stars', test: (c) => c.starsOpened >= 20 },
  // creatures
  { id: 'collector', name: 'Collector', desc: 'Own 10 creatures', test: (c) => c.creaturesCount >= 10 },
  { id: 'collector-20', name: 'Big Collector', desc: 'Own 20 creatures', test: (c) => c.creaturesCount >= 20 },
  { id: 'collector-all', name: 'Complete Collection', desc: 'Own every creature in the book', test: (c) => c.speciesTotal > 0 && c.speciesOwned >= c.speciesTotal },
  { id: 'rare-find', name: 'Rare Find', desc: 'Own a rare creature', test: (c) => c.rareOwned >= 1 },
  { id: 'hearts-5', name: 'Best Friends', desc: 'Earn 5 friendship hearts from duplicates', test: (c) => c.heartsTotal >= 5 },
  { id: 'fully-evolved', name: 'Fully Evolved', desc: 'Evolve a creature to stage 3', test: (c) => c.maxStage >= 3 },
  { id: 'growing-family', name: 'Growing Family', desc: 'Evolve 3 different creatures', test: (c) => c.evolvedCount >= 3 },
  // looking after your creatures
  { id: 'berries-25', name: 'Berry Lover', desc: 'Feed your creatures 25 berries', test: (c) => c.berriesFed >= 25 },
  { id: 'baths-10', name: 'Squeaky Clean', desc: 'Give 10 baths', test: (c) => c.baths >= 10 },
  { id: 'pets-100', name: 'Cuddle Buddy', desc: 'Pet your creatures 100 times', test: (c) => c.pets >= 100 },
  { id: 'games-10', name: 'Game On', desc: 'Play 10 games with your creatures', test: (c) => c.games >= 10 },
  { id: 'sparkle-1', name: 'Sparkling Friend', desc: 'Make a creature happy on all four meters', test: (c) => c.sparkles >= 1 },
  { id: 'sparkle-7', name: 'Pampered Pals', desc: 'Make creatures sparkle 7 times', test: (c) => c.sparkles >= 7 },
  { id: 'champion', name: 'Champion', desc: 'Win 10 battles', phase: 2, test: (c) => c.battlesWon >= 10 },
];
// A trophy for opening every land only exists once those lands do.
export const TROPHIES = ALL_TROPHIES.filter((t) => t.id !== 'explorer-12' || landCount() >= 12);

// earned: {[id]: date}. Returns ids newly earned (never ones already earned).
export function evaluateTrophies(ctx, earned = {}) {
  return TROPHIES.filter((t) => !earned[t.id] && t.test(ctx)).map((t) => t.id);
}
