// Parent-area operations (PRD 10.2). Pure functions over the app state; the UI calls these.
import { parseWordList, mergeWords, pruneStats } from './import.js';
import { freshProfile, migrate } from './storage-schema.js';
import { addStarter, masteredCount } from './collection.js';
import { isMastered } from './leitner.js';
import { chestsPending, CHEST_EVERY, REWARD_WEIGHTS, TREAT_GAIN } from './chest.js';
import { total } from './ledger.js';
import { CRICKETS } from './rewards.js';
import { GAME_COST, GAME_REFUND, SPARKLE_CRICKETS, GREAT_TIER } from './care.js';
import { EGG_PRICES, eggNeeded } from './hatch.js';
import { battleBonus } from './battle.js';
import { regionIndex } from './species.js';
import { SCHEMA_VERSION } from './version.js';
import { SAMPLE_LIST_ID, SAMPLE_LIST_NAME, SAMPLE_WORDS } from '../../data/sample-words.js';

// ---- adult gate: pick the year you were born. Nothing is stored; the year is only compared, in memory.
export const ADULT_AGE = 18;
// A birth year alone can't say whether the birthday has passed, so require ADULT_AGE + 1 whole years of difference:
// that guarantees the person really is at least ADULT_AGE.
export function isAdultBirthYear(year, currentYear) {
  const y = Number(year);
  return Number.isInteger(y) && y <= currentYear && y >= currentYear - 120 && currentYear - y >= ADULT_AGE + 1;
}
export const birthYearChoices = (currentYear, span = 100) => Array.from({ length: span + 1 }, (_, i) => currentYear - i);

// ---- per-word stats
export function statsRows(profile, list) {
  const stats = profile.wordStats[profile.activeListId] ?? {};
  return list.words.map((w) => {
    const s = stats[w.word];
    const firstTries = s?.firstTries ?? 0, ok = s?.firstTryCorrect ?? 0;
    return {
      word: w.word, partOfSpeech: w.partOfSpeech, attempts: s?.attempts ?? 0,
      accuracy: firstTries ? Math.round((100 * ok) / firstTries) : null, missed: firstTries - ok,
      box: s ? s.box : null, nextDue: s?.nextDue ?? null, mastered: isMastered(s), lastMissed: s?.lastMissed ?? null,
    };
  });
}

export function sortRows(rows, key, dir = 'asc') {
  const sign = dir === 'desc' ? -1 : 1;
  return rows.map((r, i) => [r, i]).sort(([a, i], [b, j]) => {
    const x = a[key], y = b[key];
    if (x == null && y == null) return i - j;
    if (x == null) return 1;                 // empty values always last
    if (y == null) return -1;
    const c = typeof x === 'string' ? x.localeCompare(y) : Number(x) - Number(y);
    return c ? c * sign : i - j;
  }).map(([r]) => r);
}

export const mostMissed = (rows, n = 10) => rows.filter((r) => r.missed > 0).sort((a, b) => b.missed - a.missed || (a.accuracy ?? 0) - (b.accuracy ?? 0) || a.word.localeCompare(b.word)).slice(0, n);

