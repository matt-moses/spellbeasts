// Difficulty and high scores for the games. Both live on the profile, so each child keeps their own.
export const DIFFICULTIES = ['easy', 'normal', 'hard'];
export const DIFFICULTY_LABEL = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
// better: 'high' = a bigger number wins; 'low' = a smaller one does (Memory Match counts moves).
export const GAMES = {
  catch: { title: 'Berry Catch', unit: 'berries', better: 'high' },
  run: { title: 'Hop Run', unit: 'steps', better: 'high' },
  memory: { title: 'Memory Match', unit: 'moves', better: 'low' },
  flap: { title: 'Sky Flap', unit: 'gates', better: 'high' },
  pop: { title: 'Critter Pop', unit: 'critters', better: 'high' },
  pattern: { title: 'Pattern Parrot', unit: 'rounds', better: 'high' },
  patch: { title: 'Berry Patch', unit: 'seconds', better: 'low' },
  space: { title: 'Star Drift', unit: 'rocks', better: 'high' },
  snake: { title: 'Caterpillar', unit: 'berries', better: 'high' },
  hangman: { title: 'Hangman', unit: 'words', better: 'high' },
};
export const HANDS = ['left', 'right'];
export const handOf = (settings) => (HANDS.includes(settings?.hand) ? settings.hand : 'left');

export const difficultyOf = (profile) => (DIFFICULTIES.includes(profile?.gameDifficulty) ? profile.gameDifficulty : 'normal');
export function setDifficulty(profile, d) { if (DIFFICULTIES.includes(d)) profile.gameDifficulty = d; return difficultyOf(profile); }

export const bestOf = (profile, game, d) => profile?.gameBest?.[game]?.[d] ?? null;

// Record a finished game. A zero never counts as a best. Returns { best, previous, isNew }.
export function recordScore(profile, game, d, score) {
  const info = GAMES[game];
  if (!info || !DIFFICULTIES.includes(d) || !Number.isFinite(score)) return { best: null, previous: null, isNew: false };
  const previous = bestOf(profile, game, d);
  const beats = score > 0 && (previous == null || (info.better === 'low' ? score < previous : score > previous));
  if (beats) { profile.gameBest ??= {}; (profile.gameBest[game] ??= {})[d] = score; }
  return { best: beats ? score : previous, previous, isNew: beats };
}
export const bestText = (profile, game, d) => { const b = bestOf(profile, game, d); return b == null ? 'No best yet' : `Best: ${b} ${GAMES[game].unit}`; };
