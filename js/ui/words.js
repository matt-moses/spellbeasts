import { h, icon } from './dom.js';
import { masteredWords } from '../logic/collection.js';
import { MASTERY_DAYS } from '../logic/leitner.js';

export function wordsView(app) {
  const { store, speaker } = app;
  const profile = app.profile;
  const list = store.state.wordLists[profile.activeListId] ?? store.state.wordLists.sample;
  const words = masteredWords(profile, list);
  return h('section', { class: 'screen my-words' },
    h('h1', {}, 'My mastered words'),
    h('p', { id: 'words-count' }, `${words.length} of ${list.words.length} words mastered`),
    words.length
      ? h('ul', { class: 'word-grid' }, words.map((w) => h('li', {}, h('button', { type: 'button', class: 'word', 'aria-label': `${w}, tap to hear it`, onclick: () => speaker.speak(w) }, w))))
      : h('p', { id: 'words-empty' }, `No mastered words yet. Spell a word right on the first try on ${MASTERY_DAYS} different days and it will show up here!`),
    h('button', { class: 'secondary', onclick: () => app.go('/home') }, 'Back to home'));
}
