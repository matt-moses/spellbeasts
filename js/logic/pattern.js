// "Pattern Parrot": watch the pads light up, then repeat the pattern. Each round adds one more. A wrong pad ends the game;
// finishing the last round wins it. Score = rounds you repeated correctly.
export const PADS = 4;
export const LEVELS = {
  easy: { rounds: 5, show: 750 },
  normal: { rounds: 8, show: 560 },
  hard: { rounds: 12, show: 400 },
};
export function createPattern({ rng = Math.random, difficulty = 'normal' } = {}) {
  const lv = LEVELS[difficulty] ?? LEVELS.normal;
  return { seq: [], pos: 0, score: 0, phase: 'idle', rounds: lv.rounds, show: lv.show, rng, won: false };
}
// Start the next round: one more pad to remember. Returns the whole sequence to play back.
export function nextRound(g) {
  g.seq.push(Math.floor(g.rng() * PADS)); g.pos = 0; g.phase = 'input';
  return g.seq.slice();
}
// 'ignored' | 'ok' (keep going) | 'round' (round done) | 'win' (last round done) | 'wrong'
export function press(g, i) {
  if (g.phase !== 'input') return 'ignored';
  if (g.seq[g.pos] !== i) { g.phase = 'over'; return 'wrong'; }
  g.pos += 1;
  if (g.pos < g.seq.length) return 'ok';
  g.score += 1;
  if (g.score >= g.rounds) { g.phase = 'over'; g.won = true; return 'win'; }
  g.phase = 'idle'; return 'round';
}
export const prizeFor = (g) => (g.won ? 3 : g.score >= Math.ceil(g.rounds / 2) ? 2 : 1);
