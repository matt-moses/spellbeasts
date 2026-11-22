// "Hangman": guess the letters of a word from the trainer's own list before the hearts run out. Three words a game;
// the score is how many you solved. Lives are per word. Pure and deterministic given the rng.
export const ROUNDS = 3;
export const LEVELS = {
  easy: { lives: 8, min: 3, max: 6, hint: true },
  normal: { lives: 6, min: 5, max: 8, hint: true },
  hard: { lives: 5, min: 7, max: 14, hint: false },
};
export const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const letterSet = (w) => [...new Set(w.toLowerCase().split('').filter((c) => LETTERS.includes(c)))];

// words: [{ word, definition }] from the active list.
export function createHangman({ words, rng = Math.random, difficulty = 'normal' } = {}) {
  const lv = LEVELS[difficulty] ?? LEVELS.normal;
  const usable = words.filter((w) => letterSet(w.word).length >= 2);
  const fit = usable.filter((w) => w.word.length >= lv.min && w.word.length <= lv.max);
  const pool = (fit.length >= ROUNDS ? fit : usable).slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const g = { picks: pool.slice(0, ROUNDS), i: 0, maxLives: lv.lives, hintOn: lv.hint, solved: 0, over: false, status: 'playing', entry: null, guessed: [], lives: lv.lives, hintShown: lv.hint };
  if (!g.picks.length) { g.over = true; return g; }
  load(g); return g;
}
function load(g) { g.entry = g.picks[g.i]; g.guessed = []; g.lives = g.maxLives; g.status = 'playing'; g.hintShown = g.hintOn; }
// The word as shown: guessed letters revealed, anything that isn't a letter (a hyphen, a space) always shown.
export const shown = (g, reveal = false) => g.entry.word.split('').map((c) => (!LETTERS.includes(c.toLowerCase()) || reveal || g.guessed.includes(c.toLowerCase()) ? c : null));
// 'ignored' | 'hit' | 'miss' | 'solved' | 'failed'. After solved/failed call advance().
export function guess(g, letter) {
  const l = String(letter).toLowerCase();
  if (g.over || g.status !== 'playing' || !LETTERS.includes(l) || g.guessed.includes(l)) return 'ignored';
  g.guessed.push(l);
  if (!letterSet(g.entry.word).includes(l)) { g.lives -= 1; if (g.lives <= 0) { g.status = 'failed'; return 'failed'; } return 'miss'; }
  if (letterSet(g.entry.word).every((c) => g.guessed.includes(c))) { g.status = 'solved'; g.solved += 1; return 'solved'; }
  return 'hit';
}
// Move on to the next word; returns false when the game is finished.
export function advance(g) {
  if (g.i + 1 >= g.picks.length) { g.over = true; return false; }
  g.i += 1; load(g); return true;
}
export const prizeFor = (g) => g.solved;                                   // 3 solved = 3, 2 = 2 (a great game), 1 = 1
