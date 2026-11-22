// "Berry Patch" (Minesweeper): tap tiles to dig. A number tells how many skunks hide in the 8 tiles around it. Dig up every
// safe tile to win. Hitting a skunk costs one of 3 hearts and the skunk stays marked; the first tap is always safe.
export const HEARTS = 3;
export const LEVELS = {
  easy: { cols: 5, rows: 5, skunks: 3 },
  normal: { cols: 6, rows: 6, skunks: 6 },
  hard: { cols: 8, rows: 8, skunks: 10 },
};
export function createPatch({ rng = Math.random, difficulty = 'normal' } = {}) {
  const lv = LEVELS[difficulty] ?? LEVELS.normal;
  const tiles = Array.from({ length: lv.cols * lv.rows }, (_, i) => ({ index: i, skunk: false, near: 0, state: 'hidden' }));   // hidden | open | flag | boom
  return { ...lv, tiles, placed: false, hearts: HEARTS, t: 0, over: false, won: false, rng };
}
export const neighbors = (g, i) => {
  const x = i % g.cols, y = Math.floor(i / g.cols), out = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = x + dx, ny = y + dy;
    if ((dx || dy) && nx >= 0 && ny >= 0 && nx < g.cols && ny < g.rows) out.push(ny * g.cols + nx);
  }
  return out;
};
function place(g, safe) {
  const ok = new Set([safe, ...neighbors(g, safe)]);                 // the first tap and its ring are clear, so it opens up
  const spots = g.tiles.map((t) => t.index).filter((i) => !ok.has(i));
  if (spots.length < g.skunks) spots.push(...[...ok].filter((i) => i !== safe));
  for (let n = 0; n < g.skunks; n++) { const k = n + Math.floor(g.rng() * (spots.length - n)); [spots[n], spots[k]] = [spots[k], spots[n]]; g.tiles[spots[n]].skunk = true; }
  g.tiles.forEach((t) => { t.near = neighbors(g, t.index).filter((j) => g.tiles[j].skunk).length; });
  g.placed = true;
}
export const safeLeft = (g) => g.tiles.filter((t) => !t.skunk && t.state !== 'open').length;
// Returns 'ignored' | 'open' | 'boom' | 'win'.
export function dig(g, i) {
  const t = g.tiles[i];
  if (!t || g.over || t.state === 'open' || t.state === 'flag' || t.state === 'boom') return 'ignored';
  if (!g.placed) place(g, i);
  if (t.skunk) {
    t.state = 'boom'; g.hearts -= 1;
    if (g.hearts <= 0) { g.over = true; g.tiles.forEach((x) => { if (x.skunk && x.state === 'hidden') x.state = 'boom'; }); }
    return 'boom';
  }
  const stack = [i];
  while (stack.length) {
    const c = g.tiles[stack.pop()];
    if (c.state !== 'hidden' && c.state !== 'flag') continue;
    c.state = 'open';
    if (c.near === 0) stack.push(...neighbors(g, c.index));
  }
  if (safeLeft(g) === 0) { g.over = true; g.won = true; return 'win'; }
  return 'open';
}
export function flag(g, i) {
  const t = g.tiles[i];
  if (!t || g.over || (t.state !== 'hidden' && t.state !== 'flag')) return false;
  t.state = t.state === 'flag' ? 'hidden' : 'flag'; return true;
}
export const score = (g) => Math.max(1, Math.round(g.t));              // seconds: a lower time is a better score
// A win always pays back; fewer bumps just makes it brighter.
export const prizeFor = (g) => (!g.won ? 0 : g.hearts >= 2 ? 3 : 2);
