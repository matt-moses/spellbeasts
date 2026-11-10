import { h } from './dom.js';
import { trophySvg } from './art.js';
import { TROPHIES } from '../logic/trophies.js';
import { arenaOn } from '../config.js';

export function trophiesView(app) {
  const earned = app.profile.trophies;
  const count = TROPHIES.filter((t) => earned[t.id]).length;
  return h('section', { class: 'screen trophy-case' },
    h('h1', {}, 'Trophy case'),
    h('p', {}, `${count} of ${TROPHIES.length} earned`),
    h('ul', { class: 'trophy-grid' }, TROPHIES.map((t) => {
      const got = !!earned[t.id];
      return h('li', { class: `trophy-card ${got ? 'earned' : 'locked'}`, 'data-trophy': t.id },
        h('span', { html: trophySvg(!got) }),
        h('strong', {}, got ? t.name : '???'),
        h('span', { class: 'cond' }, got ? t.desc : `To unlock: ${t.desc}${t.phase === 2 ? (arenaOn() ? ` (${Math.min(10, app.profile.battlesWon ?? 0)} of 10)` : ' (Arena)') : ''}`));
    })),
    h('button', { class: 'secondary', onclick: () => app.go('/home') }, 'Back to home'));
}
