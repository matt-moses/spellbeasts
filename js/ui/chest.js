// The treasure chest screen: a closed chest, tap to open, the lid lifts and the reward appears.
import { h, icon, fill } from './dom.js';
import { creatureSvg } from './art.js';
import { confetti } from './confetti.js';
import { openChest, chestsPending } from '../logic/chest.js';
import { REGIONS, stageName } from '../logic/species.js';

const reduceMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const chestSvg = (open) => `<svg class="chest${open ? ' open' : ''}" viewBox="0 0 120 100" width="180" role="img" aria-label="${open ? 'Open treasure chest' : 'Closed treasure chest'}">
  <ellipse cx="60" cy="94" rx="46" ry="5" fill="rgba(0,0,0,.15)"/>
  <rect x="14" y="44" width="92" height="46" rx="6" fill="#a8693a" stroke="#5a3719" stroke-width="3"/>
  <rect x="14" y="60" width="92" height="6" fill="#ffc928" stroke="#b78a00" stroke-width="1.5"/>
  ${open ? '<rect x="20" y="46" width="80" height="12" rx="3" fill="#fff6c2"/>' : ''}
  <g class="lid" style="transform-origin:14px 44px"><path d="M14 44V34Q14 14 60 14T106 34V44Z" fill="#c07d46" stroke="#5a3719" stroke-width="3" stroke-linejoin="round"/><rect x="14" y="36" width="92" height="6" fill="#ffc928" stroke="#b78a00" stroke-width="1.5"/></g>
  <rect x="52" y="${open ? 50 : 38}" width="16" height="16" rx="3" fill="#ffd34d" stroke="#b78a00" stroke-width="2"/><circle cx="60" cy="${open ? 58 : 46}" r="2.5" fill="#5a3719"/></svg>`;

export function chestView(app) {
  const profile = app.profile, { audio } = app;
  const root = h('section', { class: 'screen chest-screen' });
  let timer = 0;
  app.cleanup.push(() => clearTimeout(timer));

  function closed() {
    const n = chestsPending(profile);
    if (n < 1) { fill(root, h('h1', {}, 'No chests waiting'), h('p', { class: 'lead' }, 'Master 5 more words to earn a treasure chest!'), h('button', { class: 'primary big', id: 'chest-home', onclick: () => app.go('/home') }, 'Back to home')); return; }
    fill(root, h('h1', {}, 'Treasure chest!'),
      h('p', { class: 'lead' }, n === 1 ? 'You earned a treasure chest for mastering words!' : `You have ${n} treasure chests waiting!`),
      h('div', { class: 'chest-stage', html: chestSvg(false) }),
      h('div', { class: 'actions' }, h('button', { class: 'primary big', id: 'chest-open', onclick: open }, icon('star'), 'Open it!'),
        h('button', { class: 'secondary', id: 'chest-later', onclick: () => app.go('/home') }, 'Later')));
    root.querySelector('#chest-open').focus();
  }
  function open() {
    const r = openChest(profile, { today: app.today() });
    if (!r.ok) return closed();
    app.store.save(); app.refreshStats?.();
    audio.play('levelup');
    const stage = root.querySelector('.chest-stage'); stage.innerHTML = chestSvg(true);
    root.querySelector('#chest-open').disabled = true;
    timer = setTimeout(() => reveal(r), reduceMotion() ? 0 : 700);
  }
  function reveal({ reward, left }) {
    confetti();
    const pet = reward.kind === 'treat' ? profile.creatures.find((c) => c.id === reward.creatureId) : null;
    const text = reward.kind === 'crickets' ? `${reward.amount} crickets!`
      : reward.kind === 'berries' ? `${reward.amount} berries for your pets!`
      : reward.kind === 'treat' ? `A yummy treat! ${stageName(reward.species, reward.stage)} is feeling wonderful.`
      : `A mystery egg from ${REGIONS.find((x) => x.id === reward.regionId)?.name ?? 'a faraway land'}! Practice words to warm it.`;
    const art = reward.kind === 'crickets' ? icon('cricket') : reward.kind === 'berries' ? icon('berry') : reward.kind === 'egg' ? icon('egg')
      : h('span', { html: creatureSvg(reward.species, reward.stage, { size: 96, pose: 'cheer' }) });
    fill(root, h('h1', {}, 'You found…'),
      h('div', { class: 'chest-stage', html: chestSvg(true) }),
      h('div', { class: 'panel chest-reward', id: 'chest-reward', 'data-kind': reward.kind, role: 'status' }, h('div', { class: 'chest-art' }, art), h('p', { class: 'lead' }, text)),
      h('div', { class: 'actions' },
        left > 0 ? h('button', { class: 'primary big', id: 'chest-next', onclick: closed }, `Open another (${left} left)`) : null,
        reward.kind === 'egg' ? h('button', { class: 'secondary', id: 'chest-nest', onclick: () => app.go('/nest') }, 'See my eggs') : null,
        h('button', { class: left > 0 ? 'secondary' : 'primary big', id: 'chest-home', onclick: () => app.go('/home') }, 'Back to home')));
  }
  closed();
  return root;
}
