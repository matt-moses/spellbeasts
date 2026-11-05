// Parent-area operations (PRD 10.2). Pure functions over the app state; the UI calls these.
import { parseWordList, mergeWords, pruneStats } from './import.js';
import { freshProfile, migrate } from './storage-schema.js';
import { addStarter } from './collection.js';
import { isMastered } from './leitner.js';
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
