import { createStore } from './platform/store.js';
import { createSpeaker } from './platform/speech.js';
import { createAudio } from './platform/audio.js';
import { localDateString } from './logic/leitner.js';
import { h, fill } from './ui/dom.js';
import { chrome } from './ui/chrome.js';
import { profilesView } from './ui/profiles.js';
import { homeView } from './ui/home.js';
import { practiceView } from './ui/practice.js';
import { summaryView } from './ui/summary.js';
import { trophiesView } from './ui/trophies.js';
import { wordsView } from './ui/words.js';
import { nestView, sanctuaryView, bookView } from './ui/collection.js';
import { parentView } from './ui/parent.js';
import { careView, playView } from './ui/care.js';
import { settingsView } from './ui/settings.js';
import { startUpdateWatch } from './ui/update.js';
import { BUILD_VERSION } from './logic/build.js';
import { loadAnalytics } from './platform/analytics.js';

const store = createStore();
store.load();

const app = {
  store, profileId: null, session: null, lastSummary: null, cleanup: [],
  speaker: createSpeaker({ getSettings: () => store.state.settings }),
  audio: createAudio({ getSettings: () => store.state.settings }),
  get profile() { return store.state.profiles[this.profileId]; },
  today: () => localDateString(),
  parentUnlocked: false,
  render: () => render(),
  go(route) { location.hash = `#${route}`; },
  choose(id) { this.profileId = id; this.go('/home'); },
};

const routes = { '': profilesView, home: homeView, practice: practiceView, summary: summaryView, trophies: trophiesView, words: wordsView, nest: nestView, sanctuary: sanctuaryView, book: bookView, parent: parentView, care: careView, play: playView, settings: settingsView };
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
  if (name !== '' && name !== 'parent' && name !== 'settings' && !app.profile) { app.go('/'); return; }
  if (name !== 'parent') app.parentUnlocked = false;
  if (name === 'practice' && !app.session) name = 'home';
  const route = name === '' ? '/' : `/${name}`;
  fill(root, ...banners(), name === '' || name === 'home' ? null : chrome(app), routes[name](app, arg));
  const first = root.querySelector('h1, input');
  document.title = 'Spellbeasts';
  if (route !== '/practice') first?.setAttribute('tabindex', '-1');
}
window.addEventListener('hashchange', render);
loadAnalytics();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { /* offline support is a bonus: the game works without it */ });
}
const foot = h('p', { class: 'version', id: 'version-stamp' }, `Version ${BUILD_VERSION}`);
document.body.append(foot);
// The offline cache serves the old version on a plain reload, so first let the new service worker install and take over.
async function applyUpdate() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      const swap = new Promise((res) => { navigator.serviceWorker.addEventListener('controllerchange', res, { once: true }); });
      await reg.update();
      await Promise.race([swap, new Promise((res) => setTimeout(res, 4000))]);
    }
  } catch { /* fall through to a plain reload */ }
  location.reload();
}
startUpdateWatch((v) => {
  document.body.append(h('div', { class: 'update-bar', role: 'status', id: 'update-bar' }, 'A new version is ready! ',
    h('button', { class: 'primary', id: 'update-reload', onclick: applyUpdate }, 'Reload')));
});
render();
