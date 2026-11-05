// World map rules (PRD 11A): region unlocks, trail progress, landmark treasure.
import { REGIONS, regionIndex } from './species.js';
import { warmEggs, masteredCount } from './collection.js';

export const UNLOCKS = [
  { level: 1, mastered: 0 }, { level: 2, mastered: 0 }, { level: 4, mastered: 5 },
  { level: 6, mastered: 15 }, { level: 8, mastered: 25 }, { level: 10, mastered: 40 },
];
export const STEPS_PER_REGION = 30;
export const LANDMARK_EVERY = 10;
export const TOTAL_STEPS = STEPS_PER_REGION * REGIONS.length;

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
  return (highest + 1) * STEPS_PER_REGION;
}

export function regionOfStep(step) {
  return REGIONS[Math.min(REGIONS.length - 1, Math.max(0, Math.ceil(step / STEPS_PER_REGION) - 1))].id;
}

// One first-try-correct answer = one step. Returns {moved, atGate}.
export function advanceTrail(profile) {
  const limit = maxStep(profile);
  if (profile.map.trailStep >= limit) return { moved: false, atGate: profile.map.trailStep < TOTAL_STEPS };
  profile.map.trailStep += 1;
  return { moved: true, atGate: profile.map.trailStep >= limit && limit < TOTAL_STEPS };
}

export const LANDMARKS = Array.from({ length: TOTAL_STEPS / LANDMARK_EVERY }, (_, i) => ({ id: `L${(i + 1) * LANDMARK_EVERY}`, step: (i + 1) * LANDMARK_EVERY }));
export const isReached = (profile, lm) => profile.map.trailStep >= lm.step;
export const isClaimed = (profile, lm) => profile.map.claimedLandmarks.includes(lm.id);

// Chest: 5-15 crickets; sometimes (20%) an egg-warming boost when an egg is waiting. Claimable once.
export function claimLandmark(profile, id, rng = Math.random) {
  const lm = LANDMARKS.find((l) => l.id === id);
  if (!lm || !isReached(profile, lm) || isClaimed(profile, lm)) return { ok: false };
  profile.map.claimedLandmarks.push(id);
  const crickets = 5 + Math.floor(rng() * 11);
  profile.crickets += crickets;
  let boost = 0;
  if (rng() < 0.2 && warmEggs(profile, 3)) boost = 3;
  return { ok: true, crickets, boost };
}