// ---- word lists
const dropStats = (state, listId, keep) => {
  for (const p of Object.values(state.profiles)) if (p.wordStats[listId]) p.wordStats[listId] = pruneStats(p.wordStats[listId], keep);
};
const newListId = () => `l${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

export function previewImport(state, listId, text, mode) {
  const list = state.wordLists[listId];
  return parseWordList(text, { existing: mode === 'add' && list ? list.words.map((w) => w.word) : [] });
}

export function importIntoList(state, listId, text, mode) {
  const list = state.wordLists[listId];
  if (!list) return { ok: false, added: 0, errors: [], error: 'No such list' };
  const parsed = previewImport(state, listId, text, mode);
  if (!parsed.words.length) return { ok: false, added: 0, errors: parsed.errors, error: 'No valid words to import' };
  list.words = mergeWords(list.words, parsed.words, mode);
  if (mode === 'replace') dropStats(state, listId, list.words);
  return { ok: true, added: parsed.words.length, errors: parsed.errors };
}

export function createListFromImport(state, name, text) {
  const clean = String(name ?? '').trim();
  if (!clean) return { ok: false, error: 'Give the list a name' };
  const parsed = parseWordList(text);
  if (!parsed.words.length) return { ok: false, errors: parsed.errors, error: 'No valid words to import' };
  const id = newListId();
  state.wordLists[id] = { name: clean, words: parsed.words };
  return { ok: true, id, added: parsed.words.length, errors: parsed.errors };
}

export function renameList(state, listId, name) {
  const clean = String(name ?? '').trim();
  if (!clean || !state.wordLists[listId]) return false;
  state.wordLists[listId].name = clean;
  return true;
}

export function editWord(state, listId, oldWord, rec) {
  const list = state.wordLists[listId];
  const i = list?.words.findIndex((w) => w.word === oldWord) ?? -1;
  if (i < 0) return { ok: false, error: 'Word not found' };
  const word = String(rec.word ?? '').trim();
  if (!word) return { ok: false, error: 'The word cannot be empty' };
  if (word !== oldWord && list.words.some((w) => w.word === word)) return { ok: false, error: `"${word}" is already in the list` };
  const next = { id: word, word, partOfSpeech: String(rec.partOfSpeech ?? '').trim(), definition: String(rec.definition ?? '').trim() };
  const sentence = String(rec.sentence ?? '').trim();
  if (sentence) next.sentence = sentence;
  const sayAs = String(rec.sayAs ?? '').trim();
  if (sayAs) next.sayAs = sayAs;
  list.words[i] = next;
  if (word !== oldWord) dropStats(state, listId, list.words);          // a re-spelled word is a new word
  return { ok: true };
}

export function deleteWord(state, listId, word) {
  const list = state.wordLists[listId];
  if (!list) return false;
  const n = list.words.length;
  list.words = list.words.filter((w) => w.word !== word);
  dropStats(state, listId, list.words);
  return list.words.length < n;
}

export function resetSampleList(state) {
  state.wordLists[SAMPLE_LIST_ID] = { name: SAMPLE_LIST_NAME, words: SAMPLE_WORDS.map((w) => ({ ...w })) };
  dropStats(state, SAMPLE_LIST_ID, state.wordLists[SAMPLE_LIST_ID].words);
}

// ---- profiles
export function setActiveList(state, profileId, listId) {
  if (!state.profiles[profileId] || !state.wordLists[listId]) return false;
  state.profiles[profileId].activeListId = listId;
  return true;
}
// Trainers (id, profile) currently practising a list.
export const listUsers = (state, listId) => Object.entries(state.profiles).filter(([, p]) => p.activeListId === listId);

// Stop a trainer using `listId`: they move to the sample list, or the first other list. Returns false if there is none.
export function unassignList(state, profileId, listId) {
  const p = state.profiles[profileId];
  if (!p || p.activeListId !== listId) return false;
  const other = state.wordLists.sample && listId !== 'sample' ? 'sample' : Object.keys(state.wordLists).find((id) => id !== listId);
  if (!other) return false;
  p.activeListId = other;
  return true;
}

// Delete a list. The sample list can only be reset, not deleted. Trainers on it move to another list; its progress goes with it.
export function deleteList(state, listId) {
  if (listId === 'sample' || !state.wordLists[listId]) return false;
  for (const [id] of listUsers(state, listId)) unassignList(state, id, listId);
  delete state.wordLists[listId];
  for (const p of Object.values(state.profiles)) delete p.wordStats[listId];
  return true;
}

export function renameProfile(state, id, name) {
  const clean = String(name ?? '').trim();
  if (!clean || !state.profiles[id]) return false;
  state.profiles[id].name = clean;
  return true;
}
export function deleteProfile(state, id) {
  if (!state.profiles[id]) return false;
  delete state.profiles[id];
  return true;
}
export function resetProgress(state, id) {
  const old = state.profiles[id];
  if (!old) return false;
  const next = freshProfile({ name: old.name, avatarSpecies: old.avatarSpecies, now: old.createdAt, activeListId: old.activeListId });
  addStarter(next, old.avatarSpecies, old.createdAt);
  state.profiles[id] = next;
  return true;
}

// ---- backup
export const exportJson = (state) => JSON.stringify(state, null, 2);

export function parseBackup(text) {
  let raw;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: 'That file is not valid JSON.' }; }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || typeof raw.version !== 'number') return { ok: false, error: 'That file is not a Spellbeasts backup.' };
  if (raw.version > SCHEMA_VERSION) return { ok: false, error: 'That backup is from a newer version of the game.' };
  const res = migrate(raw);
  if (res.warning) return { ok: false, error: 'That backup is damaged or incomplete.' };
  return { ok: true, state: res.state };
}

// ---- move one trainer to another machine
export const TRAINER_FORMAT = 'spellbeasts-trainer';
const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);

// One trainer's whole game (progress, creatures, eggs, stats) plus the word lists their progress refers to.
export function exportTrainer(state, id, { now = new Date().toISOString() } = {}) {
  const profile = state.profiles[id];
  if (!profile) return null;
  const listIds = new Set([profile.activeListId, ...Object.keys(profile.wordStats ?? {})]);
  const wordLists = Object.fromEntries([...listIds].filter((l) => state.wordLists[l]).map((l) => [l, state.wordLists[l]]));
  return JSON.stringify({ format: TRAINER_FORMAT, schema: SCHEMA_VERSION, exportedAt: now, profile, wordLists }, null, 2);
}
export function parseTrainer(text) {
  let raw;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: 'That file is not valid JSON.' }; }
  if (!isObj(raw) || raw.format !== TRAINER_FORMAT) return { ok: false, error: 'That file is not a Spellbeasts trainer file.' };
  if (typeof raw.schema !== 'number' || raw.schema > SCHEMA_VERSION) return { ok: false, error: 'That trainer file is from a newer version of the game.' };
  if (!isObj(raw.profile) || typeof raw.profile.name !== 'string' || !isObj(raw.wordLists)) return { ok: false, error: 'That trainer file is damaged or incomplete.' };
  return { ok: true, bundle: raw };
}
// Add the trainer as a NEW trainer (nothing existing is replaced). Word lists they use are added, or merged by word if
// this machine already has a list with that id, so their progress still lines up.
export function importTrainer(state, bundle) {
  const base = { version: SCHEMA_VERSION, settings: {}, wordLists: bundle.wordLists, profiles: { in: bundle.profile } };
  const res = migrate(base);
  if (res.warning) return { ok: false, error: 'That trainer file is damaged or incomplete.' };
  const profile = res.state.profiles.in;
  let listsAdded = 0, listsMerged = 0;
  for (const [id, list] of Object.entries(res.state.wordLists)) {
    if (!Array.isArray(list?.words)) continue;
    if (!state.wordLists[id]) { state.wordLists[id] = { name: list.name ?? id, words: list.words }; listsAdded += 1; }
    else { state.wordLists[id].words = mergeWords(state.wordLists[id].words, list.words, 'add'); listsMerged += 1; }
  }
  if (!state.wordLists[profile.activeListId]) profile.activeListId = state.wordLists.sample ? 'sample' : Object.keys(state.wordLists)[0];
  const id = `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  state.profiles[id] = profile;
  return { ok: true, id, name: profile.name, listsAdded, listsMerged };
}

