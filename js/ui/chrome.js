// Top bar on every screen except the picker and home: a big round Home button and the trainer chip.
import { h, icon } from './dom.js';
import { companionSvg } from './art.js';

export function chrome(app) {
  const p = app.profile;
  return h('div', { class: 'chrome' },
    h('button', { class: 'home-btn', id: 'home-btn', 'aria-label': 'Home', onclick: () => app.go(p ? '/home' : '/') }, icon('home')),
    p ? h('div', { class: 'chip' }, h('span', { html: companionSvg(p, { size: 38 }) }), p.name) : null);
}
