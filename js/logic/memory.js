// "Memory Match": flip two cards at a time to find the matching pairs. No timer, no way to lose.
export function createMemory({ pairs, rng = Math.random }) {
  const cards = pairs.flatMap((id, i) => [{ pair: i, id, state: 'down' }, { pair: i, id, state: 'down' }]);
  for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
  cards.forEach((c, i) => { c.index = i; });
  return { cards, moves: 0, up: [], mismatch: null, done: false, pairCount: pairs.length };
}
// Flip card i. Returns 'ignored' | 'first' | 'match' | 'mismatch'. After a mismatch call settle() to turn them back.
export function flip(g, i) {
  const c = g.cards[i];
  if (!c || g.done || g.mismatch || c.state !== 'down') return 'ignored';
  c.state = 'up'; g.up.push(c);
  if (g.up.length < 2) return 'first';
  g.moves += 1;
  const [a, b] = g.up; g.up = [];
  if (a.pair === b.pair) {
    a.state = b.state = 'matched';
    g.done = g.cards.every((x) => x.state === 'matched');
    return 'match';
  }
  g.mismatch = [a, b];
  return 'mismatch';
}
export function settle(g) { if (g.mismatch) { g.mismatch.forEach((c) => { c.state = 'down'; }); g.mismatch = null; } }
// 3 berries for a near-perfect game, 2 for a good one, 1 for finishing.
export const prizeFor = (g) => (g.moves <= g.pairCount + 2 ? 3 : g.moves <= g.pairCount * 2 ? 2 : 1);
