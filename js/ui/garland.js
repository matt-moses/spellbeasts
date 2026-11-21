// The string of leaves (Thanksgiving) and string of lights (Christmas) across the top of the screen. They are drawn here as a real
// SVG layer (not part of the scenery background) so they can wave when the pointer touches them. The layer sits behind the page
// (z-index -1, pointer-events none), so clicks are never blocked: a pointermove listener tests whether the pointer is over the
// string. Same geometry as the old background art (1600 x 340 view box, positioned like the scenery behind it).
const INK = '#1d2433';
const STRANDS = {
  thanksgiving: { d: 'M0 38Q200 90 400 38M400 38Q600 90 800 38M800 38Q1000 90 1200 38M1200 38Q1400 90 1600 38', stroke: '#8a5a2e' },
  christmas: { d: 'M0 32Q200 84 400 32M400 32Q600 84 800 32M800 32Q1000 84 1200 32M1200 32Q1400 84 1600 32', stroke: '#355' },
};
// [x, y, rotation, colour]
const LEAVES = [[20, 42, -30, "#d9482b"], [84, 54, 7, "#f08a24"], [148, 62, -16, "#f5c518"], [212, 64, 21, "#a8531a"], [276, 60, -2, "#c4382b"], [340, 50, -25, "#d9482b"], [404, 39, 12, "#f08a24"], [468, 51, -11, "#f5c518"], [532, 60, 26, "#a8531a"], [596, 64, 3, "#c4382b"], [660, 61, -20, "#d9482b"], [724, 53, 17, "#f08a24"], [788, 40, -6, "#f5c518"], [852, 48, -29, "#a8531a"], [916, 59, 8, "#c4382b"], [980, 64, -15, "#d9482b"], [1044, 62, 22, "#f08a24"], [1108, 55, -1, "#f5c518"], [1172, 44, -24, "#a8531a"], [1236, 45, 13, "#c4382b"], [1300, 56, -10, "#d9482b"], [1364, 63, 27, "#f08a24"], [1428, 63, 4, "#f5c518"], [1492, 58, -19, "#a8531a"], [1556, 47, 18, "#c4382b"]];
// [x, y, colour]: x is the middle of the bulb, y the top of its cap
const BULBS = [[20, 34, "#e5484d"], [76, 45, "#2bb673"], [132, 52, "#ffc928"], [188, 56, "#2f7df6"], [244, 54, "#e5484d"], [300, 48, "#2bb673"], [356, 39, "#ffc928"], [412, 32, "#2f7df6"], [468, 43, "#e5484d"], [524, 52, "#2bb673"], [580, 56, "#ffc928"], [636, 55, "#2f7df6"], [692, 50, "#e5484d"], [748, 40, "#2bb673"], [804, 31, "#ffc928"], [860, 42, "#2f7df6"], [916, 51, "#e5484d"], [972, 55, "#2bb673"], [1028, 55, "#ffc928"], [1084, 51, "#2f7df6"], [1140, 42, "#e5484d"], [1196, 31, "#2bb673"], [1252, 40, "#ffc928"], [1308, 50, "#2f7df6"], [1364, 55, "#e5484d"], [1420, 56, "#2bb673"], [1476, 52, "#ffc928"], [1532, 43, "#2f7df6"], [1588, 32, "#e5484d"]];

const leaf = ([x, y, rot, fill], i) => `<g transform="translate(${x} ${y}) rotate(${rot})"><g class="g-item" style="--i:${i}"><path d="M0-14Q12-4 0 14Q-12-4 0-14Z" fill="${fill}" stroke="${INK}" stroke-width="2"/><path d="M0-10V16" stroke="${INK}" stroke-width="1.5" fill="none"/></g></g>`;
const bulb = ([x, y, fill], i) => `<g transform="translate(${x} ${y})"><g class="g-item" style="--i:${i}"><rect x="-3" y="0" width="6" height="8" fill="#355"/><ellipse cx="0" cy="14" rx="7" ry="9" fill="${fill}" stroke="${INK}" stroke-width="2"/><ellipse cx="-2" cy="11" rx="2" ry="3" fill="#fff" opacity=".7"/></g></g>`;

export function garlandSvg(season) {
  const strand = STRANDS[season];
  if (!strand) return '';
  const items = (season === 'thanksgiving' ? LEAVES.map(leaf) : BULBS.map(bulb)).join('');
  return `<svg viewBox="0 0 1600 340" preserveAspectRatio="xMidYMin slice" width="100%" height="100%" aria-hidden="true"><g class="g-strand"><path d="${strand.d}" fill="none" stroke="${strand.stroke}" stroke-width="3"/>${items}</g><path class="g-hit" d="${strand.d}" fill="none" stroke="transparent" stroke-width="48"/></svg>`;
}

// Adds the layer and the wave-on-touch behaviour. Returns the layer (or null: no season, or reduced motion is on).
export function installGarland(season, doc = document, win = window) {
  if (!season || !STRANDS[season]) return null;
  const layer = doc.createElement('div');
  layer.className = 'garland';
  layer.dataset.season = season;
  layer.innerHTML = garlandSvg(season);
  doc.body.prepend(layer);
  if (win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return layer;
  const svg = layer.querySelector('svg'), hit = layer.querySelector('.g-hit'), strand = layer.querySelector('.g-strand');
  const done = () => layer.classList.remove('wave');
  strand.addEventListener('animationend', done);
  const over = (e) => {
    if (layer.classList.contains('wave')) return;
    const box = svg.getBoundingClientRect();
    const scale = Math.max(box.width / 1600, box.height / 340);
    if (e.clientY > box.top + 130 * scale || e.clientY < box.top) return;      // the string lives in the top strip: cheap early exit
    const ctm = hit.getScreenCTM?.();
    if (!ctm || !svg.createSVGPoint) return;
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    if (hit.isPointInStroke(p.matrixTransform(ctm.inverse()))) layer.classList.add('wave');
  };
  doc.addEventListener('pointermove', over, { passive: true });
  doc.addEventListener('pointerdown', over, { passive: true });          // a tap on a touch screen waves it too
  return layer;
}
