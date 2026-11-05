// Word-list parser (PRD 6.3). Line: word | part of speech | definition | sentence (optional) | say it like (optional).
// The 5th field works with | and tab separators (a comma list can add it later in the editor).
export function detectSeparator(lines) {
  if (lines.some((l) => l.includes('\t'))) return '\t';
  if (lines.some((l) => l.includes('|'))) return '|';
  return ',';
}

function splitLine(line, sep) {
  let f = line.split(sep).map((x) => x.trim());
  if (sep === ',' && f.length > 4) f = [f[0], f[1], f.slice(2, -1).join(', '), f[f.length - 1]]; // commas inside definition
  return f;
}

// existing: array of word strings already in the list (used for duplicates in 'add' mode).
export function parseWordList(text, { existing = [] } = {}) {
  const raw = String(text ?? '').split(/\r?\n/);
  const content = raw.map((l, i) => ({ l, n: i + 1 })).filter(({ l }) => l.trim() && !l.trim().startsWith('#'));
  const separator = detectSeparator(content.map((c) => c.l));
  const words = [], errors = [];
  const seen = new Set(existing);
  for (const { l, n } of content) {
    const [word = '', partOfSpeech = '', definition = '', sentence = '', sayAs = ''] = splitLine(l, separator);
    if (!word) { errors.push({ line: n, message: 'Missing word' }); continue; }
    if (seen.has(word)) { errors.push({ line: n, message: `Duplicate word "${word}"` }); continue; }
    seen.add(word);
    const rec = { id: word, word, partOfSpeech, definition };
    if (sentence) rec.sentence = sentence;
    if (sayAs) rec.sayAs = sayAs;
    words.push(rec);
  }
  return { words, errors, separator };
}

// mode: 'replace' | 'add'. Add mode skips words already present (parse with `existing` to report them).
export function mergeWords(current, parsed, mode) {
  if (mode === 'replace') return [...parsed];
  const have = new Set(current.map((w) => w.word));
  return [...current, ...parsed.filter((w) => !have.has(w.word))];
}

// Keep progress only for words that remain (matched by exact word).
export function pruneStats(stats, words) {
  const keep = new Set(words.map((w) => w.word));
  return Object.fromEntries(Object.entries(stats).filter(([w]) => keep.has(w)));
}
