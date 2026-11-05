// Creature care (fun extras): four meters per creature that drift down a little each day and go up when you
// feed berries, give a bath, pet, or play. All low-stakes: nothing ever gets sick or is lost.
import { daysBetween } from './leitner.js';
import { playedToday } from './streak.js';

export const MEASURES = ['fed', 'clean', 'loved', 'fun'];
export const METER_MAX = 5, METER_START = 3, MAX_DAILY_DRIFT = 3;
export const BERRY_FEED = 2, BATH_GAIN = 3, GAME_GAIN = 3, PETS_PER_HEART = 3, SPARKLE_CRICKETS = 3, SESSION_BERRIES = 2, STAR_BERRIES = 1, START_BERRIES = 3;
export const GAME_BERRIES_PER = 4;                                   // a game's score tier: one point for every 4 caught
// Games are paid for with spelling: playing costs crickets (taken when a game is finished, so leaving early is free),
// and a great game (tier 2 or better) gives one back. Games no longer hand out berries.
export const GAME_COST = 3, GAME_REFUND = 1, GREAT_TIER = 2;
export const canPlay = (profile) => (profile.crickets ?? 0) >= GAME_COST;

export const freshCareStats = () => ({ games: 0, baths: 0, pets: 0, berriesFed: 0, sparkles: 0 });
const clamp = (n) => Math.max(0, Math.min(METER_MAX, n));

// The creature's care state, with the day's drift applied the first time it is looked at each day.
export function careOf(creature, today) {
  const c = (creature.care ??= { fed: METER_START, clean: METER_START, loved: METER_START, fun: METER_START, petTicks: 0, day: today, sparkleDay: null });
  if (c.day !== today) {
    const drift = c.day ? Math.max(0, Math.min(MAX_DAILY_DRIFT, daysBetween(c.day, today))) : 0;
    for (const m of MEASURES) c[m] = clamp(c[m] - drift);
    c.day = today;
  }
  return c;
}

export const average = (c) => MEASURES.reduce((n, m) => n + c[m], 0) / MEASURES.length;
export function moodOf(c) {
  if (MEASURES.every((m) => c[m] >= 4)) return 'sparkling';
  const a = average(c);
  return a >= 3 ? 'happy' : a >= 2 ? 'okay' : 'sad';
}

const stats = (profile) => (profile.care ??= freshCareStats());

export function giveBerry(profile, creature, today) {
  const c = careOf(creature, today);
  if ((profile.berries ?? 0) < 1) return { ok: false, reason: 'no-berries' };
  if (c.fed >= METER_MAX) return { ok: false, reason: 'full' };
  profile.berries -= 1; c.fed = clamp(c.fed + BERRY_FEED); stats(profile).berriesFed += 1;
  return { ok: true };
}

// One pet. Every PETS_PER_HEART pets fills the "loved" meter a notch.
export function pet(profile, creature, today) {
  const c = careOf(creature, today);
  stats(profile).pets += 1;
  c.petTicks = (c.petTicks ?? 0) + 1;
  if (c.petTicks >= PETS_PER_HEART) { c.petTicks = 0; c.loved = clamp(c.loved + 1); return { notch: true }; }
  return { notch: false };
}

export function finishBath(profile, creature, today) {
  const c = careOf(creature, today);
  c.clean = clamp(c.clean + BATH_GAIN); stats(profile).baths += 1;
  return { ok: true };
}

// `tierOverride` lets a game decide its own score tier; otherwise one point per GAME_BERRIES_PER caught.
// Costs GAME_COST crickets (never below 0) and refunds GAME_REFUND for a great game.
export function finishGame(profile, creature, today, caught, tierOverride) {
  const c = careOf(creature, today);
  c.fun = clamp(c.fun + GAME_GAIN); stats(profile).games += 1;
  const tier = tierOverride ?? Math.floor(caught / GAME_BERRIES_PER);
  const refund = tier >= GREAT_TIER ? GAME_REFUND : 0;
  const cost = Math.min(GAME_COST, profile.crickets ?? 0);
  profile.crickets = (profile.crickets ?? 0) - cost + refund;
  return { cost, refund };
}

// A creature that is happy on every meter brings a small gift, once per creature per day, and only once the
// trainer has practiced words today (care alone never earns crickets).
export function claimSparkle(profile, creature, today) {
  const c = careOf(creature, today);
  if (moodOf(c) !== 'sparkling' || c.sparkleDay === today) return { ok: false };
  if (!playedToday(profile.streak, today)) return { ok: false, reason: 'no-practice' };
  c.sparkleDay = today; profile.crickets += SPARKLE_CRICKETS; stats(profile).sparkles += 1;
  return { ok: true, crickets: SPARKLE_CRICKETS };
}
