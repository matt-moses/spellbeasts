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
    // The cricket emoji is drawn as an inline SVG icon (see .cricket in CSS) so it never depends on an emoji font.
    String(kid).split('🦗').forEach((part, i) => {
      if (i > 0) el.append(h('span', { class: 'cricket', role: 'img', 'aria-label': 'crickets' }));
      if (part) el.append(document.createTextNode(part));
    });
  }
  return el;
}
