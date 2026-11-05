// Eggs, hatching, feeding, evolving, trophies for the collection (PRD 11, 9.3). Mutates the profile.
import { eggPrice, eggNeeded, rollEgg, addEggProgress, duplicateCrickets, feedCreature, canEvolve, evolve, FEED_NEEDED } from './hatch.js';
import { speciesInRegion, regionIndex, speciesById, SPECIES } from './species.js';
import { evaluateTrophies } from './trophies.js';
import { isMastered } from './leitner.js';

export const masteredCount = (profile) => Object.values(profile.wordStats[profile.activeListId] ?? {}).filter(isMastered).length;
export const ownedSpecies = (profile) => new Set(profile.creatures.map((c) => c.species));
const newId = (prefix, profile) => `${prefix}${Date.now().toString(36)}${profile.creatures.length}${profile.eggs.length}${Math.floor(Math.random() * 1e6)}`;

export function addStarter(profile, speciesId, now = new Date().toISOString()) {
  profile.avatarSpecies = speciesId;
  const creature = { id: newId('c', profile), species: speciesId, stage: 1, fed: 0, hearts: 0, hatchedAt: now };
  profile.creatures.push(creature);
  profile.companion = creature.id;
  return creature;
}

export function buyEgg(profile, regionId) {
  const i = regionIndex(regionId);
  if (i < 0 || !profile.map.unlockedRegions.includes(regionId)) return { ok: false, reason: 'locked' };
  const price = eggPrice(i);
  if (profile.crickets < price) return { ok: false, reason: 'crickets' };
  profile.crickets -= price;
  const egg = { id: newId('e', profile), regionId, progress: 0, needed: eggNeeded(i) };
  profile.eggs.push(egg);
  return { ok: true, egg };
}

// Each correct answer warms the first egg that is not yet ready.
export function warmEggs(profile, n = 1) {
  const idx = profile.eggs.findIndex((e) => e.progress < e.needed);
  if (idx < 0) return null;
  profile.eggs[idx] = addEggProgress(profile.eggs[idx], n);
  return profile.eggs[idx];
}
export const readyEggs = (profile) => profile.eggs.filter((e) => e.progress >= e.needed);

export function hatchEgg(profile, eggId, rng = Math.random, today = '') {
  const idx = profile.eggs.findIndex((e) => e.id === eggId);
  const egg = profile.eggs[idx];
  if (!egg || egg.progress < egg.needed) return { ok: false };
  const i = regionIndex(egg.regionId);
  const { species, duplicate } = rollEgg({ regionSpecies: speciesInRegion(egg.regionId), owned: ownedSpecies(profile), rng });
  profile.eggs.splice(idx, 1);
  profile.eggsHatched = (profile.eggsHatched ?? 0) + 1;
  let creature, bonus = 0;
  if (duplicate) {
    bonus = duplicateCrickets(i);
    profile.crickets += bonus;
    creature = profile.creatures.find((c) => c.species === species);
    creature.hearts += 1;
  } else {
    creature = { id: newId('c', profile), species, stage: 1, fed: 0, hearts: 0, hatchedAt: new Date().toISOString() };
    profile.creatures.push(creature);
  }
  const trophies = awardTrophies(profile, today);
  return { ok: true, species, duplicate, bonus, creature, trophies };
}

export function feed(profile, creatureId, amount = 10) {
  const c = profile.creatures.find((x) => x.id === creatureId);
  if (!c || !FEED_NEEDED[c.stage]) return 0;
  const room = FEED_NEEDED[c.stage] - c.fed;
  const spend = Math.max(0, Math.min(amount, room, profile.crickets));
  if (!spend) return 0;
  profile.crickets -= spend;
  Object.assign(c, feedCreature(c, spend));
  return spend;
}

export const evolveContext = (profile) => ({ level: profile.level, mastered: masteredCount(profile) });

export function tryEvolve(profile, creatureId, today = '') {
  const c = profile.creatures.find((x) => x.id === creatureId);
  if (!c || !canEvolve(c, evolveContext(profile))) return { ok: false };
  Object.assign(c, evolve(c, evolveContext(profile)));
  return { ok: true, creature: c, trophies: awardTrophies(profile, today) };
}

// Why can't this creature evolve yet? (for friendly hints)
export function evolveHint(profile, c) {
  if (!FEED_NEEDED[c.stage]) return 'Fully evolved!';
  const need = FEED_NEEDED[c.stage], ctx = evolveContext(profile), notes = [];
  if (c.fed < need) notes.push(`feed ${need - c.fed} more crickets`);
  if (c.stage === 1 && ctx.level < 3) notes.push('reach trainer level 3');
  if (c.stage === 2 && ctx.mastered < 10) notes.push(`master ${10 - ctx.mastered} more words`);
  return notes.length ? `To evolve: ${notes.join(' and ')}.` : 'Ready to evolve!';
}

export function trophyContext(profile, extra = {}) {
  const stats = Object.values(profile.wordStats[profile.activeListId] ?? {});
  const owned = ownedSpecies(profile);
  return {
    eggsHatched: profile.eggsHatched ?? 0, sessionsCompleted: profile.sessions.length, bestRun: 0,
    masteredCount: masteredCount(profile), dayStreak: profile.streak.current, creaturesCount: profile.creatures.length,
    maxStage: Math.max(1, ...profile.creatures.map((c) => c.stage)), battlesWon: profile.battlesWon ?? 0,
    level: profile.level, regionsOpen: profile.map.unlockedRegions.length, trailStep: profile.map.trailStep, starsOpened: profile.map.claimedLandmarks.length,
    perfectSessions: profile.sessions.filter((s) => s.misses === 0).length,
    firstTryTotal: stats.reduce((n, s) => n + (s.firstTryCorrect ?? 0), 0),
    speciesOwned: owned.size, speciesTotal: SPECIES.length,
    rareOwned: [...owned].filter((id) => speciesById(id)?.rarity === 'rare').length,
    heartsTotal: profile.creatures.reduce((n, c) => n + (c.hearts ?? 0), 0),
    evolvedCount: profile.creatures.filter((c) => c.stage >= 2).length,
    wordsInList: Infinity, ...extra,
  };
}

export function awardTrophies(profile, today, extra = {}) {
  const ids = evaluateTrophies(trophyContext(profile, extra), profile.trophies);
  for (const id of ids) profile.trophies[id] = today;
  return ids;
}

export const companionOf = (profile) => profile.creatures.find((c) => c.id === profile.companion) ?? profile.creatures[0] ?? null;
export const speciesName = (id) => speciesById(id)?.name ?? id;
