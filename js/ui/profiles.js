import { h } from './dom.js';
import { creatureSvg, companionSvg } from './art.js';
import { freshProfile } from '../logic/storage-schema.js';
import { addStarter } from '../logic/collection.js';
import { STARTER_IDS, speciesById } from '../logic/species.js';

export function profilesView(app) {
  const { store } = app;
  const profiles = Object.entries(store.state.profiles);
  const root = h('section', { class: 'screen profiles' }, h('h1', {}, 'Spellbeasts'), h('p', { class: 'lead' }, 'Who is practicing today?'));

  const cards = h('div', { class: 'cards' });
  for (const [id, p] of profiles) {
    cards.append(h('button', { class: 'card', 'data-profile': id, onclick: () => app.choose(id) },
      h('span', { html: companionSvg(p, { size: 96 }) }), h('span', { class: 'card-name' }, p.name)));
  }
  root.append(cards);

  const form = h('form', { class: 'panel add-trainer', onsubmit: (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    if (!name) { form.elements.name.focus(); return; }
    const species = form.elements.starter.value;
    const id = `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
    const profile = freshProfile({ name, avatarSpecies: species });
    addStarter(profile, species);
    store.state.profiles[id] = profile;
    store.save();
    app.choose(id);
  } },
    h('h2', {}, profiles.length ? 'Add a trainer' : 'Create your trainer'),
    h('label', {}, 'Name ', h('input', { name: 'name', type: 'text', maxlength: 20, autocomplete: 'off', required: true })),
    h('fieldset', {}, h('legend', {}, 'Choose a starter'),
      STARTER_IDS.map((id, i) => h('label', { class: 'starter' },
        h('input', { type: 'radio', name: 'starter', value: id, checked: i === 0 }),
        h('span', { html: creatureSvg(id, 1, { size: 96 }) }), h('span', {}, speciesById(id).name)))),
    h('button', { type: 'submit', class: 'primary' }, 'Start'));
  root.append(form);
  return root;
}
