// Treasure chests: one for every CHEST_EVERY words mastered. Unopened chests wait on Home. Each holds something for the
// trainer's pets: crickets, berries, a treat that cheers the companion, or (rarely) a free egg.
import { masteredCount, companionOf, grantEgg } from './collection.js';
import { eggPrice } from './hatch.js';
import { regionIndex } from './species.js';
import { careOf, METER_MAX, MEASURES } from './care.js';

export const CHEST_EVERY = 5;
export const REWARD_WEIGHTS = { crickets: 45, berries: 25, treat: 22, egg: 8 };
export const TREAT_GAIN = 2;
export const chestsEarned = (profile) => Math.floor(masteredCount(profile) / CHEST_EVERY);
export const chestsPending = (profile) => Math.max(0, chestsEarned(profile) - (profile.chestsOpened ?? 0));
export const wordsToNextChest = (profile) => CHEST_EVERY - (masteredCount(profile) % CHEST_EVERY);

const pickKind = (rng, creature) => {
  const weights = Object.entries(REWARD_WEIGHTS).filter(([k]) => k !== 'treat' || creature);   // a treat needs a pet to eat it
  let r = rng() * weights.reduce((n, [, w]) => n + w, 0);
  for (const [k, w] of weights) { if ((r -= w) < 0) return k; }
  return 'crickets';
};

// Open the next waiting chest. Returns { ok, reward } where reward is { kind, ... } for the screen to show.
export function openChest(profile, { rng = Math.random, today = '' } = {}) {
  if (chestsPending(profile) < 1) return { ok: false };
  profile.chestsOpened = (profile.chestsOpened ?? 0) + 1;
  const pet = companionOf(profile);
  const top = Math.max(0, ...profile.map.unlockedRegions.map(regionIndex));
  let kind = pickKind(rng, pet), reward;
  if (kind === 'egg') {
    const open = profile.map.unlockedRegions.filter((id) => regionIndex(id) >= 0);
    const egg = open.length ? grantEgg(profile, open[Math.floor(rng() * open.length)]) : null;
    if (egg) reward = { kind: 'egg', regionId: egg.regionId };
    else kind = 'crickets';
  }
  if (kind === 'crickets') {
    const base = eggPrice(top);                                           // so a chest stays worth opening as eggs get dearer
    const amount = Math.max(10, Math.round(base * (0.3 + rng() * 0.3) / 5) * 5);
    profile.crickets = (profile.crickets ?? 0) + amount; reward = { kind, amount };
  } else if (kind === 'berries') {
    const amount = 3 + Math.floor(rng() * 4);
    profile.berries = (profile.berries ?? 0) + amount; reward = { kind, amount };
  } else if (kind === 'treat') {
    const c = careOf(pet, today);
    for (const m of MEASURES) c[m] = Math.min(METER_MAX, c[m] + TREAT_GAIN);
    reward = { kind, creatureId: pet.id, species: pet.species, stage: pet.stage };
  }
  return { ok: true, reward, left: chestsPending(profile) };
}
