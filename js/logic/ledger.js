// A running record of every cricket earned and spent, by source, so the game's economy can be checked from a saved game.
// profile.ledger = { earned: {source: n}, spent: {sink: n}, days: { 'YYYY-MM-DD': { earned: {...}, spent: {...} } } }
import { localDateString } from './leitner.js';

export const LEDGER_DAYS = 60;
export const SOURCES = ['practice', 'battle-words', 'battle-prize', 'landmark', 'sparkle', 'duplicate-egg', 'chest', 'game-refund'];
export const SINKS = ['egg', 'game', 'feed'];

const bump = (obj, key, n) => { obj[key] = (obj[key] ?? 0) + n; };
function record(profile, side, key, n, date) {
  const amount = Math.round(Number(n));
  if (!(amount > 0)) return 0;
  const l = (profile.ledger ??= { earned: {}, spent: {}, days: {} });
  l.earned ??= {}; l.spent ??= {}; l.days ??= {};
  bump(l[side], key, amount);
  const d = (l.days[date] ??= { earned: {}, spent: {} });
  bump(d[side], key, amount);
  const keys = Object.keys(l.days).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - LEDGER_DAYS))) delete l.days[k];
  return amount;
}
export const credit = (profile, source, n, date = localDateString()) => record(profile, 'earned', source, n, date);
export const debit = (profile, sink, n, date = localDateString()) => record(profile, 'spent', sink, n, date);
export const total = (obj) => Object.values(obj ?? {}).reduce((a, b) => a + b, 0);
