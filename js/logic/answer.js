// Strict answer checking (PRD 7.4): trim only; case-sensitive.
export function checkAnswer(typed, accepted) {
  const t = String(typed ?? '').trim();
  const correct = t === accepted;
  const caseOnly = !correct && t.length > 0 && t.toLowerCase() === accepted.toLowerCase();
  return { correct, caseOnly, typed: t, diff: diffLetters(t, accepted) };
}

// One entry per letter of the accepted word: ok=false where the typed letter differs or is missing.
export function diffLetters(typed, accepted) {
  return [...accepted].map((ch, i) => ({ ch, ok: typed[i] === ch }));
}
