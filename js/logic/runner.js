// "Hop Run": your creature runs along a meadow; tap to hop over logs and rocks. You have 3 hearts; a bump costs one
// (with a moment of safety after), and the run ends when they are gone. Pure and deterministic given the rng.
export const GRAVITY = 250, JUMP_V = 110;
export const PLAYER_X0 = 14, PLAYER_X1 = 19;        // the creature's hitbox (field is 100 units wide)
export const START_SPEED = 30, MAX_SPEED = 55;
export const GROUND_Y = 46, SPRITE_SIZE = 20, FEET = 0.96, HOP_SCALE = 0.55;   // field units: where the grass starts, creature size, feet position inside its box, y -> screen
// Where to translate the creature art so its feet stand exactly on the grass, and how far a hop of height y lifts it.
export const spriteTop = (size = SPRITE_SIZE) => GROUND_Y - size * FEET;
export const hopLift = (y) => y * HOP_SCALE;
export const HEARTS = 3, SAFE_TIME = 1.0;
export const BERRY_EVERY = 200;                     // one berry prize per this many points, up to 5

export function createRunner({ rng = Math.random } = {}) {
  return { t: 0, y: 0, vy: 0, dist: 0, speed: START_SPEED, hearts: HEARTS, safe: 0, obstacles: [], nextIn: 40, over: false, rng, hits: 0 };
}
export const jump = (g) => { if (!g.over && g.y === 0) g.vy = JUMP_V; };
export const score = (g) => Math.floor(g.dist);
export const prizeFor = (g) => Math.min(5, Math.floor(score(g) / BERRY_EVERY));

export function stepRunner(g, dt) {
  if (g.over) return g;
  g.t += dt;
  g.speed = Math.min(MAX_SPEED, START_SPEED + g.dist / 40);            // gets a little quicker as you go
  g.dist += g.speed * dt;
  if (g.y > 0 || g.vy > 0) { g.vy -= GRAVITY * dt; g.y = Math.max(0, g.y + g.vy * dt); if (g.y === 0) g.vy = 0; }
  g.safe = Math.max(0, g.safe - dt);
  for (const o of g.obstacles) o.x -= g.speed * dt;
  g.obstacles = g.obstacles.filter((o) => o.x + o.w > -5);
  g.nextIn -= g.speed * dt;
  if (g.nextIn <= 0) {
    const tall = g.rng() < 0.35;
    g.obstacles.push({ x: 105, w: tall ? 5 : 7, h: tall ? 14 : 9 + g.rng() * 3, kind: tall ? 'rock' : 'log', hit: false });
    g.nextIn = g.speed * (1.0 + g.rng() * 1.1) + 14;                    // always room to land and hop again
  }
  for (const o of g.obstacles) {
    if (o.hit || o.x > PLAYER_X1 || o.x + o.w < PLAYER_X0 || g.y >= o.h) continue;
    o.hit = true;
    if (g.safe === 0) { g.hearts -= 1; g.hits += 1; g.safe = SAFE_TIME; if (g.hearts <= 0) g.over = true; }
  }
  return g;
}
