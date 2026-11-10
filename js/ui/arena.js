// The Arena of one land (PRD 12): see who lives here, pick one of your creatures, and start a battle.
import { h, fill } from './dom.js';
import { creatureSvg } from './art.js';
import { arenaOn } from '../config.js';
import { ARENA_LEVEL, arenaOpen, startBattle } from '../logic/battle.js';
import { companionOf, ownedSpecies } from '../logic/collection.js';
import { regionById, arenaSpeciesOf, speciesById, stageName } from '../logic/species.js';

export function arenaView(app, regionId) {
  const { store } = app;
  const profile = app.profile;
  const region = regionById(regionId);
  if (!arenaOn() || !region || !profile.map.unlockedRegions.includes(regionId)) { queueMicrotask(() => app.go('/home')); return h('div'); }
  const home = h('button', { class: 'secondary', id: 'arena-back', onclick: () => app.go('/home') }, 'Back to the map');
  if (!arenaOpen(profile)) {
    return h('section', { class: 'screen arena locked', 'data-region': regionId },
      h('h1', {}, `${region.name} Arena`),
      h('div', { class: 'panel' }, h('p', { class: 'arena-locked', role: 'status' }, `The Arena opens at level ${ARENA_LEVEL}. Keep practicing, you are level ${profile.level}!`)),
      h('div', { class: 'actions' }, home));
  }
  const list = store.state.wordLists[profile.activeListId] ?? store.state.wordLists.sample;
  const arenaId = arenaSpeciesOf(regionId), arena = speciesById(arenaId);
  const met = ownedSpecies(profile).has(arenaId);
  const wins = profile.arena?.wins?.[regionId] ?? 0;
  let chosen = (profile.creatures.find((c) => c.id === profile.arena?.lastCreature) ?? companionOf(profile)).id;
  const note = h('p', { class: 'note', role: 'status' });
  const picker = h('div', { class: 'arena-picker', role: 'radiogroup', 'aria-label': 'Choose your creature' });

  function drawPicker() {
    fill(picker, profile.creatures.map((c) => h('button', {
      type: 'button', class: `arena-pick${c.id === chosen ? ' chosen' : ''}`, role: 'radio', 'aria-checked': c.id === chosen ? 'true' : 'false', 'data-creature': c.id, 'data-species': c.species,
      onclick: () => { chosen = c.id; drawPicker(); picker.querySelector('.chosen')?.focus(); },
    }, h('span', { html: creatureSvg(c.species, c.stage, { size: 84, pose: c.id === chosen ? 'ready' : null }) }), h('span', { class: 'pick-name' }, stageName(c.species, c.stage)))));
  }
  drawPicker();

  function go() {
    const r = startBattle({ profile, list, today: app.today(), regionId, creatureId: chosen });
    if (!r.ok) { note.textContent = r.reason === 'words' ? 'Practice a few words first, then come back to battle.' : 'The Arena is not ready yet.'; return; }
    store.save();
    app.battle = r.battle;
    app.go(`/battle/${regionId}`);
  }

  return h('section', { class: 'screen arena', 'data-region': regionId },
    h('h1', {}, `${region.name} Arena`),
    h('div', { class: 'panel arena-who' },
      h('figure', { class: 'mini' }, h('span', { html: creatureSvg(arenaId, 1, { size: 96, silhouette: !met }) }), h('figcaption', {}, h('strong', {}, met ? arena.name : '???'))),
      h('div', {},
        h('p', {}, 'A wild creature is waiting here. Spell words to win. Every right answer is a hit, and three in a row is a special move!'),
        h('p', {}, met ? `${arena.name} is already your friend. Wild creatures still love a friendly battle.` : 'A special creature lives only in this Arena. Win battles to make friends with it.'),
        h('p', { class: 'small' }, `You can never lose a battle. Battles won here: ${wins}`))),
    h('h2', { id: 'pick-title' }, 'Who will battle?'),
    picker,
    h('div', { class: 'actions' }, h('button', { class: 'primary big', id: 'battle-go', onclick: go }, 'Battle!'), home),
    note);
}
