import { h } from './dom.js';
import { STARTERS, blobSvg, starterById } from './art.js';
import { freshProfile } from '../logic/storage-schema.js';

export function profilesView(app) {
  const { store } = app;
  const profiles = Object.entries(store.state.profiles);
  const root = h('section', { class: 'screen profiles' }, h('h1', {}, 'Spellbeasts'), h('p', { class: 'lead' }, 'Who is practicing today?'));

  const cards = h('div', { class: 'cards' });
  for (const [id, p] of profiles) {
    cards.append(h('button', { class: 'card', 'data-profile': id, onclick: () => app.choose(id) },
      h('span', { html: blobSvg(starterById(p.avatarSpecies).color) }), h('span', { class: 'card-name' }, p.name)));
  }
  root.append(cards);

  const form = h('form', { class: 'panel add-trainer', onsubmit: (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    if (!name) { form.elements.name.focus(); return; }
    const species = form.elements.starter.value;
    const id = `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
    store.state.profiles[id] = freshProfile({ name, avatarSpecies: species });
    store.save();
    app.choose(id);
  } },
    h('h2', {}, profiles.length ? 'Add a trainer' : 'Create your trainer'),
    h('label', {}, 'Name ', h('input', { name: 'name', type: 'text', maxlength: 20, autocomplete: 'off', required: true })),
    h('fieldset', {}, h('legend', {}, 'Choose a starter'),
      STARTERS.map((s, i) => h('label', { class: 'starter' },
        h('input', { type: 'radio', name: 'starter', value: s.id, checked: i === 0 }),
        h('span', { html: blobSvg(s.color) }), h('span', {}, s.name)))),
    h('button', { type: 'submit', class: 'primary' }, 'Start'));
  root.append(form);
  return root;
}
