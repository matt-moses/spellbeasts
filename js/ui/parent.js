// Parent area (PRD 10.2): behind an adult gate; word lists, stats, trainers, backup.
import { h, fill } from './dom.js';
import * as P from '../logic/parent.js';
import { spokenWord } from '../logic/pronounce.js';
import { localDateString } from '../logic/leitner.js';

const TABS = [['words', 'Word lists'], ['stats', 'Stats'], ['trainers', 'Trainers'], ['backup', 'Backup']];
const WARN = "Contains your word list. Don't post it publicly.";

// A destructive button that asks "Are you sure?" inline before doing anything.
function confirmButton(label, onConfirm, { cls = 'secondary', sure = 'Yes, do it' } = {}) {
  const wrap = h('span', { class: 'confirm-wrap' });
  const start = () => wrap.replaceChildren(h('button', { class: cls, type: 'button', onclick: ask }, label));
  const ask = () => wrap.replaceChildren(h('span', { class: 'confirm', role: 'alert' }, 'Are you sure? ',
    h('button', { type: 'button', class: 'danger yes', onclick: onConfirm }, sure), ' ', h('button', { type: 'button', class: 'secondary no', onclick: start }, 'Cancel')));
  start();
  return wrap;
}

function gateView(app) {
  const thisYear = Number(app.today().slice(0, 4));
  const select = h('select', { id: 'gate-year', autocomplete: 'off', 'aria-label': 'The year you were born' },
    h('option', { value: '', selected: true, disabled: true }, 'Choose a year'),
    P.birthYearChoices(thisYear).map((y) => h('option', { value: String(y) }, String(y))));
  const msg = h('p', { class: 'note', role: 'alert', id: 'gate-msg' });
  const form = h('form', { class: 'panel gate', onsubmit: (e) => {
    e.preventDefault();
    const year = select.value;
    select.value = '';                                                  // never kept: cleared straight away
    if (P.isAdultBirthYear(year, thisYear)) { app.parentUnlocked = true; app.render(); return; }
    msg.textContent = 'The Parent area is for grown-ups. Please ask a grown-up to open it.';
    select.focus();
  } }, h('h1', {}, 'Parent area'), h('p', {}, 'This part is for grown-ups. To continue, please select the year you were born. It is not saved.'),
    h('p', {}, select), h('button', { class: 'primary', id: 'gate-continue', type: 'submit' }, 'Continue'), ' ',
    h('button', { class: 'secondary', type: 'button', onclick: () => leave(app) }, 'Back'), msg);
  queueMicrotask(() => select.focus());
  return h('section', { class: 'screen parent' }, form);
}

function leave(app) { app.parentUnlocked = false; app.go(app.profile ? '/home' : '/'); }

