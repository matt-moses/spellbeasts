import { createStore } from './platform/store.js';
import { createSpeaker } from './platform/speech.js';
import { createAudio } from './platform/audio.js';
import { localDateString } from './logic/leitner.js';
import { h } from './ui/dom.js';
import { profilesView } from './ui/profiles.js';
import { homeView } from './ui/home.js';
import { practiceView } from './ui/practice.js';
import { summaryView } from './ui/summary.js';
import { trophiesView } from './ui/trophies.js';
import { nestView, sanctuaryView, bookView } from './ui/collection.js';

const store = createStore();
store.load();

const app = {
  store, profileId: null, session: null, lastSummary: null, cleanup: [],
  speaker: createSpeaker({ getSettings: () => store.state.settings }),
  audio: createAudio({ getSettings: () => store.state.settings }),
  get profile() { return store.state.profiles[this.profileId]; },
  today: () => localDateString(),
  go(route) { location.hash = `#${route}`; },
  choose(id) { this.profileId = id; this.go('/home'); },
};

const routes = { '': profilesView, home: homeView, practice: practiceView, summary: summaryView, trophies: trophiesView, nest: nestView, sanctuary: sanctuaryView, book: bookView };
const root = document.getElementById('app');

function banners() {
  const out = [];
  if (!store.persistent) out.push(h('p', { class: 'banner warn', role: 'status' }, "Progress won't be saved in this browser window."));
  if (store.warning) out.push(h('p', { class: 'banner warn', role: 'status' }, 'Saved data could not be read, so the game started fresh.', h('button', { onclick: () => { store.dismissWarning(); render(); } }, 'OK')));
  return out;
}

function render() {
  app.cleanup.splice(0).forEach((fn) => fn());
  let [name, arg] = location.hash.replace(/^#\/?/, '').split('/');
  if (!(name in routes)) name = '';
  if (name !== '' && !app.profile) { app.go('/'); return; }
  if (name === 'practice' && !app.session) name = 'home';
  const route = name === '' ? '/' : `/${name}`;
  root.replaceChildren(...banners(), routes[name](app, arg));
  const first = root.querySelector('h1, input');
  document.title = 'Spellbeasts';
  if (route !== '/practice') first?.setAttribute('tabindex', '-1');
}
window.addEventListener('hashchange', render);
render();
