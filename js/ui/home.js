import { h, icon } from './dom.js';
import { companionSvg } from './art.js';
import { mapSection } from './map.js';
import { makeInteractive } from './pet.js';
import { helpButton } from './help.js';
import { readyEggs, companionOf } from '../logic/collection.js';
import { isDue } from '../logic/leitner.js';
import { levelProgress } from '../logic/rewards.js';
import { startSession } from '../logic/session.js';
import { displayStreak, playedToday } from '../logic/streak.js';

export function homeView(app) {
  const { store } = app;
  const profile = app.profile;
  const list = store.state.wordLists[profile.activeListId] ?? store.state.wordLists.sample;
  const stats = profile.wordStats[profile.activeListId] ?? {};
  const today = app.today();
  const due = list.words.filter((w) => isDue(stats[w.word], today)).length;
  const fresh = list.words.filter((w) => !stats[w.word] || stats[w.word].attempts === 0).length;
  const lp = levelProgress(profile.xp);
  const streak = displayStreak(profile.streak, today);
  const hungry = !playedToday(profile.streak, today);
  const note = h('p', { class: 'note', role: 'status' });

  function start(bonus) {
    const s = startSession({ profile, list, today, bonus });
    if (!s) {
      if (!bonus) { note.textContent = 'Nothing is due today. Try a bonus review of your trickiest words!'; bonusBtn.hidden = false; }
      else note.textContent = 'Practice a few words first, then come back for a bonus review.';
      return;
    }
    app.session = s;
    app.go('/practice');
  }
  const bonusBtn = h('button', { class: 'secondary', hidden: true, onclick: () => start(true) }, 'Bonus review');

  const cricketsPill = h('span', { class: 'pill gold' });
  const fillCrickets = () => cricketsPill.replaceChildren(...[h('span', {}, '🦗'), ` ${profile.crickets} crickets`]);
  fillCrickets();
  app.refreshStats = fillCrickets;

  const buddy = h('span', { class: `podium${hungry ? ' hungry-pet' : ''}`, html: companionSvg(profile, { size: 110, mood: hungry ? 'sad' : 'happy' }) });
  makeInteractive(buddy, app, { name: profile.name, speak: true, label: 'Tap your practice buddy' });
  return h('section', { class: 'screen home' },
    helpButton(app, 'floating'),
    h('div', { class: 'hero' },
      buddy,
      h('div', {},
        h('h1', {}, `Hi, ${profile.name}!`),
        h('div', { class: 'stats' }, h('span', { class: 'pill level' }, `Level ${lp.level}`), ' ', cricketsPill, ' ',
          h('span', { class: 'pill streak' }, '🔥', ` ${streak} day${streak === 1 ? '' : 's'} in a row`), ' ',
          h('span', { class: 'pill berries', id: 'berries-pill' }, '🍓', ` ${profile.berries ?? 0} berries`)),
        h('progress', { class: 'xpbar', max: lp.needed, value: lp.into, 'aria-label': `Experience: ${lp.into} of ${lp.needed}` }),
        h('small', {}, ` ${lp.into}/${lp.needed} XP to level ${lp.level + 1}`))),
    readyEggs(profile).length ? h('p', { class: 'bubble ready-egg', role: 'status' }, '🥚', ' An egg is ready to hatch!') : null,
    hungry ? h('p', { class: 'bubble hungry', role: 'status' }, 'Your creatures are hungry! Practice to feed them.') : null,
    Object.keys(store.state.wordLists).length > 1 ? h('p', { class: 'small', id: 'list-name' }, `Word list: ${list.name}`) : null,
    h('p', { class: 'due' }, `${due} word${due === 1 ? '' : 's'} due today · ${fresh} new word${fresh === 1 ? '' : 's'} to learn`),
    h('div', { class: 'actions' },
      h('button', { class: 'primary big', id: 'practice', onclick: () => start(false) }, icon('play'), 'Practice'),
      bonusBtn),
    note,
    mapSection(app),
    h('div', { class: 'tiles' },
      h('button', { class: 'tile t-pink', id: 'care-tile', onclick: () => { const c = companionOf(profile); app.go(c ? `/care/${c.id}` : '/sanctuary'); } }, icon('heart'), 'Care & play'),
      h('button', { class: 'tile t-yellow', id: 'sanctuary', onclick: () => app.go('/sanctuary') }, icon('paw'), 'Sanctuary'),
      h('button', { class: 'tile t-blue', id: 'book', onclick: () => app.go('/book') }, icon('book'), 'Creature book'),
      h('button', { class: 'tile t-pink', id: 'trophies', onclick: () => app.go('/trophies') }, icon('trophy'), `Trophies (${Object.keys(profile.trophies).length})`),
      h('button', { class: 'tile t-grey', id: 'settings-link', onclick: () => app.go('/settings') }, icon('speaker'), 'Settings'),
      h('button', { class: 'tile t-grey', id: 'parent-link', onclick: () => app.go('/parent') }, icon('lock'), 'Parent area'),
      h('button', { class: 'tile t-grey', onclick: () => app.go('/') }, icon('home'), 'Switch trainer')));
}
