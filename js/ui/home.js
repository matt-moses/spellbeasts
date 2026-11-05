import { h } from './dom.js';
import { blobSvg, starterById } from './art.js';
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

  return h('section', { class: 'screen home' },
    h('div', { class: 'hero' }, h('span', { html: blobSvg(starterById(profile.avatarSpecies).color) }),
      h('div', {}, h('h1', {}, `Hi, ${profile.name}!`),
        h('p', { class: 'stats' }, `Level ${lp.level} · 🦗 ${profile.crickets} crickets · `, h('span', { class: 'streak' }, `🔥 ${streak} day${streak === 1 ? '' : 's'} in a row`)),
        h('progress', { class: 'xpbar', max: lp.needed, value: lp.into, 'aria-label': `Experience: ${lp.into} of ${lp.needed}` }),
        h('small', {}, `${lp.into}/${lp.needed} XP to level ${lp.level + 1}`))),
    hungry ? h('p', { class: 'hungry', role: 'status' }, 'Your creatures are hungry! Practice to feed them.') : null,
    h('p', { class: 'due' }, `${due} word${due === 1 ? '' : 's'} due today · ${fresh} new word${fresh === 1 ? '' : 's'} to learn`),
    h('div', { class: 'actions' },
      h('button', { class: 'primary big', id: 'practice', onclick: () => start(false) }, 'Practice'),
      bonusBtn,
      h('button', { class: 'secondary', id: 'trophies', onclick: () => app.go('/trophies') }, `Trophies (${Object.keys(profile.trophies).length})`),
      h('button', { class: 'secondary', onclick: () => app.go('/') }, 'Switch trainer')),
    note);
}
