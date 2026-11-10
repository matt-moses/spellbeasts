// Battle tuning report: how often a speller of a given accuracy wins, and how far into the session the win lands.
//   node tools/battle-tuning.mjs [battlesPerCell=400]
// Uses the real rules (js/logic/battle.js) with a seeded speller who gets each answer right with the given chance.
import { startBattle, NEST_BEFRIEND_CHANCE } from '../js/logic/battle.js';
import { freshState, freshProfile } from '../js/logic/storage-schema.js';
import { addStarter } from '../js/logic/collection.js';
import { REGIONS } from '../js/logic/species.js';

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const N = Number(process.argv[2] ?? 400);
const median = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : NaN);

export function simulate({ accuracy, land, seed }) {
  const state = freshState(), list = state.wordLists.sample;
  const profile = freshProfile({ name: 'T', avatarSpecies: 'burrowby', now: '2026-11-01T00:00:00Z' });
  addStarter(profile, 'burrowby', '2026-11-01T00:00:00Z');
  profile.level = 16; profile.xp = 6750; profile.map.unlockedRegions = REGIONS.map((r) => r.id);
  profile.wordStats.sample = Object.fromEntries(list.words.map((w) => [w.word, { box: 1, nextDue: '2026-11-04', correctDays: [], attempts: 1, firstTries: 1, firstTryCorrect: 0, lastMissed: null, lastBoxDate: '2026-11-04' }]));
  const r = rng(seed), speller = rng(seed * 7919 + 13);
  const { battle } = startBattle({ profile, list, today: '2026-11-05', regionId: REGIONS[land].id, rng: r });
  let answers = 0, winAt = null;
  for (let w = battle.next(); w; w = battle.next()) {
    answers++;
    const ok = speller() < accuracy;
    const res = battle.submit(ok ? w.word : `${w.word}x`);
    if (res.battle.justWon) winAt = answers;
    if (!ok) battle.submitCorrection(w.word);
  }
  const out = battle.finish().battle;
  return { won: out.outcome === 'won', winAt, answers, words: battle.total, hearts: battle.hearts, befriended: out.prize?.kind === 'befriend' };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`Battle tuning: ${N} battles per cell. "win at" = median answer on which the last heart goes, of the median number of answers in the session.\n`);
  console.log('accuracy | land | hearts | win rate | win at / answers | befriended');
  for (const accuracy of [0.6, 0.8, 1]) for (const land of [0, 4, 8]) {
    const runs = Array.from({ length: N }, (_, i) => simulate({ accuracy, land, seed: 1000 * land + i + 1 + Math.round(accuracy * 100) * 100000 }));
    const wins = runs.filter((x) => x.won);
    console.log(`${String(Math.round(accuracy * 100)).padStart(7)}% | ${String(land + 1).padStart(4)} | ${String(median(runs.map((x) => x.hearts))).padStart(6)} | ${(100 * wins.length / N).toFixed(1).padStart(7)}% | ${String(median(wins.map((x) => x.winAt))).padStart(6)} / ${String(median(runs.map((x) => x.answers))).padEnd(7)} | ${(100 * runs.filter((x) => x.befriended).length / N).toFixed(0)}%`);
  }
  console.log(`\nAn egg species you do not own yet joins ${NEST_BEFRIEND_CHANCE * 100}% of the time it is beaten; an arena-only species always joins the first time.`);
}
