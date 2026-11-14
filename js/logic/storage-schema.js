// State shape, defaults, migration (PRD 13). Pure: no localStorage here.
import { SCHEMA_VERSION } from './version.js';
import { freshTime } from './playtime.js';
import { freshCareStats, START_BERRIES } from './care.js';
import { SAMPLE_LIST_ID, SAMPLE_LIST_NAME, SAMPLE_WORDS } from '../../data/sample-words.js';

export const SESSION_HISTORY_CAP = 200;

export const defaultSettings = () => ({ sound: true, music: true, voiceURI: null, rate: 0.9 });

export function freshState() {
  return {
    version: SCHEMA_VERSION,
    settings: defaultSettings(),
    wordLists: { [SAMPLE_LIST_ID]: { name: SAMPLE_LIST_NAME, words: SAMPLE_WORDS.map((w) => ({ ...w })) } },
    profiles: {},
  };
}

export function freshProfile({ name, avatarSpecies, now = new Date().toISOString(), activeListId = SAMPLE_LIST_ID }) {
  return {
    name, avatarSpecies, createdAt: now, activeListId,
    crickets: 0, xp: 0, level: 1, berries: START_BERRIES, care: freshCareStats(),
    streak: { current: 0, best: 0, lastPlayDate: null, restUsedWeek: null },
    wordStats: {},
    creatures: [], eggs: [],
    map: { trailStep: 0, claimedLandmarks: [], unlockedRegions: ['r1'] },
    trophies: {}, sessions: [], time: freshTime(),
    battlesWon: 0, arena: { befriended: [], wins: {}, lastCreature: null },
  };
}

export function capSessions(profile) {
  if (profile.sessions.length > SESSION_HISTORY_CAP) profile.sessions = profile.sessions.slice(-SESSION_HISTORY_CAP);
  return profile;
}

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);

export function validate(state) {
  return isObj(state) && state.version === SCHEMA_VERSION && isObj(state.settings) && isObj(state.wordLists) && isObj(state.profiles);
}

// Returns {state, warning}. Missing/corrupt -> fresh state plus a warning flag.
export function migrate(raw) {
  if (raw == null) return { state: freshState(), warning: false };
  if (!isObj(raw) || typeof raw.version !== 'number') return { state: freshState(), warning: true };
  const base = freshState();
  const state = { ...base, ...raw, settings: { ...base.settings, ...(isObj(raw.settings) ? raw.settings : {}) } };
  if (!isObj(state.wordLists) || !isObj(state.profiles)) return { state: freshState(), warning: true };
  state.version = SCHEMA_VERSION;
  for (const [id, p] of Object.entries(state.profiles)) {
    state.profiles[id] = capSessions({ ...freshProfile({ name: p?.name ?? 'Trainer', avatarSpecies: p?.avatarSpecies }), ...p });
  }
  return { state, warning: false };
}
