// In-session requeue (PRD 8.1) and session building (PRD 8.3).
import { isDue, daysBetween } from './leitner.js';

export const MAX_APPEARANCES = 4;
export const MISS_GAP = 3;
export const CONFIRM_GAP = 7;
export const MAX_NEW_PER_SESSION = 3;

export function createSessionQueue(words) {
  return { queue: [...words], appearances: {}, phase: {}, current: null, turn: 0 };
}

export function nextWord(s) {
  if (!s.queue.length) { s.current = null; return null; }
  const w = s.queue.shift();
  s.appearances[w] = (s.appearances[w] || 0) + 1;
  s.current = w;
  s.turn += 1;
  return w;
}

function insertGap(s, word, gap) {
  s.queue.splice(Math.min(gap - 1, s.queue.length), 0, word); // short queue -> end
}

// Call after the player answers `word`. Mutates s.
export function recordResult(s, word, correct) {
  const n = s.appearances[word];
  const phase = s.phase[word];
  const result = { firstTry: n === 1, retry: n > 1, comeback: correct && phase === 'retry', requeued: false, gaveUp: false };
  if (!correct) {
    s.phase[word] = 'retry';
    if (n < MAX_APPEARANCES) { insertGap(s, word, MISS_GAP); result.requeued = true; } else result.gaveUp = true;
  } else if (phase === 'retry') {
    s.phase[word] = 'confirm';
    if (n < MAX_APPEARANCES) { insertGap(s, word, CONFIRM_GAP); result.requeued = true; }
  } else if (phase === 'confirm') {
    s.phase[word] = 'done';
  }
  return result;
}

export const sessionDone = (s) => s.queue.length === 0;

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// words: [{word}], stats: {[word]: stat}. Returns {kind:'normal'|'empty', words:[wordString]}.
export function buildSession({ words, stats, today, rng = Math.random }) {
  const size = 10 + Math.floor(rng() * 3);
  const all = words.map((w) => w.word);
  const st = (w) => stats[w];
  const due = all.filter((w) => isDue(st(w), today))
    .sort((a, b) => (st(a).nextDue < st(b).nextDue ? -1 : st(a).nextDue > st(b).nextDue ? 1 : 0) || st(a).box - st(b).box);
  const fresh = all.filter((w) => !st(w) || st(w).attempts === 0);
  if (!due.length && !fresh.length) return { kind: 'empty', words: [] };
  const picked = due.slice(0, size);
  for (const w of shuffle(fresh, rng).slice(0, MAX_NEW_PER_SESSION)) if (picked.length < size) picked.push(w);
  if (picked.length < size) {
    const rest = all.filter((w) => !picked.includes(w) && st(w))
      .sort((a, b) => st(a).box - st(b).box || (st(a).nextDue < st(b).nextDue ? -1 : 1));
    for (const w of rest) if (picked.length < size) picked.push(w);
  }
  return { kind: 'normal', words: shuffle(picked, rng) };
}

// Weakest words: lowest box, then lowest first-try accuracy.
export function buildBonusSession({ words, stats, rng = Math.random }) {
  const size = 10 + Math.floor(rng() * 3);
  const acc = (s) => (s.firstTries ? s.firstTryCorrect / s.firstTries : 1);
  const seen = words.map((w) => w.word).filter((w) => stats[w]?.attempts > 0)
    .sort((a, b) => stats[a].box - stats[b].box || acc(stats[a]) - acc(stats[b]));
  return { kind: seen.length ? 'bonus' : 'empty', words: shuffle(seen.slice(0, size), rng) };
}

export const overdueDays = (stat, today) => (stat?.nextDue ? Math.max(0, daysBetween(stat.nextDue, today)) : 0);
