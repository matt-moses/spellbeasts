// "Sky Flap": your creature flutters through gates in the clouds. Tap to flap; gravity does the rest. Touching a gate
// costs one of 3 hearts (with a moment of safety after); the floor and sky are soft. Pure and deterministic given the rng.
export const H = 60, FX = 22, HALF = 4, GATE_W = 9, GRAVITY = 150, FLAP_V = -50, MAX_FALL = 60, SPACING = 46, HEARTS = 3, SAFE_TIME = 1;
export const LEVELS = {
  easy: { gap: 30, speed: 22 },
  normal: { gap: 23, speed: 28 },
  hard: { gap: 18, speed: 35 },
};
export function createFlap({ rng = Math.random, difficulty = 'normal' } = {}) {
  const lv = LEVELS[difficulty] ?? LEVELS.normal;
  return { t: 0, y: H / 2, vy: 0, score: 0, hearts: HEARTS, safe: 0, gates: [], nextIn: 30, lastGap: H / 2, over: false, rng, gap: lv.gap, speed: lv.speed };
}
export const flap = (g) => { if (!g.over) g.vy = FLAP_V; };
export const prizeFor = (g) => { const per = g.gap >= 30 ? 6 : g.gap >= 23 ? 8 : 10; return Math.min(3, Math.floor(g.score / per)); };

export function stepFlap(g, dt) {
  if (g.over) return g;
  g.t += dt;
  g.vy = Math.min(MAX_FALL, g.vy + GRAVITY * dt);
  g.y = Math.max(HALF, Math.min(H - HALF, g.y + g.vy * dt));
  if (g.y === HALF && g.vy < 0) g.vy = 0;
  g.safe = Math.max(0, g.safe - dt);
  for (const o of g.gates) o.x -= g.speed * dt;
  g.gates = g.gates.filter((o) => o.x + GATE_W > -5);
  g.nextIn -= g.speed * dt;
  if (g.nextIn <= 0) {
    const lo = g.gap / 2 + 5, hi = H - g.gap / 2 - 5;
    const gapY = Math.max(lo, Math.min(hi, g.lastGap + (g.rng() * 2 - 1) * 20));   // never a jump the flapping can't follow
    g.lastGap = gapY;
    g.gates.push({ x: 105, gapY, passed: false, hit: false });
    g.nextIn = SPACING;
  }
  for (const o of g.gates) {
    if (!o.passed && o.x + GATE_W < FX - HALF) { o.passed = true; if (!o.hit) g.score += 1; }
    if (o.hit || o.x > FX + HALF || o.x + GATE_W < FX - HALF) continue;
    if (g.y - HALF < o.gapY - g.gap / 2 || g.y + HALF > o.gapY + g.gap / 2) {
      o.hit = true;
      if (g.safe === 0) { g.hearts -= 1; g.safe = SAFE_TIME; if (g.hearts <= 0) g.over = true; }
    }
  }
  return g;
}
