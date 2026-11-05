import { h } from './dom.js';

export function summaryView(app) {
  const s = app.lastSummary;
  if (!s) { queueMicrotask(() => app.go('/home')); return h('div'); }
  const right = s.correctFirstTry + s.correctRetry;
  return h('section', { class: 'screen summary' },
    h('h1', {}, s.misses === 0 ? 'Perfect flight!' : 'Great practice!'),
    s.leveledUp ? h('p', { class: 'levelup', role: 'status' }, `Level up! You are now level ${s.level}.`) : null,
    h('ul', { class: 'results' },
      h('li', {}, `Spelled right first try: ${s.correctFirstTry} of ${s.words}`),
      h('li', {}, `Spelled right on a retry: ${s.correctRetry}`),
      h('li', {}, `Words to practice more: ${s.missedWords.length ? s.missedWords.length : 'none'}`),
      s.masteredNow.length ? h('li', {}, `Newly mastered: ${s.masteredNow.length}`) : null,
      h('li', {}, `Crickets earned: 🦗 ${s.crickets}`),
      h('li', {}, `XP earned: ${s.xp}`)),
    right === 0 ? null : null,
    h('button', { class: 'primary big', id: 'done', onclick: () => app.go('/home') }, 'Back to home'));
}
