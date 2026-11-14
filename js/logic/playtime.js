// Time tracking: how long a trainer is in the game, and, separately, how long they spend practicing words.
// Pure. The shell calls `tick` about once a second; nothing here touches the clock or storage.

export const TICK_CAP_MS = 5000;          // a longer gap (sleeping tab, throttled timer) is not counted
export const IDLE_MS = 120000;            // no touch, key or click for this long: the player has walked away
export const DAY_HISTORY_CAP = 60;

// Routes where the player is working on words (spelling, battles that ask for spellings, the learn screen).
const PRACTICE_ROUTES = new Set(['practice', 'battle', 'learn']);
export const isPracticeRoute = (route) => PRACTICE_ROUTES.has(route);

export const freshTime = () => ({ playMs: 0, practiceMs: 0, days: {} });

const num = (x) => (Number.isFinite(x) && x > 0 ? x : 0);

// Repair whatever a save holds (older saves have none; a hand-edited one may hold junk).
export function normalizeTime(t) {
  const days = {};
  if (t && typeof t.days === 'object' && t.days && !Array.isArray(t.days)) {
    for (const [d, v] of Object.entries(t.days)) if (/^\d{4}-\d{2}-\d{2}$/.test(d)) days[d] = { playMs: num(v?.playMs), practiceMs: num(v?.practiceMs) };
  }
  return { playMs: num(t?.playMs), practiceMs: num(t?.practiceMs), days };
}

// Add `elapsedMs` to a profile. Returns the milliseconds actually counted.
export function addTime(profile, elapsedMs, { practicing, date }) {
  const ms = Math.min(num(elapsedMs), TICK_CAP_MS);
  if (!ms) return 0;
  const t = (profile.time = normalizeTime(profile.time));
  const day = (t.days[date] ??= { playMs: 0, practiceMs: 0 });
  t.playMs += ms; day.playMs += ms;
  if (practicing) { t.practiceMs += ms; day.practiceMs += ms; }
  const keys = Object.keys(t.days).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - DAY_HISTORY_CAP))) delete t.days[k];
  return ms;
}

// "1 h 05 min", "12 min", "45 s": for the Parent area.
export function formatDuration(ms) {
  const s = Math.floor(num(ms) / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}

// Totals for the last `n` days ending at `today` (a YYYY-MM-DD string), counting back by calendar day.
export function recentTotals(time, today, n = 7) {
  const t = normalizeTime(time);
  const [y, mo, d] = today.split('-').map(Number);
  let playMs = 0, practiceMs = 0;
  for (let i = 0; i < n; i++) {
    const dt = new Date(Date.UTC(y, mo - 1, d - i));
    const v = t.days[dt.toISOString().slice(0, 10)];
    if (v) { playMs += v.playMs; practiceMs += v.practiceMs; }
  }
  return { playMs, practiceMs };
}
