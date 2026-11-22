// "Critter Pop": critters peek out of nine holes; tap each one before it ducks back. A timed game with nothing to lose.
export const HOLES = 9;
export const LEVELS = {
  easy: { dur: 30, stay: 1.5, every: 1.05, goal: 10 },
  normal: { dur: 30, stay: 1.1, every: 0.8, goal: 16 },
  hard: { dur: 30, stay: 0.8, every: 0.6, goal: 24 },
};
export function createPop({ rng = Math.random, difficulty = 'normal' } = {}) {
  const lv = LEVELS[difficulty] ?? LEVELS.normal;
  return { t: 0, dur: lv.dur, stay: lv.stay, every: lv.every, goal: lv.goal, holes: Array.from({ length: HOLES }, () => ({ up: false, until: 0 })), nextAt: 0.6, score: 0, escaped: 0, done: false, rng };
}
export function stepPop(g, dt) {
  if (g.done) return g;
  g.t += dt;
  for (const h of g.holes) if (h.up && g.t >= h.until) { h.up = false; g.escaped += 1; }
  while (g.t >= g.nextAt && g.nextAt < g.dur) {
    const free = g.holes.map((h, i) => (h.up ? -1 : i)).filter((i) => i >= 0);
    if (free.length) { const h = g.holes[free[Math.floor(g.rng() * free.length)]]; h.up = true; h.until = g.nextAt + g.stay; }
    g.nextAt += g.every * (0.75 + g.rng() * 0.5);
  }
  if (g.t >= g.dur) { g.done = true; for (const h of g.holes) h.up = false; }
  return g;
}
export function whack(g, i) {
  const h = g.holes[i];
  if (g.done || !h?.up) return false;
  h.up = false; g.score += 1; return true;
}
export const prizeFor = (g) => Math.min(3, Math.floor((g.score / g.goal) * 2) + (g.score >= g.goal ? 1 : 0)); // half the goal = 1, the goal = 3
