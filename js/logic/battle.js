// Trainer Battles (PRD 12). A battle is one ordinary practice session with a wild creature watching: this module only
// reads each turn's result and adds hearts, a special move and a prize. Words, boxes, due dates and rewards all come
// from startSession(), so a battle can never drift from practice. The player cannot lose.
import { startSession } from './session.js';
import { adoptCreature, awardTrophies, ownedSpecies } from './collection.js';
import { speciesInRegion, arenaSpeciesOf, regionIndex, isArenaSpecies } from './species.js';

export const ARENA_LEVEL = 3;              // the Arena opens at this trainer level
export const HIT_DAMAGE = 1;
export const SPECIAL_DAMAGE = 2;
export const SPECIAL_EVERY = 3;            // every third correct answer in a row is a special move
export const ARENA_CHANCE_NEW = 0.4;       // chance the wild creature is the land's arena-only species, until befriended
export const ARENA_CHANCE_OWNED = 0.1;     // ... and after
export const WILD_STAGE_WEIGHTS = [0.6, 0.3, 0.1];   // the wild creature's stage is only for looks
export const NEST_BEFRIEND_CHANCE = 0.25;  // chance to befriend an egg species you do not own yet
export const battleBonus = (landIndex) => 5 + 2 * landIndex;   // crickets for a win that does not befriend

export const arenaOpen = (profile) => (profile.level ?? 1) >= ARENA_LEVEL;

// Later lands are a little tougher: 0 extra hearts in lands 1-3, 1 in lands 4-6, 2 in lands 7-9, 3 in lands 10-12.
export const heartTier = (landIndex) => Math.max(0, Math.min(3, Math.floor(landIndex / 3)));
// How much a run of n correct answers with no miss takes off.
export const cleanRunDamage = (n) => n * HIT_DAMAGE + Math.floor(n / SPECIAL_EVERY) * (SPECIAL_DAMAGE - HIT_DAMAGE);
// Hearts scale with the session so the fight lasts it, capped so that a clean run always wins.
export const wildHearts = (words, landIndex) => Math.max(1, Math.min(words + heartTier(landIndex), cleanRunDamage(words)));

// Which wild creature appears in a land, and at which (cosmetic) stage.
export function pickWild({ regionId, owned = new Set(), rng = Math.random }) {
  const arena = arenaSpeciesOf(regionId);
  const nest = Object.values(speciesInRegion(regionId));
  const r = rng();
  const arenaChance = arena ? (owned.has(arena) ? ARENA_CHANCE_OWNED : ARENA_CHANCE_NEW) : 0;
  const species = r < arenaChance ? arena : nest[Math.min(nest.length - 1, Math.floor(((r - arenaChance) / (1 - arenaChance)) * nest.length))];
  const s = rng();
  const stage = s < WILD_STAGE_WEIGHTS[0] ? 1 : s < WILD_STAGE_WEIGHTS[0] + WILD_STAGE_WEIGHTS[1] ? 2 : 3;
  return { species, stage, arenaOnly: species === arena };
}

// What a win earns. Arena-only species always join the first time; an egg species you do not own joins sometimes;
// everything else pays bonus crickets.
export function prizeFor({ species, owned = new Set(), landIndex, rng = Math.random }) {
  if (!owned.has(species) && (isArenaSpecies(species) || rng() < NEST_BEFRIEND_CHANCE)) return { kind: 'befriend', species, crickets: 0 };
  return { kind: 'crickets', species, crickets: battleBonus(landIndex) };
}

// One turn's battle outcome from the session's result. `state` = { heartsLeft, won }. Pure.
export function battleTurn(state, { correct, streak }) {
  if (state.won) return { event: correct ? 'cheer' : 'oops', damage: 0, heartsLeft: 0, charge: 0, justWon: false };
  if (!correct) return { event: 'dodge', damage: 0, heartsLeft: state.heartsLeft, charge: 0, justWon: false };
  const special = streak % SPECIAL_EVERY === 0;
  const damage = Math.min(state.heartsLeft, special ? SPECIAL_DAMAGE : HIT_DAMAGE);
  const heartsLeft = state.heartsLeft - damage;
  return { event: special ? 'special' : 'hit', damage, heartsLeft, charge: heartsLeft === 0 ? 0 : streak % SPECIAL_EVERY, justWon: heartsLeft === 0 };
}

