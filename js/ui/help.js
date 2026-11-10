// A "?" button and a pop-up dialog of kid-friendly FAQs. A dialog (not a page) so nothing in progress is lost.
import { h } from './dom.js';
import { faqGroups } from './help-content.js';

export function helpButton(app, extraClass = '') {
  return h('button', { class: `help-btn ${extraClass}`.trim(), id: 'help-btn', type: 'button', 'aria-label': 'Help', 'aria-haspopup': 'dialog', onclick: () => openHelp(app) }, '?');
}

export function openHelp(app) {
  if (document.getElementById('help-dialog')) return;
  const opener = document.activeElement;
  const close = h('button', { class: 'primary', id: 'help-close', type: 'button', onclick: () => shut() }, 'Close');
  const card = h('div', { class: 'help-card', id: 'help-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'help-title' },
    h('div', { class: 'row between' }, h('h2', { id: 'help-title' }, 'Help'), close),
    h('p', { class: 'small' }, 'Tap a question to see the answer.'),
    faqGroups().map((g) => h('section', { class: 'faq-group' }, h('h3', {}, g.group),
      g.items.map((it) => h('details', { class: 'faq' }, h('summary', {}, it.q), h('p', {}, it.a))))),
    h('p', { class: 'small' }, 'Still stuck? Ask a grown-up to help.'));
  const overlay = h('div', { class: 'help-overlay', onclick: (e) => { if (e.target === overlay) shut(); } }, card);

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); shut(); return; }
    if (e.key !== 'Tab') return;
    const f = [...card.querySelectorAll('button, summary, a[href]')].filter((el) => !el.closest('details:not([open])') || el.tagName === 'SUMMARY');
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function shut() {
    document.removeEventListener('keydown', onKey, true); window.removeEventListener('hashchange', shut);
    overlay.remove();
    if (opener?.isConnected) opener.focus();
  }
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('hashchange', shut);
  document.body.append(overlay);
  close.focus();
}
