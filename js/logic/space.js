// "Star Drift" (Asteroids): your creature floats in space, turns, boosts and zaps space rocks. Big rocks split in two.
// Everything wraps round the edges. A bump costs a heart (then a moment of safety); clear a wave and a bigger one arrives.
export const F = 100, HEARTS = 3, SAFE_TIME = 1.6;
export const TURN = 3.6, THRUST = 42, DRAG = 0.55, MAX_SPEED = 44, BULLET_V = 72, BULLET_LIFE = 1.0, COOLDOWN = 0.3, SHIP_R = 2.6;
export const SIZES = { 3: 7, 2: 4.4, 1: 2.7 };                           // rock radius by size
export const LEVELS = {
  easy: { rocks: 3, speed: 0.7, hearts: 5, goal: 14 },
  normal: { rocks: 4, speed: 1, hearts: HEARTS, goal: 20 },
  hard: { rocks: 5, speed: 1.4, hearts: HEARTS, goal: 28 },
};
const wrap = (v) => ((v % F) + F) % F;
export function createSpace({ rng = Math.random, difficulty = 'normal' } = {}) {
  const lv = LEVELS[difficulty] ?? LEVELS.normal;
  const g = { t: 0, ship: { x: 50, y: 50, a: 0, vx: 0, vy: 0 }, bullets: [], rocks: [], wave: 0, score: 0, hearts: lv.hearts, maxHearts: lv.hearts, safe: 1, cool: 0, over: false, rng, base: lv.rocks, mul: lv.speed, goal: lv.goal };
  spawnWave(g);
  return g;
}
const rock = (g, x, y, size) => {
  const ang = g.rng() * Math.PI * 2, v = (9 + g.rng() * 8) * g.mul * (size === 1 ? 1.5 : size === 2 ? 1.2 : 1);
  return { x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, size, r: SIZES[size] };
};
function spawnWave(g) {
  g.wave += 1;
  const n = Math.min(8, g.base + g.wave - 1);
  for (let i = 0; i < n; i++) {
    let x, y, tries = 0;
    do { x = g.rng() * F; y = g.rng() * F; } while (Math.hypot(x - g.ship.x, y - g.ship.y) < 30 && ++tries < 30);
    g.rocks.push(rock(g, x, y, 3));
  }
}
export function fire(g) {
  if (g.over || g.cool > 0) return false;
  const { ship } = g, dx = Math.sin(ship.a), dy = -Math.cos(ship.a);
  g.bullets.push({ x: ship.x + dx * 5, y: ship.y + dy * 5, vx: dx * BULLET_V + ship.vx * 0.5, vy: dy * BULLET_V + ship.vy * 0.5, life: BULLET_LIFE });
  g.cool = COOLDOWN; return true;
}
// input: { left, right, thrust } booleans, held this frame.
export function stepSpace(g, dt, input = {}) {
  if (g.over) return g;
  const s = g.ship;
  g.t += dt; g.cool = Math.max(0, g.cool - dt); g.safe = Math.max(0, g.safe - dt);
  s.a += ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * TURN * dt;
  if (input.thrust) { s.vx += Math.sin(s.a) * THRUST * dt; s.vy -= Math.cos(s.a) * THRUST * dt; }
  const f = Math.exp(-DRAG * dt); s.vx *= f; s.vy *= f;
  const sp = Math.hypot(s.vx, s.vy); if (sp > MAX_SPEED) { s.vx *= MAX_SPEED / sp; s.vy *= MAX_SPEED / sp; }
  s.x = wrap(s.x + s.vx * dt); s.y = wrap(s.y + s.vy * dt);
  for (const r of g.rocks) { r.x = wrap(r.x + r.vx * dt); r.y = wrap(r.y + r.vy * dt); }
  for (const b of g.bullets) { b.x = wrap(b.x + b.vx * dt); b.y = wrap(b.y + b.vy * dt); b.life -= dt; }
  g.bullets = g.bullets.filter((b) => b.life > 0);
  const born = [];
  for (const b of g.bullets) {
    const r = g.rocks.find((q) => !q.dead && Math.hypot(q.x - b.x, q.y - b.y) <= q.r + 0.8);
    if (!r) continue;
    r.dead = true; b.life = 0; g.score += 1;
    if (r.size > 1) born.push(rock(g, r.x, r.y, r.size - 1), rock(g, r.x, r.y, r.size - 1));
  }
  g.bullets = g.bullets.filter((b) => b.life > 0);
  g.rocks = g.rocks.filter((r) => !r.dead).concat(born);
  if (g.safe === 0) {
    const hit = g.rocks.find((r) => Math.hypot(r.x - s.x, r.y - s.y) <= r.r + SHIP_R);
    if (hit) { g.hearts -= 1; g.safe = SAFE_TIME; g.bumped = (g.bumped ?? 0) + 1; if (g.hearts <= 0) g.over = true; }
  }
  if (!g.over && g.rocks.length === 0) spawnWave(g);
  return g;
}
export const prizeFor = (g) => Math.min(3, Math.floor(g.score / (g.goal / 2)));   // half the goal = 1, the goal = 2 (a great game), half as much again = 3
