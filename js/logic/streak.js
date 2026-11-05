// Daily streak with one free rest day per week (PRD 9.4). Weeks start on Monday.
import { addDays, daysBetween } from './leitner.js';

export function weekKey(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();   // 0 = Sunday
  return addDays(dateStr, -((dow + 6) % 7));                 // the Monday of that week
}

// Record that the player practiced on `today`. Returns a new streak object.
export function recordPlay(streak, today) {
  const s = { ...streak };
  if (s.lastPlayDate === today) return s;
  const missed = s.lastPlayDate ? daysBetween(s.lastPlayDate, today) - 1 : null;
  if (missed === null) s.current = 1;
  else if (missed === 0) s.current += 1;
  else if (missed === 1 && s.restUsedWeek !== weekKey(addDays(today, -1))) {
    s.current += 1;                                          // the missed day is forgiven
    s.restUsedWeek = weekKey(addDays(today, -1));
  } else s.current = 1;
  s.best = Math.max(s.best, s.current);
  s.lastPlayDate = today;
  return s;
}

// What to show on the home screen today.
export function displayStreak(streak, today) {
  if (!streak.lastPlayDate) return 0;
  const missed = daysBetween(streak.lastPlayDate, today) - 1;
  if (missed <= 0) return streak.current;
  if (missed === 1 && streak.restUsedWeek !== weekKey(addDays(today, -1))) return streak.current;
  return 0;
}

export const playedToday = (streak, today) => streak.lastPlayDate === today;
