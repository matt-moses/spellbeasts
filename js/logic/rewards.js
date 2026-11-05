// Crickets, XP, levels (PRD 9.1, 9.2).
export const XP = { firstTry: 10, retry: 5, mastered: 25, session: 15 };
export const CRICKETS = { firstTry: 3, retry: 1, streakBonus: 2, session: 5, firstSessionOfDay: 5 };
export const STREAK_EVERY = 5;

// streakBefore = correct-in-a-row before this answer.
export function turnReward({ correct, firstTry, streakBefore, newlyMastered = false }) {
  if (!correct) return { crickets: 0, xp: 0, streak: 0, streakBonus: false };
  const streak = streakBefore + 1;
  const streakBonus = streak % STREAK_EVERY === 0;
  const crickets = (firstTry ? CRICKETS.firstTry : CRICKETS.retry) + (streakBonus ? CRICKETS.streakBonus : 0);
  const xp = (firstTry ? XP.firstTry : XP.retry) + (newlyMastered ? XP.mastered : 0);
  return { crickets, xp, streak, streakBonus };
}

export function sessionReward({ firstSessionOfDay }) {
  return { crickets: CRICKETS.session + (firstSessionOfDay ? CRICKETS.firstSessionOfDay : 0), xp: XP.session };
}

// Reaching level n costs 50*n more XP than level n-1. Level 1 is the start.
export const xpForLevel = (n) => (n <= 1 ? 0 : 25 * n * (n + 1) - 50);

export function levelForXp(xp) {
  let n = 1;
  while (xpForLevel(n + 1) <= xp) n++;
  return n;
}

export function levelProgress(xp) {
  const level = levelForXp(xp);
  const base = xpForLevel(level), next = xpForLevel(level + 1);
  return { level, into: xp - base, needed: next - base };
}
