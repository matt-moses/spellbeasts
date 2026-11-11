import { h, icon } from './dom.js';
import { companionSvg } from './art.js';
import { makeInteractive } from './pet.js';
import { trophySvg } from './art.js';
import { TROPHIES } from '../logic/trophies.js';
import { REGIONS, speciesById } from '../logic/species.js';
import { creatureSvg } from './art.js';
import { arenaOn } from '../config.js';
import { ARENA_LEVEL } from '../logic/battle.js';
import { startSession } from '../logic/session.js';

const CHAMPION_AT = 10;
// The result of a battle, shown above the usual practice summary.
function battleCard(app, b) {
  const name = speciesById(b.wild.species).name;
  const won = b.outcome === 'won', friend = won && b.prize.kind === 'befriend';
  const art = h('span', { class: 'battle-card-art', html: creatureSvg(b.wild.species, friend ? 1 : b.wild.stage, { size: 96, pose: friend ? 'smitten' : won ? 'cheer' : null }) });
  const text = friend ? `${name} is your new friend!` : won ? `The wild ${name} gave you a bag of ${b.prize.crickets} crickets.` : `The wild ${name} got away. You keep everything you earned!`;
  return h('div', { class: `panel battle-card ${friend ? 'befriended' : b.outcome}`, 'data-outcome': b.outcome, 'data-prize': b.prize?.kind ?? 'none', role: 'status' }, art,
    h('div', {}, h('h2', {}, won ? 'Battle won!' : 'It got away'), h('p', { class: 'battle-text' }, text),
      h('p', { class: 'small battle-count' }, b.battlesWon >= CHAMPION_AT ? `Battles won: ${b.battlesWon}` : `Battles won: ${b.battlesWon} of ${CHAMPION_AT} for the Champion trophy`),
      friend ? h('button', { class: 'secondary', id: 'see-friend', onclick: () => app.go('/book') }, 'See it in the Creature book') : null));
}

// Start another practice round: what is due first, then a bonus review of the trickiest words.
function playAgain(app, note) {
  const profile = app.profile, store = app.store;
  const list = store.state.wordLists[profile.activeListId] ?? store.state.wordLists.sample;
  const today = app.today();
  const s = startSession({ profile, list, today }) ?? startSession({ profile, list, today, bonus: true });
  if (!s) { note.textContent = 'No more words to practice right now. Come back later!'; return; }
  app.session = s;
  app.go('/practice');
}

export function summaryView(app) {
  const s = app.lastSummary;
  if (!s) { queueMicrotask(() => app.go('/home')); return h('div'); }
  const stars = s.misses === 0 ? 3 : s.misses <= 2 ? 2 : 1;
  const buddy = h('div', { class: 'summary-buddy', html: companionSvg(app.profile, { size: 120 }) });
  const buddyPet = makeInteractive(buddy, app, { name: app.profile.name, speak: true, label: 'Tap your practice buddy' });
  if (!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setTimeout(() => buddy.isConnected && buddy.classList.add('pet-hop'), 200);
  const again = h('p', { class: 'note', role: 'status' });
  const root = h('section', { class: 'screen summary' },
    h('h1', {}, s.battle?.outcome === 'won' ? 'You won the battle!' : s.misses === 0 ? 'Perfect flight!' : 'Great practice!'),
    buddy,
    s.battle ? battleCard(app, s.battle) : null,
    h('div', { class: 'stars', 'aria-label': `${stars} of 3 stars`, role: 'img' }, [1, 2, 3].map((n) => h('span', { class: n <= stars ? 'on' : 'off' }, icon('star')))),
    s.leveledUp ? h('p', { class: 'levelup', role: 'status' }, `Level up! You are now level ${s.level}.`) : null,
    h('ul', { class: 'results' },
      h('li', {}, `Spelled right first try: ${s.correctFirstTry} of ${s.words}`),
      h('li', {}, `Spelled right on a retry: ${s.correctRetry}`),
      h('li', {}, `Words to practice more: ${s.missedWords.length ? s.missedWords.length : 'none'}`),
      s.masteredNow.length ? h('li', {}, `Newly mastered: ${s.masteredNow.length}`) : null,
      s.steps ? h('li', {}, `Steps along the trail: ${s.steps}`) : null,
      h('li', {}, `Crickets earned: 🦗 ${s.crickets}`),
      h('li', {}, `XP earned: ${s.xp}`),
      s.berries ? h('li', {}, `Berries found: ${s.berries}`) : null),
    s.unlocked.length ? h('p', { class: 'region-unlocked', role: 'status' }, `🗺️ New region unlocked: ${s.unlocked.map((id) => REGIONS.find((r) => r.id === id).name).join(', ')}!`) : null,
    arenaOn() && s.startLevel < ARENA_LEVEL && s.level >= ARENA_LEVEL ? h('p', { class: 'region-unlocked arena-open', role: 'status' }, 'The Arena is open! Look for the Arena flags on the map to battle wild creatures.') : null,
    s.trophies.length ? h('div', { class: 'new-trophies' }, h('h2', {}, 'New trophies!'),
      h('ul', { class: 'trophy-grid' }, s.trophies.map((id) => { const t = TROPHIES.find((x) => x.id === id); return h('li', { class: 'trophy-card earned' }, h('span', { html: trophySvg(false) }), h('strong', {}, t.name), h('span', { class: 'cond' }, t.desc)); }))) : null,
    h('p', {}, `🔥 ${s.dayStreak} day${s.dayStreak === 1 ? '' : 's'} in a row`),
    s.battle ? null : h('button', { class: 'primary big', id: 'play-again', onclick: () => playAgain(app, again) }, icon('play'), 'Play again'),
    again,
    h('button', { class: s.battle ? 'primary big' : 'secondary', id: 'done', onclick: () => app.go('/home') }, 'Back to home'));
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