// Why a battle cannot start here (or null when it can).
export function battleBlock(profile, regionId) {
  if (!arenaOpen(profile)) return 'level';
  if (regionIndex(regionId) < 0 || !profile.map.unlockedRegions.includes(regionId)) return 'locked';
  if (!profile.creatures.length) return 'creature';
  return null;
}

// Returns { ok: true, battle } or { ok: false, reason: 'level' | 'locked' | 'creature' | 'words' }.
// `battle` has the same next / submit / submitCorrection / finish interface as a session.
export function startBattle({ profile, list, today, regionId, creatureId = null, rng = Math.random, wild: forcedWild = null }) {
  const block = battleBlock(profile, regionId);
  if (block) return { ok: false, reason: block };
  // The session comes first so its word choice sees the very same random numbers as plain practice would.
  // Nothing due today? Fall back to the Bonus review set (the weakest words).
  const s = startSession({ profile, list, today, rng, mode: 'battle' }) ?? startSession({ profile, list, today, rng, bonus: true, mode: 'battle' });
  if (!s) return { ok: false, reason: 'words' };

  const landIndex = regionIndex(regionId);
  const wild = forcedWild ?? pickWild({ regionId, owned: ownedSpecies(profile), rng });
  const fighter = profile.creatures.find((c) => c.id === creatureId) ?? profile.creatures.find((c) => c.id === profile.companion) ?? profile.creatures[0];
  const hearts = wildHearts(s.total, landIndex);
  const state = { heartsLeft: hearts, won: false };
  let charge = 0, result = null, prize = null, creature = null, winTrophies = [];
  profile.arena ??= { befriended: [], wins: {}, lastCreature: null };
  profile.arena.lastCreature = fighter.id;

  const battle = {
    get mode() { return s.mode; },
    get current() { return s.current; },
    get tally() { return s.tally; },
    get total() { return s.total; },
    get startLevel() { return s.startLevel; },
    get progress() { return s.progress; },
    get regionId() { return regionId; },
    get wild() { return wild; },
    get fighter() { return fighter; },
    get hearts() { return hearts; },
    get heartsLeft() { return state.heartsLeft; },
    get won() { return state.won; },
    get charge() { return charge; },
    get prize() { return prize; },
    next: () => s.next(),
    submitCorrection: (typed) => s.submitCorrection(typed),

    // The win is real the moment the last heart goes: the prize is given (and saved by the caller) right then,
    // so a win the player has seen is never lost. The rest of the words are a victory lap.
    submit(typed) {
      const r = s.submit(typed);
      const turn = battleTurn(state, { correct: r.correct, streak: r.reward.streak });
      state.heartsLeft = turn.heartsLeft;
      charge = turn.charge;
      if (turn.justWon) {
        state.won = true;
        prize = prizeFor({ species: wild.species, owned: ownedSpecies(profile), landIndex, rng });
        if (prize.kind === 'befriend') {
          creature = adoptCreature(profile, wild.species);
          if (!profile.arena.befriended.includes(wild.species)) profile.arena.befriended.push(wild.species);
        } else profile.crickets += prize.crickets;
        profile.battlesWon = (profile.battlesWon ?? 0) + 1;
        profile.arena.wins[regionId] = (profile.arena.wins[regionId] ?? 0) + 1;
        winTrophies = awardTrophies(profile, today);
      }
      return { ...r, battle: { ...turn, hearts, prize: turn.justWon ? prize : null, trophies: turn.justWon ? winTrophies : [] } };
    },

    finish() {
      if (result) return result;
      const summary = s.finish();
      result = { ...summary, trophies: [...winTrophies, ...summary.trophies], battle: { outcome: state.won ? 'won' : 'escaped', regionId, wild, fighter: { species: fighter.species, stage: fighter.stage }, hearts, heartsLeft: state.heartsLeft, prize, creatureId: creature?.id ?? null, battlesWon: profile.battlesWon ?? 0 } };
      return result;
    },
  };
  return { ok: true, battle };
}
