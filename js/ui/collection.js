import { h } from './dom.js';
import { creatureSvg, eggSvg } from './art.js';
import { SPECIES, REGIONS, regionById, regionIndex, speciesById, stageName } from '../logic/species.js';
import { eggPrice } from '../logic/hatch.js';
import { buyEgg, hatchEgg, feed, tryEvolve, evolveHint, readyEggs, ownedSpecies, evolveContext } from '../logic/collection.js';
import { canEvolve, FEED_NEEDED } from '../logic/hatch.js';
import { playedToday } from '../logic/streak.js';
import { TROPHIES } from '../logic/trophies.js';

const back = (app) => h('button', { class: 'secondary', onclick: () => app.go('/home') }, 'Back to home');
const trophyLine = (ids) => (ids?.length ? h('p', { class: 'trophy-line' }, `🏆 New trophy: ${ids.map((id) => TROPHIES.find((t) => t.id === id).name).join(', ')}`) : null);

export function nestView(app, regionId) {
  const { store, audio } = app;
  const profile = app.profile;
  const region = regionById(regionId);
  if (!region || !profile.map.unlockedRegions.includes(regionId)) { queueMicrotask(() => app.go('/home')); return h('div'); }
  const i = regionIndex(regionId);
  const price = eggPrice(i);
  const root = h('section', { class: 'screen nest', 'data-region': regionId });
  const msg = h('div', { class: 'reveal-slot', role: 'status', 'aria-live': 'polite' });

  function draw() {
    const owned = ownedSpecies(profile);
    const here = SPECIES.filter((s) => s.region === regionId);
    const eggs = profile.eggs;
    root.replaceChildren(
      h('h1', {}, `${region.name} Nest`),
      h('p', { class: 'stats' }, `🦗 ${profile.crickets} crickets`),
      h('div', { class: 'panel' },
        h('p', {}, 'Eggs here hatch into one of these:'),
        h('div', { class: 'species-row' }, here.map((s) => h('figure', { class: 'mini' },
          h('span', { html: creatureSvg(s.id, 1, { size: 72, silhouette: !owned.has(s.id) }) }),
          h('figcaption', {}, owned.has(s.id) ? s.name : '???', h('small', {}, ` ${s.rarity}`))))),
        h('button', { class: 'primary', id: 'buy-egg', disabled: profile.crickets < price, onclick: () => {
          const r = buyEgg(profile, regionId);
          if (r.ok) { store.save(); audio.play('chime'); msg.replaceChildren(h('p', {}, 'You bought an egg! Spell words correctly to warm it up.')); }
          draw();
        } }, `Buy an egg · ${price} 🦗`),
        profile.crickets < price ? h('small', {}, ` You need ${price - profile.crickets} more crickets.`) : null),
      msg,
      h('h2', {}, 'Your eggs'),
      eggs.length ? h('ul', { class: 'egg-list' }, eggs.map((e) => {
        const ready = e.progress >= e.needed;
        return h('li', { class: `egg-card${ready ? ' ready' : ''}`, 'data-egg': e.id },
          h('span', { html: eggSvg(e.progress / e.needed) }),
          h('div', {}, h('strong', {}, `${regionById(e.regionId).name} egg`),
            h('div', {}, ready ? 'It is ready to hatch!' : `Warmed by ${e.progress} of ${e.needed} correct words`),
            h('progress', { max: e.needed, value: e.progress, 'aria-label': 'Egg warmth' }),
            ready ? h('button', { class: 'primary hatch', onclick: () => hatch(e.id) }, 'Hatch!') : null));
      })) : h('p', {}, 'No eggs yet.'),
      h('div', { class: 'actions' }, back(app), h('button', { class: 'secondary', onclick: () => app.go('/sanctuary') }, 'Sanctuary')));
  }

  function hatch(id) {
    const r = hatchEgg(profile, id, Math.random, app.today());
    if (!r.ok) return;
    store.save(); audio.play('hatch');
    const sp = speciesById(r.species);
    msg.replaceChildren(h('div', { class: 'reveal panel' },
      h('h2', {}, r.duplicate ? `Another ${sp.name}!` : `A new friend: ${sp.name}!`),
      h('span', { class: 'bounce', html: creatureSvg(r.species, 1, { size: 140 }) }),
      h('p', {}, sp.flavor),
      r.duplicate ? h('p', {}, `You already had one, so it became a friendship heart ❤️ and ${r.bonus} bonus crickets.`) : h('p', {}, 'It moved into your Sanctuary.'),
      trophyLine(r.trophies)));
    draw();
  }
  draw();
  return root;
}

