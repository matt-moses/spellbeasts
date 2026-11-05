import { h } from './dom.js';
import { trophySvg } from './art.js';
import { TROPHIES } from '../logic/trophies.js';

export function summaryView(app) {
  const s = app.lastSummary;
  if (!s) { queueMicrotask(() => app.go('/home')); return h('div'); }
  const root = h('section', { class: 'screen summary' },
    h('h1', {}, s.misses === 0 ? 'Perfect flight!' : 'Great practice!'),
    s.leveledUp ? h('p', { class: 'levelup', role: 'status' }, `Level up! You are now level ${s.level}.`) : null,
    h('ul', { class: 'results' },
      h('li', {}, `Spelled right first try: ${s.correctFirstTry} of ${s.words}`),
      h('li', {}, `Spelled right on a retry: ${s.correctRetry}`),
      h('li', {}, `Words to practice more: ${s.missedWords.length ? s.missedWords.length : 'none'}`),
      s.masteredNow.length ? h('li', {}, `Newly mastered: ${s.masteredNow.length}`) : null,
      h('li', {}, `Crickets earned: 🦗 ${s.crickets}`),
      h('li', {}, `XP earned: ${s.xp}`)),
    s.trophies.length ? h('div', { class: 'new-trophies' }, h('h2', {}, 'New trophies!'),
      h('ul', { class: 'trophy-grid' }, s.trophies.map((id) => { const t = TROPHIES.find((x) => x.id === id); return h('li', { class: 'trophy-card earned' }, h('span', { html: trophySvg(false) }), h('strong', {}, t.name), h('span', { class: 'cond' }, t.desc)); }))) : null,
    h('p', {}, `🔥 ${s.dayStreak} day${s.dayStreak === 1 ? '' : 's'} in a row`),
    h('button', { class: 'primary big', id: 'done', onclick: () => app.go('/home') }, 'Back to home'));
  if (s.leveledUp) {
    app.audio.play('levelup');
    const ok = h('button', { class: 'primary big', id: 'levelup-ok', onclick: () => { overlay.remove(); root.querySelector('h1').focus(); } }, 'Keep going!');
    const overlay = h('div', { class: 'levelup-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Level up' },
      h('div', { class: 'levelup-card' }, h('p', { class: 'burst', 'aria-hidden': 'true' }, '🎉'), h('h2', {}, `Level ${s.level}!`), h('p', {}, 'You leveled up! New things are waiting.'), ok));
    root.append(overlay);
    queueMicrotask(() => ok.focus());
  } else if (s.trophies.length) app.audio.play('chime');
  return root;
}
