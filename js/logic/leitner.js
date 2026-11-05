// Across-day review (PRD 8.2). Dates are local 'YYYY-MM-DD' strings.
export const INTERVAL_DAYS = { 1: 0, 2: 2, 3: 4, 4: 7, 5: 14 };
export const MASTERY_DAYS = 3;

export function localDateString(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function daysBetween(a, b) {
  const f = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((f(b) - f(a)) / 86400000);
}

export function newWordStat() {
  return { box: 1, nextDue: null, correctDays: [], attempts: 0, firstTries: 0, firstTryCorrect: 0, lastMissed: null, lastBoxDate: null };
}

export const isMastered = (stat) => !!stat && stat.correctDays.length >= MASTERY_DAYS;

// Returns a new stat. `firstTry` = first appearance of the word in this session.
export function applyAttempt(stat, { correct, firstTry, today }) {
  const s = { ...(stat ?? newWordStat()), correctDays: [...(stat?.correctDays ?? [])] };
  s.attempts += 1;
  if (firstTry) { s.firstTries += 1; if (correct) s.firstTryCorrect += 1; }
  if (!correct) s.lastMissed = today;
  if (s.lastBoxDate !== today) {            // first attempt of the day decides the box
    s.lastBoxDate = today;
    if (correct) {
      s.box = Math.min(5, s.box + 1);
      if (!s.correctDays.includes(today)) s.correctDays.push(today);
    } else {
      s.box = 1;
    }
    if (isMastered(s)) s.box = Math.max(s.box, 4);
    s.nextDue = addDays(today, INTERVAL_DAYS[s.box]);
  }
  return s;
}

export function isDue(stat, today) {
  return !!stat && stat.attempts > 0 && (stat.nextDue ?? today) <= today;
}
