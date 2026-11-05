import { ICONS, TOKENS, TOKEN_RE } from './icons.js';

// Inline icon element: icon('home') -> <span class="ico"><svg/></span>
export function icon(name, label) {
  const el = document.createElement('span');
  el.className = `ico ico-${name}`;
  el.innerHTML = ICONS[name] ?? '';
  if (label) { el.setAttribute('role', 'img'); el.setAttribute('aria-label', label); } else el.setAttribute('aria-hidden', 'true');
  return el;
}

// Tiny element helper: h('div', {class:'x', onclick:fn}, child, 'text')
export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    if (kid.nodeType) { el.append(kid); continue; }
    // Emoji tokens are drawn as inline SVG icons so they never depend on an emoji font.
    String(kid).split(TOKEN_RE).forEach((part) => {
      if (!part) return;
      const t = TOKENS[part];
      if (t) { const ic = icon(t[0], t[1]); ic.classList.add('inline'); el.append(ic); } else el.append(document.createTextNode(part));
    });
  }
  return el;
}

// Replace an element's children, skipping empty slots (replaceChildren(null) would insert the text "null").
export function fill(el, ...kids) {
  el.replaceChildren(...kids.flat().filter((k) => k != null && k !== false));
  return el;
}
