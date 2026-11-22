// "Caterpillar" (Snake): steer a hungry caterpillar to the berries. Each berry makes it longer. Running into yourself ends the
// game; on Easy the edges wrap round, on Normal and Hard the walls end it. Pure and deterministic given the rng.
export const COLS = 12, ROWS = 12;
export const LEVELS = {
  easy: { tick: 0.28, wrap: true, goal: 8 },
  normal: { tick: 0.2, wrap: false, goal: 10 },
  hard: { tick: 0.13, wrap: false, goal: 12 },
};
export const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
export function createSnake({ rng = Math.random, difficulty = 'normal' } = {}) {
  const lv = LEVELS[difficulty] ?? LEVELS.normal;
  const g = { cols: COLS, rows: ROWS, body: [{ x: 5, y: 6 }, { x: 4, y: 6 }, { x: 3, y: 6 }], dir: 'right', queued: null, food: null, score: 0, over: false, acc: 0, tick: lv.tick, wrap: lv.wrap, goal: lv.goal, rng };
  placeFood(g); return g;
}
function placeFood(g) {
  const taken = new Set(g.body.map((b) => b.y * g.cols + b.x));
  const free = []; for (let i = 0; i < g.cols * g.rows; i++) if (!taken.has(i)) free.push(i);
  if (!free.length) { g.food = null; g.over = true; return; }
  const k = free[Math.floor(g.rng() * free.length)]; g.food = { x: k % g.cols, y: Math.floor(k / g.cols) };
}
// Turn: ignored if it would reverse onto yourself. One queued turn is kept, so quick double taps still work.
export function turn(g, d) {
  if (!DIRS[d]) return false;
  const from = g.queued ?? g.dir;
  if (DIRS[d].x + DIRS[from].x === 0 && DIRS[d].y + DIRS[from].y === 0) return false;
  if (d === from) return false;
  if (g.queued == null) g.queued = d; else g.queued = d;
  return true;
}
export function move(g) {
  if (g.over) return g;
  if (g.queued) { g.dir = g.queued; g.queued = null; }
  const d = DIRS[g.dir], head = g.body[0];
  let x = head.x + d.x, y = head.y + d.y;
  if (g.wrap) { x = (x + g.cols) % g.cols; y = (y + g.rows) % g.rows; }
  else if (x < 0 || y < 0 || x >= g.cols || y >= g.rows) { g.over = true; return g; }
  const eats = g.food && g.food.x === x && g.food.y === y;
  const body = eats ? g.body : g.body.slice(0, -1);                      // the tail moves out of the way unless we just grew
  if (body.some((b) => b.x === x && b.y === y)) { g.over = true; return g; }
  g.body.unshift({ x, y });
  if (eats) { g.score += 1; placeFood(g); } else g.body.pop();
  return g;
}
export function stepSnake(g, dt) {
  g.acc += dt;
  while (g.acc >= g.tick && !g.over) { g.acc -= g.tick; move(g); }
  return g;
}
export const prizeFor = (g) => Math.min(3, Math.floor(g.score / (g.goal / 2)));   // half the goal = 1, the goal = 2 (a great game), half as much again = 3