export function sanctuaryView(app) {
  const { store, audio } = app;
  const profile = app.profile;
  const hungry = !playedToday(profile.streak, app.today());
  const root = h('section', { class: 'screen sanctuary' });
  const msg = h('div', { role: 'status', 'aria-live': 'polite' });

  function draw() {
    const ctx = evolveContext(profile);
    root.replaceChildren(
      h('h1', {}, 'Sanctuary'),
      h('p', { class: 'stats' }, `🦗 ${profile.crickets} crickets`),
      hungry ? h('p', { class: 'hungry' }, 'Your creatures are hungry! Practice to earn crickets to feed them.') : null,
      msg,
      h('ul', { class: 'creature-grid' }, profile.creatures.map((c) => {
        const need = FEED_NEEDED[c.stage];
        const evolvable = canEvolve(c, ctx);
        return h('li', { class: 'creature-card', 'data-creature': c.id, 'data-species': c.species },
          h('span', { class: hungry ? 'hungry-pet' : '', html: creatureSvg(c.species, c.stage, { size: 110, mood: hungry ? 'sad' : 'happy' }) }),
          h('strong', {}, stageName(c.species, c.stage)),
          c.hearts ? h('span', { class: 'hearts', 'aria-label': `${c.hearts} friendship hearts` }, '❤️'.repeat(Math.min(c.hearts, 5))) : null,
          need ? h('progress', { max: need, value: c.fed, 'aria-label': 'Fed' }) : null,
          h('small', {}, need ? `Fed ${c.fed}/${need}` : 'Fully evolved!'),
          need ? h('button', { class: 'feed', disabled: profile.crickets < 1 || c.fed >= need, onclick: () => {
            if (feed(profile, c.id, 10)) { store.save(); audio.play('chirp'); draw(); }
          } }, 'Feed 10 🦗') : null,
          evolvable ? h('button', { class: 'primary evolve', onclick: () => {
            const r = tryEvolve(profile, c.id, app.today());
            if (r.ok) { store.save(); audio.play('levelup'); msg.replaceChildren(h('div', { class: 'reveal panel' }, h('h2', {}, `${stageName(c.species, c.stage)} evolved!`), trophyLine(r.trophies))); draw(); }
          } }, 'Evolve!') : (need ? h('small', { class: 'hint' }, evolveHint(profile, c)) : null),
          h('button', { class: 'secondary buddy', 'aria-pressed': String(profile.companion === c.id), onclick: () => { profile.companion = c.id; store.save(); draw(); } },
            profile.companion === c.id ? '⭐ Practice buddy' : 'Make practice buddy'));
      })),
      h('div', { class: 'actions' }, back(app), h('button', { class: 'secondary', onclick: () => app.go('/book') }, 'Creature book')));
  }
  draw();
  return root;
}

export function bookView(app) {
  const profile = app.profile;
  const best = {};
  for (const c of profile.creatures) best[c.species] = Math.max(best[c.species] ?? 0, c.stage);
  const count = Object.keys(best).length;
  return h('section', { class: 'screen book' },
    h('h1', {}, 'Creature book'),
    h('p', {}, `${count} of ${SPECIES.length} discovered`),
    REGIONS.map((r) => h('div', { class: 'panel' }, h('h2', {}, r.name),
      h('div', { class: 'species-row' }, SPECIES.filter((s) => s.region === r.id).map((s) => {
        const stage = best[s.id];
        return h('figure', { class: `mini book-entry ${stage ? 'owned' : 'unknown'}`, 'data-species': s.id },
          h('span', { html: creatureSvg(s.id, stage ?? 1, { size: 96, silhouette: !stage }) }),
          h('figcaption', {}, h('strong', {}, stage ? s.name : '???'), h('small', {}, ` ${s.rarity}`),
            stage ? h('div', { class: 'flavor' }, s.flavor) : h('div', { class: 'flavor' }, `Lives in ${r.name}.`)));
      })))),
    h('div', { class: 'actions' }, back(app), h('button', { class: 'secondary', onclick: () => app.go('/sanctuary') }, 'Sanctuary')));
}

export { readyEggs };
