// Eggs, hatching, feeding, evolution (PRD 11, 11A).
export const EGG_PRICES = [20, 30, 40, 50, 60, 75, 90, 105, 125];
export const RARITY_WEIGHTS = { common: 0.6, uncommon: 0.3, rare: 0.1 };
export const eggPrice = (regionIndex) => EGG_PRICES[regionIndex];
export const eggNeeded = (regionIndex) => 10 + 2 * regionIndex; // correct words to hatch
export const duplicateCrickets = (regionIndex) => Math.floor(eggPrice(regionIndex) / 2);

export function rollRarity(rng) {
  const r = rng();
  return r < RARITY_WEIGHTS.common ? 'common' : r < RARITY_WEIGHTS.common + RARITY_WEIGHTS.uncommon ? 'uncommon' : 'rare';
}

// regionSpecies: {common, uncommon, rare} species ids. owned: Set of species ids.
export function rollEgg({ regionSpecies, owned, rng }) {
  let species = regionSpecies[rollRarity(rng)];
  if (owned.has(species)) species = regionSpecies[rollRarity(rng)]; // re-roll once
  return { species, duplicate: owned.has(species) };
}

export function addEggProgress(egg, n = 1) {
  const progress = Math.min(egg.needed, egg.progress + n);
  return { ...egg, progress, ready: progress >= egg.needed };
}

export const FEED_NEEDED = { 1: 30, 2: 60 };
export const EVOLVE_REQUIREMENTS = { 1: { level: 3, mastered: 0 }, 2: { level: 0, mastered: 10 } };

export function feedCreature(creature, amount) {
  const cap = FEED_NEEDED[creature.stage];
  if (!cap) return { ...creature };
  return { ...creature, fed: Math.min(cap, creature.fed + amount) };
}

export function canEvolve(creature, { level, mastered }) {
  const need = FEED_NEEDED[creature.stage];
  if (!need) return false;
  const req = EVOLVE_REQUIREMENTS[creature.stage];
  return creature.fed >= need && level >= req.level && mastered >= req.mastered;
}

export function evolve(creature, ctx) {
  return canEvolve(creature, ctx) ? { ...creature, stage: creature.stage + 1, fed: 0 } : creature;
}