// ---- a report to hand over for debugging or analysis
export const DEBUG_FORMAT = 'spellbeasts-debug';
// The game's cricket rules as they are in this build, so a saved report can be judged without the code to hand.
export const economyRules = () => ({
  practice: { ...CRICKETS, note: 'per correct word: firstTry (or retry) + streakBonus on a streak; per finished session: session (+ firstSessionOfDay)' },
  games: { cost: GAME_COST, refund: GAME_REFUND, refundFromTier: GREAT_TIER },
  eggs: { prices: EGG_PRICES, wordsToHatch: EGG_PRICES.map((_, i) => eggNeeded(i)), duplicateRefund: 'half the egg price' },
  sparkle: SPARKLE_CRICKETS,
  landmarkStar: '5 to 15 crickets',
  battleWinCrickets: EGG_PRICES.map((_, i) => battleBonus(i)),
  chest: { everyMasteredWords: CHEST_EVERY, weights: REWARD_WEIGHTS, treatMeterGain: TREAT_GAIN, crickets: '30% to 60% of the newest land egg price, in steps of 5, minimum 10' },
});

// What the ledger says about one trainer's economy: income by source, spending by sink, and a few ratios to judge it by.
function economyOf(p) {
  const l = p.ledger ?? { earned: {}, spent: {}, days: {} };
  const days = Object.entries(l.days ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const practiceDays = days.filter(([, d]) => (d.earned?.practice ?? 0) + (d.earned?.['battle-words'] ?? 0) > 0);
  const recent = days.slice(-14);
  const earnedRecent = recent.reduce((n, [, d]) => n + total(d.earned), 0);
  const practiceEarned = practiceDays.reduce((n, [, d]) => n + (d.earned.practice ?? 0) + (d.earned['battle-words'] ?? 0), 0);
  const avgPerPracticeDay = practiceDays.length ? Math.round(practiceEarned / practiceDays.length) : null;
  const top = Math.max(0, ...(p.map?.unlockedRegions ?? []).map(regionIndex));
  const nextEgg = EGG_PRICES[Math.min(top, EGG_PRICES.length - 1)];
  const earned = total(l.earned), spent = total(l.spent);
  const sess = (p.sessions ?? []).filter((x) => Number.isFinite(x.crickets));
  return {
    trackedSince: days[0]?.[0] ?? null, daysTracked: days.length, practiceDaysTracked: practiceDays.length,
    earnedBySource: l.earned, spentBySink: l.spent, totalEarned: earned, totalSpent: spent,
    gameSpendShareOfEarned: earned ? Math.round((100 * (l.spent.game ?? 0)) / earned) / 100 : null,
    avgEarnedPerPracticeDay: avgPerPracticeDay, earnedLast14Days: earnedRecent,
    newestLandEggPrice: nextEgg, practiceDaysToAffordNewestEgg: avgPerPracticeDay ? Math.ceil(nextEgg / avgPerPracticeDay) : null,
    avgCricketsPerSession: sess.length ? Math.round(sess.reduce((n, x) => n + x.crickets, 0) / sess.length) : null,
    cricketsNow: p.crickets,
  };
}

export function debugReport(state, { hideNames = true, appVersion = '', userAgent = '', now = new Date().toISOString() } = {}) {
  const copy = JSON.parse(JSON.stringify(state));
  const names = {};
  Object.keys(copy.profiles).forEach((id, i) => { names[id] = hideNames ? `Trainer ${i + 1}` : copy.profiles[id].name; if (hideNames) copy.profiles[id].name = names[id]; });
  const summary = Object.entries(state.profiles).map(([id, p]) => ({
    trainer: names[id], level: p.level, xp: p.xp, crickets: p.crickets, berries: p.berries, activeList: p.activeListId,
    creatures: p.creatures.length, eggs: p.eggs.length, landsOpen: p.map?.unlockedRegions?.length, trailStep: p.map?.trailStep,
    masteredWords: masteredCount(p), chestsOpened: p.chestsOpened ?? 0, chestsWaiting: chestsPending(p),
    streak: p.streak?.current, sessions: p.sessions?.length, time: p.time, gameDifficulty: p.gameDifficulty ?? 'normal', gameBest: p.gameBest ?? {}, gamesPlayed: p.care?.games ?? 0, eggsHatched: p.eggsHatched ?? 0,
    economy: economyOf(p),
  }));
  return JSON.stringify({ format: DEBUG_FORMAT, generatedAt: now, appVersion, schema: SCHEMA_VERSION, userAgent, namesHidden: hideNames, economyRules: economyRules(), summary, state: copy }, null, 2);
}
