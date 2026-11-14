import { createStore } from './platform/store.js';
import { createSpeaker } from './platform/speech.js';
import { createAudio } from './platform/audio.js';
import { localDateString } from './logic/leitner.js';
import { h, fill } from './ui/dom.js';
import { chrome } from './ui/chrome.js';
import { profilesView } from './ui/profiles.js';
import { homeView } from './ui/home.js';
import { practiceView } from './ui/practice.js';
import { battleView } from './ui/battle.js';
import { arenaView } from './ui/arena.js';
import { summaryView } from './ui/summary.js';
import { trophiesView } from './ui/trophies.js';
import { wordsView } from './ui/words.js';
import { learnView } from './ui/learn.js';
import { SPELL_MASTER_ENABLED, arenaOn } from './config.js';
import { nestView, sanctuaryView, bookView } from './ui/collection.js';
import { parentView } from './ui/parent.js';
import { careView, playView } from './ui/care.js';
import { settingsView } from './ui/settings.js';
import { startUpdateWatch } from './ui/update.js';
import { BUILD_VERSION } from './logic/build.js';
import { addTime, isPracticeRoute, IDLE_MS } from './logic/playtime.js';
import { loadAnalytics } from './platform/analytics.js';

const store = createStore();
store.load();

const app = {
  store, profileId: null, session: null, battle: null, lastSummary: null, cleanup: [],
  speaker: createSpeaker({ getSettings: () => store.state.settings }),
  audio: createAudio({ getSettings: () => store.state.settings }),
  get profile() { return store.state.profiles[this.profileId]; },
  today: () => localDateString(),
  parentUnlocked: false,
  render: () => render(),
  go(route) { location.hash = `#${route}`; },
  choose(id) { this.profileId = id; this.battle = null; this.go('/home'); },
};

const routes = { '': profilesView, home: homeView, practice: practiceView, summary: summaryView, trophies: trophiesView, words: wordsView, ...(SPELL_MASTER_ENABLED ? { learn: learnView } : {}), nest: nestView, sanctuary: sanctuaryView, book: bookView, parent: parentView, care: careView, play: playView, settings: settingsView, ...(arenaOn() ? { arena: arenaView, battle: battleView } : {}) };
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
  else flushTime();                                  // the Parent area reads and exports state: keep storage in step with memory
  if (name === 'practice' && !app.session) name = 'home';
  if (name === 'battle' && !app.battle) name = arg ? 'arena' : 'home';
  const route = name === '' ? '/' : `/${name}`;
  fill(root, ...banners(), name === '' || name === 'home' ? null : chrome(app), routes[name](app, arg));
  const first = root.querySelector('h1, input');
  document.title = 'Spellbeasts';
  if (route !== '/practice' && route !== '/battle') first?.setAttribute('tabindex', '-1');
}
window.addEventListener('hashchange', render);

// Time in the game, and (separately) time on word practice, per trainer. Counts only while the tab is visible and the
// player has touched something in the last IDLE_MS. Stored on the profile; saved every 15 s and when the tab is hidden.
let lastTick = Date.now(), lastInput = lastTick, lastSave = lastTick, unsaved = false;
for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, () => { lastInput = Date.now(); }, { passive: true, capture: true });
function trackTime() {
  const now = Date.now(), elapsed = now - lastTick;
  lastTick = now;
  const route = location.hash.replace(/^#\/?/, '').split('/')[0];
  if (document.hidden || !app.profile || now - lastInput > IDLE_MS || route === 'parent') return;
  const counted = addTime(app.profile, elapsed, { practicing: isPracticeRoute(route), date: localDateString() });
  if (counted) unsaved = true;
  if (unsaved && now - lastSave >= 15000) flushTime();
}
function flushTime() { if (unsaved) { store.save(); unsaved = false; } lastSave = Date.now(); }
setInterval(trackTime, 1000);
document.addEventListener('visibilitychange', () => { if (document.hidden) flushTime(); else { lastTick = Date.now(); } });
window.addEventListener('pagehide', flushTime);
loadAnalytics();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { /* offline support is a bonus: the game works without it */ });
}
const foot = h('p', { class: 'version', id: 'version-stamp' }, `Version ${BUILD_VERSION}`);
document.body.append(foot);
// The offline cache serves the old version on a plain reload, so first let the new service worker install and take over.
// Without a service worker (Chrome and Safari on iPad/iPhone), a plain reload re-uses the old scripts from the browser's
// HTTP cache and the update bar comes straight back. Re-download every app file first, bypassing that cache.
async function refreshHttpCache() {
  try {
    const text = await (await fetch('sw-assets.js', { cache: 'reload' })).text();
    const files = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
    await Promise.all(files.map((f) => fetch(f, { cache: 'reload' }).catch(() => {})));
  } catch { /* best effort */ }
}
async function applyUpdate() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      const swap = new Promise((res) => { navigator.serviceWorker.addEventListener('controllerchange', res, { once: true }); });
      await reg.update();
      await Promise.race([swap, new Promise((res) => setTimeout(res, 4000))]);
    }
  } catch { /* fall through to a plain reload */ }
  await refreshHttpCache();
  location.reload();
}
startUpdateWatch((v) => {
  document.body.append(h('div', { class: 'update-bar', role: 'status', id: 'update-bar' }, 'A new version is ready! ',
    h('button', { class: 'primary', id: 'update-reload', onclick: applyUpdate }, 'Reload')));
});
render();