export function parentView(app) {
  if (!app.parentUnlocked) return gateView(app);
  const { store } = app;
  const st = () => store.state;
  const ui = (app.parentUi ??= { tab: 'words', listId: 'sample', profileId: null, sortKey: 'word', sortDir: 'asc', note: '' });
  if (!st().wordLists[ui.listId]) ui.listId = Object.keys(st().wordLists)[0];
  if (!st().profiles[ui.profileId]) ui.profileId = st().profiles[app.profileId] ? app.profileId : Object.keys(st().profiles)[0] ?? null;
  const root = h('section', { class: 'screen parent unlocked' });
  const save = () => store.save();
  const redraw = () => draw();
  const say = (text) => { ui.note = text; };

  const tabs = () => h('div', { class: 'tabs', role: 'tablist' }, TABS.map(([id, label]) =>
    h('button', { role: 'tab', 'aria-selected': String(ui.tab === id), class: `tab${ui.tab === id ? ' on' : ''}`, 'data-tab': id, onclick: () => { ui.tab = id; ui.note = ''; redraw(); } }, label)));

  // ---------------------------------------------------------------- Word lists
  function wordsTab() {
    const list = st().wordLists[ui.listId];
    const lists = Object.entries(st().wordLists);
    const out = h('div', { class: 'tab-body' });
    const sel = h('select', { id: 'list-select', 'aria-label': 'Word list', onchange: (e) => { ui.listId = e.target.value; redraw(); } },
      lists.map(([id, l]) => h('option', { value: id, selected: id === ui.listId }, `${l.name} (${l.words.length})`)));
    const nameIn = h('input', { id: 'list-name', type: 'text', value: list.name, 'aria-label': 'List name' });
    out.append(h('div', { class: 'panel row' }, sel, nameIn,
      h('button', { class: 'secondary', id: 'rename-list', onclick: () => { if (P.renameList(st(), ui.listId, nameIn.value)) { save(); say('List renamed.'); redraw(); } } }, 'Rename list'),
      ui.listId !== 'sample' ? confirmButton('Delete this list', () => { P.deleteList(st(), ui.listId); ui.listId = 'sample'; save(); say('List deleted. Its trainers moved to the sample list.'); redraw(); }, { sure: 'Yes, delete the list' }) : null,
      ui.listId === 'sample' ? confirmButton('Reset sample list', () => { P.resetSampleList(st()); save(); say('Sample list restored.'); redraw(); }) : null));

    // who practises this list
    const users = P.listUsers(st(), ui.listId).map(([id]) => id);
    out.append(h('div', { class: 'panel who' }, h('h2', {}, 'Who practices this list?'),
      Object.keys(st().profiles).length
        ? h('div', {}, Object.entries(st().profiles).map(([id, p]) => h('label', { class: 'toggle' },
          h('input', { type: 'checkbox', 'data-profile': id, checked: users.includes(id), disabled: users.includes(id) && Object.keys(st().wordLists).length < 2,
            onchange: (e) => { if (e.target.checked) P.setActiveList(st(), id, ui.listId); else P.unassignList(st(), id, ui.listId); save(); say(e.target.checked ? `${p.name} now practices “${list.name}”.` : `${p.name} moved to another list.`); redraw(); } }), ` ${p.name}`,
          h('small', { class: 'small' }, users.includes(id) ? '' : ` (now: ${st().wordLists[p.activeListId]?.name ?? '?'})`))))
        : h('p', { class: 'small' }, 'No trainers yet.'),
      h('p', { class: 'small' }, 'Each trainer practices one list at a time, and keeps separate progress for each list. A younger player can have an easier list than an older one.')));

    // import panel
    const ta = h('textarea', { id: 'import-text', rows: 7, spellcheck: 'false', placeholder: 'word | part of speech | definition | sentence (optional)\none word per line. Tab, | or comma separators. Lines starting with # are ignored.' });
    const preview = h('div', { id: 'import-preview', 'aria-live': 'polite' });
    const newName = h('input', { id: 'new-list-name', type: 'text', placeholder: 'e.g. Two Bee – Grade 4', 'aria-label': 'New list name' });
    let mode = 'replace';
    const modeBtns = h('fieldset', { class: 'modes' }, h('legend', {}, 'Import mode'),
      [['replace', 'Replace this list'], ['add', 'Add to this list'], ['new', 'Create a new list']].map(([v, t]) =>
        h('label', {}, h('input', { type: 'radio', name: 'mode', value: v, checked: v === mode, onchange: () => { mode = v; newName.hidden = v !== 'new'; update(); } }), ` ${t}`)));
    newName.hidden = true;
    const doImport = h('button', { class: 'primary', id: 'do-import', type: 'button' }, 'Import words');
    function update() {
      const parsed = P.previewImport(st(), ui.listId, ta.value, mode === 'add' ? 'add' : 'replace');
      fill(preview,
        ta.value.trim() ? h('p', {}, h('strong', { id: 'valid-count' }, `${parsed.words.length} valid word${parsed.words.length === 1 ? '' : 's'}`), parsed.errors.length ? `, ${parsed.errors.length} line${parsed.errors.length === 1 ? '' : 's'} with problems:` : '') : null,
        parsed.errors.length ? h('ul', { class: 'errors' }, parsed.errors.map((e) => h('li', {}, `Line ${e.line}: ${e.message}`))) : null,
        parsed.words.length ? h('details', {}, h('summary', {}, 'Preview'), h('ol', {}, parsed.words.slice(0, 50).map((w) => h('li', {}, `${w.word} — ${w.partOfSpeech}${w.definition ? `: ${w.definition}` : ''}`)))) : null);
      doImport.disabled = parsed.words.length === 0;
    }
    ta.addEventListener('input', update);
    const file = h('input', { type: 'file', id: 'import-file', accept: '.txt,.csv,.tsv,text/plain,text/csv', onchange: async (e) => { const f = e.target.files[0]; if (f) { ta.value = await f.text(); update(); } } });
    const run = () => {
      let r;
      if (mode === 'new') { r = P.createListFromImport(st(), newName.value, ta.value); if (r.ok) ui.listId = r.id; }
      else r = P.importIntoList(st(), ui.listId, ta.value, mode);
      if (!r.ok) { say(r.error); redraw(); return; }
      save(); say(`Imported ${r.added} word${r.added === 1 ? '' : 's'}${r.errors.length ? ` (${r.errors.length} skipped)` : ''}.`); redraw();
    };
    doImport.addEventListener('click', () => { if (mode === 'replace' && list.words.length) { ui.pendingReplace = true; doImport.replaceWith(confirmReplace); } else run(); });
    const confirmReplace = h('span', { class: 'confirm', role: 'alert' }, `Replace all ${list.words.length} words? `, h('button', { type: 'button', class: 'danger yes', onclick: run }, 'Yes, replace'), ' ', h('button', { type: 'button', class: 'secondary no', onclick: () => confirmReplace.replaceWith(doImport) }, 'Cancel'));
    doImport.disabled = true;
    out.append(h('div', { class: 'panel' }, h('h2', {}, 'Import words'),
      h('p', { class: 'small' }, 'The word list stays in this browser only. It is never uploaded or saved to the website. A fifth field, separated by | or a tab, says how to pronounce a word (for example laughter | noun | … | … | laffter).'),
      ta, h('p', {}, 'Or choose a file: ', file), modeBtns, newName, preview, h('p', {}, doImport)));

    // word table
    out.append(h('h2', {}, `Words in “${list.name}”`));
    const table = h('table', { class: 'words' }, h('thead', {}, h('tr', {}, ['Word', 'Part of speech', 'Definition', 'Sentence', 'Say it like', ''].map((t) => h('th', {}, t)))),
      h('tbody', {}, list.words.map((w) => wordRow(w))));
    out.append(list.words.length ? h('div', { class: 'scroll' }, table) : h('p', {}, 'This list has no words yet.'));
    return out;
  }

  function wordRow(w) {
    const tr = h('tr', { 'data-word': w.word });
    const show = () => {
      tr.replaceChildren(h('td', { class: 'w' }, w.word), h('td', {}, w.partOfSpeech), h('td', {}, w.definition), h('td', {}, w.sentence ?? ''), h('td', { class: 'sayas' }, w.sayAs ?? ''),
        h('td', { class: 'acts' }, h('button', { class: 'secondary edit', onclick: edit }, 'Edit'), ' ',
          confirmButton('Delete', () => { P.deleteWord(st(), ui.listId, w.word); save(); say(`Deleted “${w.word}”.`); redraw(); }, { sure: 'Yes, delete' })));
    };
    const edit = () => {
      const FIELDS = ['word', 'partOfSpeech', 'definition', 'sentence', 'sayAs'];
      const f = Object.fromEntries(FIELDS.map((k) => [k, h('input', { type: 'text', value: w[k] ?? '', 'aria-label': k === 'sayAs' ? 'say it like (how it should sound)' : k, name: k, placeholder: k === 'sayAs' ? 'e.g. laffter' : null })]));
      const err = h('small', { class: 'err', role: 'alert' });
      tr.replaceChildren(...FIELDS.map((k) => h('td', {}, f[k])), h('td', { class: 'acts' },
        h('button', { class: 'secondary hear', type: 'button', onclick: () => app.speaker.speak(spokenWord({ word: f.word.value, sayAs: f.sayAs.value })) }, 'Hear it'), ' ',
        h('button', { class: 'primary save', onclick: () => {
          const r = P.editWord(st(), ui.listId, w.word, Object.fromEntries(Object.entries(f).map(([k, el]) => [k, el.value])));
          if (!r.ok) { err.textContent = r.error; return; }
          save(); say('Word saved.'); redraw();
        } }, 'Save'), ' ', h('button', { class: 'secondary', onclick: show }, 'Cancel'), err));
    };
    show();
    return tr;
  }

  // ---------------------------------------------------------------- Stats
  function statsTab() {
    const out = h('div', { class: 'tab-body' });
    const profiles = Object.entries(st().profiles);
    if (!profiles.length) return h('div', { class: 'tab-body' }, h('p', {}, 'No trainers yet. Create one first.'));
    const profile = st().profiles[ui.profileId];
    const list = st().wordLists[profile.activeListId] ?? st().wordLists.sample;
    out.append(h('div', { class: 'panel row' }, h('label', {}, 'Trainer ', h('select', { id: 'stats-profile', onchange: (e) => { ui.profileId = e.target.value; redraw(); } },
      profiles.map(([id, p]) => h('option', { value: id, selected: id === ui.profileId }, p.name)))), h('span', {}, `Practicing “${list.name}”`)));
    const rows = P.statsRows(profile, list);
    const mastered = rows.filter((r) => r.mastered).length;
    out.append(h('p', { class: 'summary-line' }, `${mastered} of ${rows.length} words mastered.`));
    const top = P.mostMissed(rows);
    out.append(h('div', { class: 'panel most-missed' }, h('h2', {}, 'Most missed'),
      top.length ? h('ol', {}, top.map((r) => h('li', {}, `${r.word} — missed ${r.missed} time${r.missed === 1 ? '' : 's'} on the first try (${r.accuracy}% first-try accuracy)`))) : h('p', {}, 'No misses yet. Nice!')));
    const cols = [['word', 'Word'], ['attempts', 'Attempts'], ['accuracy', 'First-try %'], ['box', 'Box'], ['nextDue', 'Next due'], ['mastered', 'Mastered'], ['lastMissed', 'Last missed']];
    const sorted = P.sortRows(rows, ui.sortKey, ui.sortDir);
    out.append(h('div', { class: 'scroll' }, h('table', { class: 'stats-table' },
      h('thead', {}, h('tr', {}, cols.map(([k, label]) => h('th', { 'aria-sort': ui.sortKey === k ? (ui.sortDir === 'asc' ? 'ascending' : 'descending') : 'none' },
        h('button', { class: 'sort', 'data-key': k, onclick: () => { ui.sortDir = ui.sortKey === k && ui.sortDir === 'asc' ? 'desc' : 'asc'; ui.sortKey = k; redraw(); } }, label, ui.sortKey === k ? (ui.sortDir === 'asc' ? ' ▲' : ' ▼') : ''))))),
      h('tbody', {}, sorted.map((r) => h('tr', { 'data-word': r.word }, h('td', { class: 'w' }, r.word), h('td', {}, r.attempts), h('td', {}, r.accuracy == null ? '–' : `${r.accuracy}%`),
        h('td', {}, r.box ?? '–'), h('td', {}, r.nextDue ?? (r.attempts ? '–' : 'new')), h('td', {}, r.mastered ? 'Yes' : 'No'), h('td', {}, r.lastMissed ?? '–')))))));
    const hist = [...profile.sessions].reverse().slice(0, 30);
    out.append(h('h2', {}, 'Session history'), hist.length ? h('ul', { class: 'history' }, hist.map((s) => h('li', {}, `${s.date} · ${s.mode} · ${s.words} words · ${s.correctFirstTry} right first try · ${s.misses} miss${s.misses === 1 ? '' : 'es'}`))) : h('p', {}, 'No sessions yet.'));
    return out;
  }

  // ---------------------------------------------------------------- Trainers
  function trainersTab() {
    const out = h('div', { class: 'tab-body' });
    const entries = Object.entries(st().profiles);
    if (!entries.length) out.append(h('p', {}, 'No trainers yet.'));
    for (const [id, p] of entries) {
      const name = h('input', { type: 'text', value: p.name, maxlength: 20, 'aria-label': `Name for ${p.name}`, class: 'tname' });
      out.append(h('div', { class: 'panel trainer', 'data-profile': id },
        h('div', { class: 'row' }, name, h('button', { class: 'secondary rename', onclick: () => { if (P.renameProfile(st(), id, name.value)) { save(); say('Trainer renamed.'); redraw(); } } }, 'Rename'),
          h('label', {}, 'Practice list ', h('select', { class: 'active-list', onchange: (e) => { P.setActiveList(st(), id, e.target.value); save(); say('Practice list changed.'); redraw(); } },
            Object.entries(st().wordLists).map(([lid, l]) => h('option', { value: lid, selected: lid === p.activeListId }, l.name))))),
        h('p', { class: 'small' }, `Level ${p.level} · ${p.creatures.length} creature${p.creatures.length === 1 ? '' : 's'} · ${p.sessions.length} session${p.sessions.length === 1 ? '' : 's'}`),
        h('div', { class: 'row' },
          confirmButton('Reset progress', () => { P.resetProgress(st(), id); save(); say(`Progress reset for ${p.name}.`); redraw(); }, { sure: 'Yes, reset' }),
          confirmButton('Delete trainer', () => { P.deleteProfile(st(), id); if (app.profileId === id) app.profileId = null; save(); say(`Deleted ${p.name}.`); redraw(); }, { sure: 'Yes, delete' }))));
    }
    return out;
  }

  // ---------------------------------------------------------------- Backup
  function backupTab() {
    const out = h('div', { class: 'tab-body' });
    const msg = h('p', { class: 'note', role: 'status', id: 'backup-msg' });
    out.append(h('div', { class: 'panel' }, h('h2', {}, 'Export'), h('p', { class: 'warn' }, WARN),
      h('button', { class: 'primary', id: 'export', onclick: () => {
        const blob = new Blob([P.exportJson(st())], { type: 'application/json' });
        const a = h('a', { href: URL.createObjectURL(blob), download: `spellbeasts-backup-${localDateString()}.json` });
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        msg.textContent = 'Backup file created. Keep it somewhere private.';
      } }, 'Download backup')));
    const holder = h('div');
    const file = h('input', { type: 'file', id: 'backup-file', accept: '.json,application/json', onchange: async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = P.parseBackup(await f.text());
      if (!r.ok) { holder.replaceChildren(h('p', { class: 'err', role: 'alert' }, r.error)); return; }
      const n = Object.keys(r.state.profiles).length;
      holder.replaceChildren(h('div', { class: 'confirm', role: 'alert' }, `This backup has ${n} trainer${n === 1 ? '' : 's'} and ${Object.keys(r.state.wordLists).length} word list(s). Importing will REPLACE everything in this browser. `,
        h('button', { class: 'danger yes', id: 'confirm-restore', onclick: () => {
          store.replace(r.state);
          app.profileId = null; ui.profileId = null; ui.listId = 'sample';
          say('Backup restored.'); redraw();
        } }, 'Yes, replace everything'), ' ', h('button', { class: 'secondary', onclick: () => { holder.replaceChildren(); file.value = ''; } }, 'Cancel')));
    } });
    out.append(h('div', { class: 'panel' }, h('h2', {}, 'Import'), h('p', {}, 'Choose a backup file made with “Download backup”.'), file, holder), msg);
    return out;
  }

  function draw() {
    const body = { words: wordsTab, stats: statsTab, trainers: trainersTab, backup: backupTab }[ui.tab]();
    fill(root,
      h('div', { class: 'row between' }, h('h1', {}, 'Parent area'), h('button', { class: 'secondary', id: 'parent-back', onclick: () => leave(app) }, 'Done')),
      tabs(), ui.note ? h('p', { class: 'note ok', role: 'status', id: 'parent-note' }, ui.note) : null, body);
  }
  draw();
  return root;
}
