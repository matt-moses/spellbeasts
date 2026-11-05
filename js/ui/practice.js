import { h, icon, fill as setKids } from './dom.js';
import { companionSvg } from './art.js';
import { makeInteractive } from './pet.js';
import { spokenWord, spokenSentence } from '../logic/pronounce.js';

export function practiceView(app) {
  const { speaker, audio, store } = app;
  const s = app.session;
  if (!s) { queueMicrotask(() => app.go('/home')); return h('div'); }
  const profile = app.profile;
  let cur = null;

  const fill = h('div', { class: 'fill' });
  const bar = h('div', { class: 'bar', role: 'progressbar', 'aria-label': 'Session progress' }, fill);
  const crickets = h('span', { class: 'crickets' });
  const companion = h('div', { class: 'companion', html: companionSvg(profile, { size: 110 }) });
  const clue = h('p', { class: 'clue', 'aria-live': 'polite' });
  const feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });
  const toast = h('div', { class: 'toast', role: 'status' });
  const label = h('label', { for: 'answer', class: 'prompt' }, 'Spell the word you hear');
  const input = h('input', { id: 'answer', type: 'text', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', 'aria-describedby': 'feedback' });
  feedback.id = 'feedback';
  const noVoice = h('p', { class: 'warn', hidden: speaker.available }, speaker.helpMessage ?? '');
  speaker.onVoicesChanged(() => { noVoice.hidden = speaker.available; noVoice.textContent = speaker.helpMessage ?? ''; });

  // The very first word waits a moment so there is time to settle in. Anything the player does (Say again, Say slowly,
  // an answer) cancels the wait. The wait length can be overridden with globalThis.SPELLBEASTS_READY_DELAY (tests use 0).
  const readyDelay = () => globalThis.SPELLBEASTS_READY_DELAY ?? 1200;
  let readyTimer = 0, started = false;
  const cancelReady = () => { clearTimeout(readyTimer); readyTimer = 0; root.querySelector('.get-ready')?.remove(); };
  const sayAgain = () => { cancelReady(); speaker.speak(spokenWord(cur)); };
  const buttons = h('div', { class: 'clues' },
    h('button', { type: 'button', id: 'say-again', class: 'c-blue', onclick: sayAgain }, icon('speaker'), 'Say again'),
    h('button', { type: 'button', id: 'say-slow', class: 'c-yellow', onclick: () => { cancelReady(); speaker.speak(spokenWord(cur), { slow: true }); } }, icon('turtle'), 'Say slowly'),
    h('button', { type: 'button', id: 'say-def', class: 'c-pink', onclick: () => { clue.textContent = `Definition: ${cur.definition}`; speaker.speak(cur.definition); } }, icon('book'), 'Definition'),
    h('button', { type: 'button', id: 'say-pos', class: 'c-purple', onclick: () => { clue.textContent = `Part of speech: ${cur.partOfSpeech}`; speaker.speak(cur.partOfSpeech); } }, icon('tag'), 'Part of speech'),
    h('button', { type: 'button', id: 'say-sentence', class: 'c-blue', onclick: () => speaker.speak(spokenSentence(cur)) }, icon('chat'), 'Sentence'));
  const sentenceBtn = buttons.querySelector('#say-sentence');

  function refresh() {
    const p = s.progress;
    fill.style.width = `${p.total ? Math.round((p.resolved / p.total) * 100) : 0}%`;
    bar.setAttribute('aria-valuenow', String(p.resolved)); bar.setAttribute('aria-valuemax', String(p.total));
    crickets.textContent = `🦗 ${profile.crickets}`;
  }
  function mood(m) { companion.innerHTML = companionSvg(profile, { size: 110, mood: m }); companion.classList.remove('bounce'); void companion.offsetWidth; companion.classList.add('bounce'); }
  function say(msg) { toast.textContent = msg; toast.classList.remove('show'); void toast.offsetWidth; toast.classList.add('show'); }

  function ask() {
    cur = s.next();
    if (!cur) {
      const summary = s.finish(); store.save();
      app.lastSummary = summary; app.session = null;
      return app.go('/summary');
    }
    cancelReady();
    feedback.replaceChildren(); clue.textContent = '';
    sentenceBtn.hidden = !cur.sentence;
    label.textContent = 'Spell the word you hear';
    input.value = ''; input.focus();
    refresh();
    const wait = started ? 0 : readyDelay();
    started = true;
    if (wait > 0) {
      const word = cur;
      companion.append(h('span', { class: 'get-ready', role: 'status' }, 'Get ready…'));
      readyTimer = setTimeout(() => { readyTimer = 0; root.querySelector('.get-ready')?.remove(); if (cur === word) speaker.speak(spokenWord(word)); }, wait);
    } else speaker.speak(spokenWord(cur));
  }

  function showMiss(r) {
    const typed = r.typed || '(nothing)';
    setKids(feedback,
      h('p', { class: 'almost' }, "Almost! Let's look at it together."),
      h('p', { class: 'correct-word', 'aria-label': `The word is ${r.expected}` }, r.diff.map((d) => h('span', { class: d.ok ? 'ok' : 'bad' }, d.ch))),
      h('p', { class: 'typed' }, `You typed: ${typed}`),
      r.caseOnly ? h('p', { class: 'case-note' }, 'The letters are right. Check the capital letters!') : null);
    label.textContent = 'Now type it correctly to keep going';
    input.value = ''; input.focus();
  }

  function onSubmit(e) {
    e.preventDefault();
    if (s.mode === 'asking') {
      const r = s.submit(input.value);
      store.save();
      if (r.correct) {
        audio.play('correct'); mood('happy');
        say(`✓ Correct!  +${r.reward.crickets} 🦗${r.newlyMastered ? '  Mastered!' : ''}`);
        ask();
      } else { audio.play('gentle'); mood('sad'); showMiss(r); refresh(); }
    } else if (s.mode === 'correcting') {
      if (s.submitCorrection(input.value)) { store.save(); mood('happy'); ask(); }
      else { say('Not quite. Look at the letters and try again.'); input.value = ''; input.focus(); }
    }
  }

  function onKey(e) {
    if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && e.key.toLowerCase() === 'r') { e.preventDefault(); sayAgain(); }
    else if (e.key === ' ' && e.target === input && input.value === '' && s.mode === 'asking') { e.preventDefault(); sayAgain(); }
  }
  document.addEventListener('keydown', onKey);
  app.cleanup.push(() => { document.removeEventListener('keydown', onKey); clearTimeout(readyTimer); });

  makeInteractive(companion, app, { name: profile.name, speak: false, focusable: false, label: 'Tap your practice buddy' });
  const root = h('section', { class: 'screen practice' },
    h('div', { class: 'p-top' }, bar, crickets), companion,
    h('div', { class: 'panel prompt-card' }, noVoice, buttons, clue,
      h('form', { onsubmit: onSubmit, autocomplete: 'off' }, label, input, h('button', { type: 'submit', class: 'primary' }, 'Check')),
      feedback),
    toast);
  queueMicrotask(ask);
  return root;
}
