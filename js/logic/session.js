// One practice session (PRD 7, 8, 9). Mutates the profile as it goes so the caller can save after every turn.
import { checkAnswer } from './answer.js';
import { createSessionQueue, nextWord, recordResult, buildSession, buildBonusSession } from './scheduler.js';
import { applyAttempt, isMastered } from './leitner.js';
import { turnReward, sessionReward, levelForXp } from './rewards.js';
import { capSessions } from './storage-schema.js';

export function startSession({ profile, list, today, rng = Math.random, bonus = false }) {
  const stats = (profile.wordStats[profile.activeListId] ??= {});
  const build = bonus ? buildBonusSession : buildSession;
  const built = build({ words: list.words, stats, today, rng });
  if (!built.words.length) return null;

  const byWord = Object.fromEntries(list.words.map((w) => [w.word, w]));
  const q = createSessionQueue(built.words);
  const firstSessionOfDay = !profile.sessions.some((s) => s.date === today);
  const tally = { crickets: 0, xp: 0, streak: 0, bestRun: 0, correctFirstTry: 0, correctRetry: 0, misses: 0, missedWords: [], masteredNow: [], comebacks: 0, leveledUp: false };
  let mode = 'idle', current = null, resolved = 0, finished = null;
  const startLevel = profile.level;

  const gain = (crickets, xp) => {
    profile.crickets += crickets; profile.xp += xp;
    tally.crickets += crickets; tally.xp += xp;
    const lvl = levelForXp(profile.xp);
    if (lvl > profile.level) tally.leveledUp = true;
    profile.level = lvl;
  };

  const api = {
    get mode() { return mode; },
    get current() { return current; },
    get tally() { return tally; },
    get total() { return built.words.length; },
    get startLevel() { return startLevel; },
    get progress() { return { resolved, total: resolved + q.queue.length + (mode === 'asking' || mode === 'correcting' ? 1 : 0) }; },

    next() {
      const w = nextWord(q);
      if (!w) { mode = 'done'; current = null; return null; }
      current = byWord[w]; mode = 'asking';
      return current;
    },

    submit(typed) {
      if (mode !== 'asking') throw new Error('not asking');
      const word = current.word;
      const res = checkAnswer(typed, word);
      const rr = recordResult(q, word, res.correct);
      const before = stats[word];
      const wasMastered = isMastered(before);
      stats[word] = applyAttempt(before, { correct: res.correct, firstTry: rr.firstTry, today });
      const newlyMastered = !wasMastered && isMastered(stats[word]);
      const reward = turnReward({ correct: res.correct, firstTry: rr.firstTry, streakBefore: tally.streak, newlyMastered });
      gain(reward.crickets, reward.xp);
      tally.streak = reward.streak;
      tally.bestRun = Math.max(tally.bestRun, reward.streak);
      resolved += 1;
      if (res.correct) {
        if (rr.firstTry) tally.correctFirstTry += 1; else tally.correctRetry += 1;
        if (rr.comeback) tally.comebacks += 1;
        if (newlyMastered) tally.masteredNow.push(word);
        mode = 'asking';
      } else {
        tally.misses += 1;
        if (!tally.missedWords.includes(word)) tally.missedWords.push(word);
        mode = 'correcting';
      }
      return { ...res, expected: word, word, reward, firstTry: rr.firstTry, comeback: rr.comeback, newlyMastered, requeued: rr.requeued };
    },

    // The unscored "type it correctly once" copy after a miss.
    submitCorrection(typed) {
      if (mode !== 'correcting') throw new Error('not correcting');
      if (!checkAnswer(typed, current.word).correct) return false;
      mode = 'asking';
      return true;
    },

    finish() {
      if (finished) return finished;
      const sr = sessionReward({ firstSessionOfDay });
      gain(sr.crickets, sr.xp);
      profile.sessions.push({ date: today, mode: bonus ? 'bonus' : 'practice', words: built.words.length, correctFirstTry: tally.correctFirstTry, misses: tally.misses });
      capSessions(profile);
      finished = { ...tally, sessionCrickets: sr.crickets, sessionXp: sr.xp, firstSessionOfDay, words: built.words.length, bonus, level: profile.level };
      return finished;
    },
  };
  return api;
}
