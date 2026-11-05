// Optional per-word pronunciation: `sayAs` is what the voice reads instead of the real spelling (e.g. "laffter").
// It never changes what the player must type.
export const spokenWord = (rec) => (rec?.sayAs?.trim() ? rec.sayAs.trim() : rec?.word ?? '');

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// A sentence read aloud uses the same pronunciation for the word wherever it appears (whole word, any capitals).
export function spokenSentence(rec) {
  const say = rec?.sayAs?.trim();
  if (!rec?.sentence) return '';
  if (!say) return rec.sentence;
  return rec.sentence.replace(new RegExp(`\\b${escape(rec.word)}\\b`, 'gi'), say);
}
