// "Berry Catch": berries fall, you slide your creature left and right to catch them. No lives, no losing:
// you just catch as many as you can. Pure and deterministic given the rng and the player's positions.
export const FIELD = 100;                 // the playfield is 100 x 100 units
export const CATCH_Y = 86, FLOOR_Y = 104; // berries are catchable between these heights
export const HALF_WIDTH = 12;             // how far from the creature's centre a berry still counts
export const FALL_SPEED = 30;             // units per second
export const SPAWN_EVERY = 0.9;           // seconds between berries

export function createCatchGame({ rng = Math.random, count = 15 } = {}) {
  const items = Array.from({ length: count }, (_, i) => ({ id: i, x: 8 + rng() * 84, y: -6, at: i * SPAWN_EVERY, state: 'waiting', golden: rng() < 0.15 }));
  return { t: 0, px: 50, items, caught: 0, missed: 0, done: false };
}

export function stepCatchGame(g, dt, px) {
  if (g.done) return g;
  g.px = Math.max(HALF_WIDTH / 2, Math.min(FIELD - HALF_WIDTH / 2, px));
  g.t += dt;
  for (const it of g.items) {
    if (it.state === 'waiting' && g.t >= it.at) it.state = 'falling';
    if (it.state !== 'falling') continue;
    it.y += FALL_SPEED * dt;
    if (it.y >= CATCH_Y && it.y <= FLOOR_Y && Math.abs(it.x - g.px) <= HALF_WIDTH) { it.state = 'caught'; g.caught += it.golden ? 2 : 1; }
    else if (it.y > FLOOR_Y) { it.state = 'missed'; g.missed += 1; }
  }
  g.done = g.items.every((it) => it.state === 'caught' || it.state === 'missed');
  return g;
}
export const maxScore = (g) => g.items.reduce((n, it) => n + (it.golden ? 2 : 1), 0);
