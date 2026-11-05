// Inline SVG icons (no emoji fonts needed). Coloured ones are used for in-text tokens; the rest follow currentColor.
const I = (body, vb = '0 0 24 24') => `<svg viewBox="${vb}" width="1.25em" height="1.25em" aria-hidden="true" focusable="false">${body}</svg>`;
const S = 'stroke="#1d2433" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"';

export const ICONS = {
  // coloured tokens (used inside text)
  cricket: I(`<path d="M5 17L2 22M9 18l-2 4M15 18l2 4" stroke="#1d2433" stroke-width="1.8" stroke-linecap="round" fill="none"/><ellipse cx="11" cy="14" rx="8" ry="4.6" fill="#4a8f2e" ${S}/><circle cx="18.5" cy="10" r="3.4" fill="#6bb53f" ${S}/><path d="M20 6.5Q22.5 2 21 1M17.5 6.5Q16 2.5 13.5 2" fill="none" stroke="#1d2433" stroke-width="1.2" stroke-linecap="round"/>`),
  flame: I(`<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 3-6 .5 2 1.5 2.5 2 2 1-2 1-5 1-8z" fill="#ff8a1f" ${S}/><path d="M12 12c2 2 3 3 3 5a3 3 0 0 1-6 0c0-2 2-3 3-5z" fill="#ffd34d"/>`),
  egg: I(`<path d="M12 2C16 2 19 9 19 14a7 7 0 0 1-14 0C5 9 8 2 12 2z" fill="#fff6dc" ${S}/><circle cx="9.5" cy="14" r="1.2" fill="#e8c27a"/><circle cx="14" cy="16" r="1.4" fill="#e8c27a"/><circle cx="13" cy="10" r="1" fill="#e8c27a"/>`),
  trophy: I(`<path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="#ffc928" ${S}/><path d="M7 5H3c0 4 2 6 4 6.5M17 5h4c0 4-2 6-4 6.5" fill="none" ${S}/><rect x="10.5" y="14" width="3" height="4" fill="#ffc928" ${S}/><rect x="7" y="18" width="10" height="3" rx="1" fill="#ffc928" ${S}/>`),
  star: I(`<path d="M12 2l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17l-5.9 3.2 1.3-6.6L2.5 9l6.6-.8z" fill="#ffc928" ${S}/>`),
  heart: I(`<path d="M12 21S3 14.5 3 8.8A4.8 4.8 0 0 1 12 6.5 4.8 4.8 0 0 1 21 8.8C21 14.5 12 21 12 21z" fill="#ef4b5f" ${S}/>`),
  map: I(`<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="#fff6dc" ${S}/><path d="M9 4v14M15 6v14" fill="none" ${S}/>`),
  party: I(`<path d="M3 21l5-13 8 8z" fill="#ffc928" ${S}/><circle cx="15" cy="6" r="1.4" fill="#ef4b5f"/><circle cx="19" cy="11" r="1.4" fill="#2f7df6"/><circle cx="10" cy="3.5" r="1.2" fill="#2bb673"/>`),
  // UI icons (currentColor)
  home: I('<path fill="currentColor" d="M12 2.5L1.8 11.6h2.9V21h5.6v-6.2h3.4V21h5.6v-9.4h2.9z"/>'),
  speaker: I('<path fill="currentColor" d="M3 9v6h4l5 4.5v-15L7 9z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.3 5.7a9 9 0 0 1 0 12.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  turtle: I('<path fill="currentColor" d="M3 16a8 7 0 0 1 16 0z"/><circle fill="currentColor" cx="20.5" cy="13.5" r="2.6"/><rect fill="currentColor" x="5" y="16" width="3" height="4" rx="1.4"/><rect fill="currentColor" x="14" y="16" width="3" height="4" rx="1.4"/>'),
  book: I('<path fill="currentColor" d="M2.5 4.5h8.5v15H2.5zM13 4.5h8.5v15H13z"/>'),
  tag: I('<path fill="currentColor" d="M2.5 12.5v-9h9l10 10-9 9z"/><circle cx="7.5" cy="8.5" r="1.8" fill="#fff"/>'),
  chat: I('<path fill="currentColor" d="M3 3.5h18v13H10l-5 4v-4H3z"/>'),
  paw: I('<g fill="currentColor"><ellipse cx="12" cy="16" rx="5" ry="4"/><ellipse cx="5.5" cy="11" rx="2" ry="2.6"/><ellipse cx="9.5" cy="6.5" rx="2" ry="2.7"/><ellipse cx="14.5" cy="6.5" rx="2" ry="2.7"/><ellipse cx="18.5" cy="11" rx="2" ry="2.6"/></g>'),
  lock: I('<rect fill="currentColor" x="4.5" y="10.5" width="15" height="10.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.4"/>'),
  play: I('<path fill="currentColor" d="M6 3.5l15 8.5-15 8.5z"/>'),
  eggbook: I('<path fill="currentColor" d="M12 2C16 2 19 9 19 14a7 7 0 0 1-14 0C5 9 8 2 12 2z"/>'),
};

export const TOKENS = { '🦗': ['cricket', 'crickets'], '🔥': ['flame', 'streak'], '🥚': ['egg', 'egg'], '🏆': ['trophy', 'trophy'], '⭐': ['star', 'star'], '🗺️': ['map', 'map'], '🎉': ['party', 'celebration'], '❤️': ['heart', 'heart'] };
export const TOKEN_RE = new RegExp(`(${Object.keys(TOKENS).join('|')})`);
export const iconHtml = (name) => ICONS[name] ?? '';
