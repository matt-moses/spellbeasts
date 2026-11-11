// World map rules (PRD 11A): region unlocks, trail progress, landmark treasure.
import { REGIONS, regionIndex } from './species.js';
import { warmEggs, masteredCount } from './collection.js';
import { STAR_BERRIES } from './care.js';
import { landCount } from '../config.js';

const ALL_UNLOCKS = [
  { level: 1, mastered: 0 }, { level: 2, mastered: 0 }, { level: 4, mastered: 0 },
  { level: 6, mastered: 15 }, { level: 8, mastered: 25 }, { level: 10, mastered: 40 },
  { level: 12, mastered: 44 }, { level: 14, mastered: 47 }, { level: 16, mastered: 50 },   // the new lands
  { level: 18, mastered: 53 }, { level: 20, mastered: 56 }, { level: 22, mastered: 60 },   // lands 10-12
];
export const UNLOCKS = ALL_UNLOCKS.slice(0, landCount());
// Each land's stretch of trail is a little longer than the one before, so progress gets steadily harder.
export const REGION_STEPS = [30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52].slice(0, landCount());
export const REGION_END = REGION_STEPS.reduce((acc, n) => [...acc, (acc.at(-1) ?? 0) + n], []);
export const regionStart = (i) => (i === 0 ? 0 : REGION_END[i - 1]);
export const LANDMARK_EVERY = 10;
export const TOTAL_STEPS = REGION_END.at(-1);

export const isUnlocked = (index, { level, mastered }) => level >= UNLOCKS[index].level && mastered >= UNLOCKS[index].mastered;

export function unlockRequirement(index) {
  const u = UNLOCKS[index];
  const parts = [`level ${u.level}`];
  if (u.mastered) parts.push(`${u.mastered} words mastered`);
  return `Reach ${parts.join(' and ')}`;
}

// Adds any regions that are now unlocked (in order). Returns the newly unlocked region ids.
export function updateUnlocks(profile) {
  const ctx = { level: profile.level, mastered: masteredCount(profile) };
  const fresh = [];
  REGIONS.forEach((r, i) => {
    if (!profile.map.unlockedRegions.includes(r.id) && isUnlocked(i, ctx)) { profile.map.unlockedRegions.push(r.id); fresh.push(r.id); }
  });
  return fresh;
}

// The token may walk to the end of the last unlocked region and waits at the gate there.
export function maxStep(profile) {
  const highest = Math.max(...profile.map.unlockedRegions.map(regionIndex));
  return REGION_END[highest];
}

export function regionOfStep(step) {
  const i = REGION_END.findIndex((end) => step <= end);
  return REGIONS[i < 0 ? REGIONS.length - 1 : i].id;
}

// One first-try-correct answer = one step. Returns {moved, atGate}.
export function advanceTrail(profile) {
  const limit = maxStep(profile);
  if (profile.map.trailStep >= limit) return { moved: false, atGate: profile.map.trailStep < TOTAL_STEPS };
  profile.map.trailStep += 1;
  return { moved: true, atGate: profile.map.trailStep >= limit && limit < TOTAL_STEPS };
}

export const LANDMARKS = Array.from({ length: Math.floor(TOTAL_STEPS / LANDMARK_EVERY) }, (_, i) => ({ id: `L${(i + 1) * LANDMARK_EVERY}`, step: (i + 1) * LANDMARK_EVERY }));
export const isReached = (profile, lm) => profile.map.trailStep >= lm.step;
export const isClaimed = (profile, lm) => profile.map.claimedLandmarks.includes(lm.id);

// Chest: 5-15 crickets; sometimes (20%) an egg-warming boost when an egg is waiting. Claimable once.
export function claimLandmark(profile, id, rng = Math.random) {
  const lm = LANDMARKS.find((l) => l.id === id);
  if (!lm || !isReached(profile, lm) || isClaimed(profile, lm)) return { ok: false };
  profile.map.claimedLandmarks.push(id);
  const crickets = 5 + Math.floor(rng() * 11);
  profile.crickets += crickets;
  profile.berries = (profile.berries ?? 0) + STAR_BERRIES;
  let boost = 0;
  if (rng() < 0.2 && warmEggs(profile, 3)) boost = 3;
  return { ok: true, crickets, boost };
}
