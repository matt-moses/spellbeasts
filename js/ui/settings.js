// Settings: voice picker (natural voices first, with a preview), speech speed, sound and music.
import { h, fill } from './dom.js';
import { rankVoices, voiceLabel, pickVoice, PREVIEW_TEXT, RATES, DEFAULT_RATE } from '../platform/speech.js';

export function settingsView(app) {
  const { store, speaker, audio } = app;
  const s = () => store.state.settings;
  const root = h('section', { class: 'screen settings' });
  const note = h('p', { class: 'note ok', role: 'status', hidden: true });
  const flash = (t) => { note.textContent = t; note.hidden = false; };
  const save = () => store.save();

  function draw() {
    const ranked = rankVoices(speaker.voices());
    const current = pickVoice(speaker.voices(), s().voiceURI);
    const select = h('select', { id: 'voice-select', 'aria-label': 'Voice', onchange: (e) => { s().voiceURI = e.target.value || null; save(); flash('Voice saved.'); preview(); } },
      h('option', { value: '' }, 'Automatic (best available)'),
      ranked.map((v) => h('option', { value: v.voiceURI, selected: s().voiceURI === v.voiceURI }, voiceLabel(v))));
    const rate = s().rate ?? DEFAULT_RATE;
    const preview = () => speaker.speak(PREVIEW_TEXT);
    fill(root,
      h('h1', {}, 'Settings'), note,
      h('div', { class: 'panel' }, h('h2', {}, 'Voice'),
        speaker.available ? null : h('p', { class: 'warn' }, speaker.helpMessage),
        h('p', { class: 'small' }, 'Voices marked ★ usually sound the most natural. The list comes from your device, so installing a better voice in your system or browser settings adds more choices.'),
        h('p', {}, select, ' ', h('button', { class: 'primary', id: 'voice-preview', type: 'button', onclick: preview }, 'Hear it')),
        h('p', { class: 'small', id: 'voice-current' }, current ? `Using: ${current.name}` : 'No voice found.')),
      h('div', { class: 'panel' }, h('h2', {}, 'Speed'),
        h('div', { class: 'row', role: 'group', 'aria-label': 'Speech speed' }, RATES.map((r) =>
          h('button', { class: `speed${r === rate ? ' on' : ''}`, type: 'button', 'data-rate': String(r), 'aria-pressed': String(r === rate), onclick: () => { s().rate = r; save(); flash('Speed saved.'); draw(); preview(); } },
            r < 0.7 ? 'Slow' : r < 0.85 ? 'Slower' : r === 0.9 ? 'Normal' : r < 1.1 ? 'Quick' : 'Fast')))),
      h('div', { class: 'panel' }, h('h2', {}, 'Sound'),
        toggle('Sound effects', 'sound', 'sound-toggle'), toggle('Background music', 'music', 'music-toggle')),
      h('div', { class: 'actions' }, h('button', { class: 'secondary', onclick: () => app.go(app.profile ? '/home' : '/') }, 'Done')));
  }
  function toggle(label, key, id) {
    return h('label', { class: 'toggle' }, h('input', { type: 'checkbox', id, checked: s()[key] !== false, onchange: (e) => {
      s()[key] = e.target.checked; save();
      if (key === 'music') (e.target.checked ? audio.startMusic() : audio.stopMusic());
      if (key === 'sound' && !e.target.checked) audio.stopMusic();
      flash(`${label} ${e.target.checked ? 'on' : 'off'}.`);
    } }), ` ${label}`);
  }
  speaker.onVoicesChanged(draw);
  draw();
  return root;
}
