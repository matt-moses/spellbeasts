// World map (PRD 11A) drawn as a board-game path through a park: sky and hills, region patches with themed
// scenery, cream path tiles with yellow star stops, fog over locked regions, a region wheel, and the player's
// token on an orange podium. Layered SVG so regions can be added without redrawing.
import { h } from './dom.js';
import { companionSvg } from './art.js';
import { REGIONS } from '../logic/species.js';
import { UNLOCKS, TOTAL_STEPS, LANDMARKS, STEPS_PER_REGION, isReached, isClaimed, unlockRequirement, claimLandmark, regionOfStep } from '../logic/world.js';

const W = 800, H = 620;
const TRAIL = 'M 70 510 C 150 465, 200 545, 300 505 S 430 445, 520 488 S 705 505, 718 435 S 640 375, 560 395 S 470 335, 540 265 S 705 235, 665 170 S 485 140, 405 180 S 255 210, 225 270 S 120 310, 110 225 S 95 160, 150 130';
const COLORS = ['#8fd45f', '#4fb39d', '#e5784d', '#9a8ee0', '#5cbfe8', '#d3e2f6'];
const INK = '#1d2433';
const reduceMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const mix = (hex, amt, to = 255) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - amt) + to * amt).toString(16).padStart(2, '0')).join('');
function prng(seed) { let a = (seed + 1) * 2654435761 >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function wrap(text, max = 18) {
  const lines = [''];
  for (const w of text.split(' ')) { const cur = lines[lines.length - 1]; if ((cur + ' ' + w).trim().length > max) lines.push(w); else lines[lines.length - 1] = (cur + ' ' + w).trim(); }
  return lines;
}

// ---------- region scenery (scattered inside each region patch) ----------
function scatter(seed, n, cx, cy, rx, ry) {
  const r = prng(seed), pts = [];
  for (let tries = 0; pts.length < n && tries < 200; tries++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    const x = cx + Math.cos(a) * d * rx * 0.82, y = cy + Math.sin(a) * d * ry * 0.8;
    if (Math.abs(x - cx) < 40 && y > cy - 28 && y < cy + 28) continue;      // keep the path and pin clear
    if (pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < 20)) continue;
    pts.push([x, y, r()]);
  }
  return pts;
}
const SCENERY = [
  ([x, y, k]) => k < 0.5 ? `<g transform="translate(${x} ${y})"><rect x="-2" y="2" width="4" height="9" fill="#7a4a24"/><circle r="9" cy="-3" fill="#3f9a45" stroke="${INK}" stroke-width="2"/><circle r="3" cx="-3" cy="-6" fill="#8fd47c"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M0 0V8" stroke="#2f7a35" stroke-width="2"/>${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="2.6" ry="4" cy="-4" transform="rotate(${a})" fill="${k < 0.75 ? '#ff8fb1' : '#fff'}" stroke="${INK}" stroke-width="1"/>`).join('')}<circle r="2.2" fill="#f5c518"/></g>`,
  ([x, y, k]) => k < 0.5 ? `<g transform="translate(${x} ${y})" stroke="#2f6a35" stroke-width="2" stroke-linecap="round"><path d="M-4 8Q-6 -2 -3 -10M0 8V-12M4 8Q6 -2 3 -9" fill="none"/><ellipse cx="0" cy="-13" rx="2.4" ry="5" fill="#7a4a24" stroke="none"/></g>`
    : `<g transform="translate(${x} ${y})"><ellipse rx="10" ry="5" fill="#7cc96a" stroke="${INK}" stroke-width="1.6"/><path d="M0 0L9 -2" stroke="${INK}" stroke-width="1.4"/>${k > 0.8 ? '<circle cx="-2" cy="-1" r="2.4" fill="#ff9bc0"/>' : ''}</g>`,
  ([x, y, k]) => k < 0.7 ? `<g transform="translate(${x} ${y})"><path d="M-14 8L0 -16L14 8Z" fill="#8c5a45" stroke="${INK}" stroke-width="2"/><path d="M-5 -6L0 -16L5 -6L2 -4L0 -7L-3 -4Z" fill="#fff" stroke="${INK}" stroke-width="1.2"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M-12 8L-4 -10H4L12 8Z" fill="#5b3a30" stroke="${INK}" stroke-width="2"/><path d="M-4 -10Q0 -20 4 -10Z" fill="#ff7a2f"/><circle cy="-18" r="3" fill="#ffb347" opacity=".8"/></g>`,
  ([x, y, k]) => k < 0.55 ? `<g transform="translate(${x} ${y})"><path d="M-16 8Q0 -18 16 8Z" fill="#7a6fc4" stroke="${INK}" stroke-width="2"/><path d="M-6 3Q0 -6 6 3" fill="none" stroke="#c9c2f5" stroke-width="2"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M0-8L2 -2L8 0L2 2L0 8L-2 2L-8 0L-2 -2Z" fill="#fff3a8" stroke="${INK}" stroke-width="1.4"/></g>`,
  ([x, y, k]) => k < 0.5 ? `<g transform="translate(${x} ${y})" fill="none" stroke="${k < 0.25 ? '#ff6f91' : '#ff9f43'}" stroke-width="3.4" stroke-linecap="round"><path d="M0 9V-2M0 3Q-7 0 -8 -8M0 -1Q6 -3 7 -11M0 -2V-12"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M-8 4Q0 -12 8 4Z" fill="#ffd9c2" stroke="${INK}" stroke-width="1.8"/><path d="M0 4V-5M-4 4L-3 -3M4 4L3 -3" stroke="${INK}" stroke-width="1.2"/></g>`,
  ([x, y, k]) => k < 0.7 ? `<g transform="translate(${x} ${y})" fill="#fff" stroke="${INK}" stroke-width="1.8"><circle cx="-7" cy="1" r="6"/><circle cx="1" cy="-3" r="8"/><circle cx="9" cy="1" r="6"/><rect x="-12" y="2" width="27" height="6" stroke="none"/></g>`
    : `<g transform="translate(${x} ${y})"><rect x="-4" y="-6" width="8" height="14" fill="#cfd8ea" stroke="${INK}" stroke-width="1.8"/><path d="M-6 -6L0 -18L6 -6Z" fill="#6d86d6" stroke="${INK}" stroke-width="1.8"/></g>`,
];

// ---------- park props (flat shapes, scattered on the grass away from the path) ----------
const PROPS = [
  (x, y, k) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="3" rx="13" ry="4" fill="#000" opacity=".12"/><rect x="-3" y="-8" width="6" height="12" fill="#8a5a2e"/><circle cx="0" cy="-20" r="15" fill="${k < 0.5 ? '#2f9a45' : '#37a84f'}"/><circle cx="-6" cy="-24" r="6" fill="#5cc473" opacity=".8"/></g>`,
  (x, y) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="3" rx="13" ry="4" fill="#000" opacity=".12"/><rect x="-2.5" y="-6" width="5" height="10" fill="#8a5a2e"/><path d="M0 -42 L13 -18 H-13Z" fill="#1f7f3a"/><path d="M0 -34 L15 -8 H-15Z" fill="#269046"/></g>`,
  (x, y, k) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="2" rx="14" ry="4" fill="#000" opacity=".1"/><ellipse cx="-6" cy="-4" rx="9" ry="7" fill="#2f9a45"/><ellipse cx="6" cy="-5" rx="10" ry="8" fill="#37a84f"/>${k > 0.5 ? '<circle cx="-3" cy="-6" r="2" fill="#ff8fb1"/><circle cx="8" cy="-8" r="2" fill="#fff"/>' : ''}</g>`,
  (x, y, k) => `<g transform="translate(${x} ${y})">${[[-8, 0], [0, -4], [8, 1], [3, 5]].map(([dx, dy], i) => `<path d="M${dx} ${dy}v6" stroke="#2f7a35" stroke-width="2"/><circle cx="${dx}" cy="${dy}" r="3.6" fill="${['#ff8fb1', '#fff', '#ffd34d', '#b38cff'][(i + Math.floor(k * 4)) % 4]}"/><circle cx="${dx}" cy="${dy}" r="1.3" fill="#ffb21c"/>`).join('')}</g>`,
  (x, y) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="3" rx="8" ry="3" fill="#000" opacity=".12"/><rect x="-2.5" y="-46" width="5" height="50" rx="2" fill="#2aa6a0"/><circle cx="0" cy="-50" r="7" fill="#ffe27a"/><circle cx="0" cy="-50" r="12" fill="#fff6b0" opacity=".45"/></g>`,
  (x, y) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="4" rx="22" ry="4" fill="#000" opacity=".12"/><rect x="-18" y="-12" width="36" height="6" rx="2" fill="#a8693a"/><rect x="-18" y="-22" width="36" height="5" rx="2" fill="#b97a47"/><rect x="-15" y="-6" width="4" height="10" fill="#6f4423"/><rect x="11" y="-6" width="4" height="10" fill="#6f4423"/></g>`,
  (x, y) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="4" rx="26" ry="4" fill="#000" opacity=".12"/><path d="M-22 4L-12 -34H12L22 4M-12 -34L-16 4M12 -34L16 4" fill="none" stroke="#e5484d" stroke-width="3.4" stroke-linecap="round"/><path d="M-12 -34H12" stroke="#2aa6a0" stroke-width="5" stroke-linecap="round"/><path d="M-6 -33v22M6 -33v22" stroke="#555" stroke-width="1.6"/><rect x="-9" y="-12" width="6" height="3" rx="1" fill="#ffc928"/><rect x="3" y="-12" width="6" height="3" rx="1" fill="#2f7df6"/></g>`,
  (x, y) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="3" rx="11" ry="4" fill="#000" opacity=".12"/><ellipse cx="0" cy="-2" rx="10" ry="7" fill="#a9b3c2"/><ellipse cx="-3" cy="-5" rx="4" ry="2.4" fill="#d3dbe6"/></g>`,
];

function waveWheel(cx, cy, r, open, idx, face) {
  const pt = (deg, rad) => { const a = (deg * Math.PI) / 180; return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]; };
  const wedges = REGIONS.map((reg, i) => {
    const a0 = -90 + 60 * i, [x0, y0] = pt(a0, r), [x1, y1] = pt(a0 + 60, r), [tx, ty] = pt(a0 + 30, r * 0.66);
    const on = open.has(reg.id);
    return `<path d="M${cx} ${cy}L${x0} ${y0}A${r} ${r} 0 0 1 ${x1} ${y1}Z" fill="${on ? COLORS[i] : '#cfd6e2'}" stroke="#fff" stroke-width="2"/><text x="${tx}" y="${ty + 6}" text-anchor="middle" font-size="17" font-weight="bold" fill="${on ? '#fff' : '#8993a6'}" stroke="${on ? 'rgba(0,0,0,.25)' : 'none'}" stroke-width="2.5" paint-order="stroke">${i + 1}</text>`;
  }).join('');
  const dots = Array.from({ length: 16 }, (_, i) => { const [x, y] = pt(i * 22.5, r + 5); return `<circle cx="${x}" cy="${y}" r="1.9" fill="#fff" opacity=".9"/>`; }).join('');
  return `<g class="region-wheel" role="img" aria-label="Region wheel: you are in ${REGIONS[idx].name}. ${open.size} of 6 regions open." filter="url(#shadow)">
  <circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="#ffb21c"/>${wedges}<circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="none" stroke="#ffb21c" stroke-width="9"/>${dots}
  <circle cx="${cx}" cy="${cy}" r="21" fill="#fff" stroke="#ffb21c" stroke-width="5"/><g transform="translate(${cx - 16} ${cy - 18})">${face}</g>
  <g class="wheel-ptr" transform="rotate(${60 * idx + 30} ${cx} ${cy})"><circle cx="${cx}" cy="${cy - r - 15}" r="9" fill="#cdbcff" stroke="#fff" stroke-width="3"/><path d="M${cx - 6} ${cy - r - 9}L${cx + 6} ${cy - r - 9}L${cx} ${cy - r + 1}Z" fill="#cdbcff" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/></g></g>`;
}

function starTile(state) {
  const claimed = state === 'claimed', ready = state === 'ready';
  const fill = claimed ? '#a8bbe0' : '#4c7cf0';
  return `<g class="tile-art">${ready ? '<circle r="27" fill="#fff6b0" opacity=".95" filter="url(#soft)"/>' : ''}
  <path d="M0 -16L4.9 -5.3 16.5 -4.2 7.8 3.4 10.4 14.8 0 8.9 -10.4 14.8 -7.8 3.4 -16.5 -4.2 -4.9 -5.3Z" fill="${fill}" stroke="${claimed ? '#7d92c0' : '#2d4fb8'}" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M-7 -6L-1 -10" stroke="#fff" opacity=".75" stroke-width="3" stroke-linecap="round"/>
  ${claimed ? '<path d="M-6 1L-1.5 6 7 -4" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>' : ''}
  ${ready ? '<path class="twinkle" d="M16 -18L17.5 -14L21.5 -12.5L17.5 -11L16 -7L14.5 -11L10.5 -12.5L14.5 -14Z" fill="#ffc928" stroke="#1d2433" stroke-width="1"/>' : ''}</g>`;
}

const CLOUDS = [[40, 50, 1.0, 90], [520, 30, 0.8, 120], [300, 90, 0.7, 150]].map(([x, y, sc, dur], i) =>
  `<g class="drift" style="animation-duration:${dur}s;animation-delay:${-i * 30}s" opacity=".95" pointer-events="none"><g transform="translate(${x} ${y}) scale(${sc})" fill="#fff"><ellipse cx="0" cy="0" rx="46" ry="14"/><circle cx="-14" cy="-10" r="14"/><circle cx="10" cy="-14" r="18"/><circle cx="28" cy="-6" r="11"/></g></g>`).join('');

const DEFS = (colors) => `<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#76d3ff"/><stop offset="1" stop-color="#c9f0ff"/></linearGradient>
<linearGradient id="grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#63d261"/><stop offset="1" stop-color="#3fb350"/></linearGradient>
${colors.map((c, i) => `<radialGradient id="rg${i}" cx=".45" cy=".4" r=".8"><stop offset="0" stop-color="${mix(c, 0.4)}"/><stop offset="1" stop-color="${c}"/></radialGradient>`).join('')}
<filter id="roughSmall" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="1" seed="9" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="9"/></filter>
<filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#143c78" flood-opacity=".3"/></filter>
<filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8"/></filter>
<clipPath id="mapclip"><rect width="${W}" height="${H}" rx="22"/></clipPath>
</defs>`;

export function mapSection(app) {
  const { store, audio } = app;
  const profile = app.profile;
  const unlocked = new Set(profile.map.unlockedRegions);
  const step = profile.map.trailStep;
  const wrapEl = h('div', { class: 'world-map' });
  const msg = h('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
  wrapEl.innerHTML = `<svg class="map" viewBox="0 0 ${W} ${H}" role="group" aria-label="World map">
  ${DEFS(COLORS)}
  <g clip-path="url(#mapclip)">
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <path d="M0 150 Q90 112 190 138 T400 124 T610 138 T800 112 V${H} H0Z" fill="#45b84d"/>
  <path d="M0 178 Q120 142 260 170 T520 160 T800 150 V${H} H0Z" fill="url(#grass)"/>
  <g class="scene"><g class="layer-decor"></g><g class="layer-regions"></g></g>
  <path class="trail-edge" d="${TRAIL}" fill="none" stroke="#cbbd93" stroke-width="42" stroke-linecap="round" stroke-linejoin="round"/>
  <path class="trail" d="${TRAIL}" fill="none" stroke="#f7f0d8" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
  <g class="layer-ticks"></g><g class="layer-stops"></g>
  <path class="trail-done" d="${TRAIL}" fill="none" stroke="#ff6a3d" stroke-opacity=".38" stroke-width="34" stroke-linecap="round"/>
  <g class="layer-landmarks"></g><g class="layer-fog"></g><g class="layer-pins"></g>
  <g class="token" data-settled="false" style="pointer-events:none"></g>
  <g class="layer-wheel"></g>
  <g class="clouds">${CLOUDS}</g>
  </g></svg>`;
  const svg = wrapEl.firstElementChild;
  const path = svg.querySelector('.trail');
  const len = path.getTotalLength();
  const at = (n) => path.getPointAtLength((len * n) / TOTAL_STEPS);
  const token = svg.querySelector('.token');
  const samples = Array.from({ length: 140 }, (_, i) => path.getPointAtLength((len * i) / 139));
  const centers = REGIONS.map((_, i) => at(i * STEPS_PER_REGION + STEPS_PER_REGION / 2));

  // path tile joints and the yellow "stop" tiles that carry the star landmarks
  let ticks = '';
  for (let n = 1; n < TOTAL_STEPS; n++) {
    const a = at(n - 0.2), b = at(n + 0.2), p = at(n);
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    ticks += `<path d="M${p.x + nx * 15} ${p.y + ny * 15}L${p.x - nx * 15} ${p.y - ny * 15}" stroke="#d9cda6" stroke-width="2.2" stroke-linecap="round"/>`;
  }
  svg.querySelector('.layer-ticks').innerHTML = ticks;
  const seg = (len / TOTAL_STEPS) * 3.6;
  svg.querySelector('.layer-stops').innerHTML = LANDMARKS.map((lm) => {
    const off = -((len * lm.step) / TOTAL_STEPS - seg / 2);
    const dash = `stroke-dasharray="${seg} ${len * 2}" stroke-dashoffset="${off}"`;
    return `<path d="${TRAIL}" fill="none" stroke="#ff9f1c" stroke-width="42" ${dash}/><path d="${TRAIL}" fill="none" stroke="#ffc928" stroke-width="34" ${dash}/>`;
  }).join('');

  // park props on the grass, away from the path and the region patches
  const rnd = prng(5), placed = [];
  const clear = (x, y, pad) => samples.every((s) => Math.hypot(s.x - x, s.y - y) > pad + 16) && centers.every((c) => ((x - c.x) / (96 + pad)) ** 2 + ((y - c.y) / (72 + pad)) ** 2 > 1) && placed.every((q) => Math.hypot(q[0] - x, q[1] - y) > 34);
  for (let i = 0, tries = 0; i < 30 && tries < 900; tries++) {
    const x = 26 + rnd() * (W - 52), y = 175 + rnd() * (H - 200);
    if (!clear(x, y, 6)) continue;
    placed.push([x, y, rnd(), Math.floor(rnd() * PROPS.length)]); i++;
  }
  placed.sort((a, b) => a[1] - b[1]);
  svg.querySelector('.layer-decor').innerHTML = placed.map(([x, y, k, t]) => PROPS[t](x, y, k)).join('');

  // region patches, fog and pins
  let regions = '', fog = '', pins = '';
  REGIONS.forEach((r, i) => {
    const mid = centers[i], open = unlocked.has(r.id);
    const deco = scatter(i * 7 + 3, 11, mid.x, mid.y, 88, 66).map(SCENERY[i]).join('');
    regions += `<g data-region="${r.id}"><ellipse cx="${mid.x}" cy="${mid.y + 3}" rx="96" ry="72" fill="#000" opacity=".1"/><ellipse cx="${mid.x}" cy="${mid.y}" rx="92" ry="68" fill="url(#rg${i})" stroke="rgba(255,255,255,.7)" stroke-width="5" filter="url(#roughSmall)"/>${deco}</g>`;
    if (!open) {
      const lines = wrap(unlockRequirement(i)), w = 150, hgt = 20 + lines.length * 15 + 22;
      const puffs = [[-62, 6, 40], [-32, -32, 44], [8, -42, 46], [46, -24, 44], [62, 12, 40], [30, 40, 44], [-14, 44, 44], [-44, 34, 40], [0, 0, 56]].map(([dx, dy, rr]) => `<circle cx="${mid.x + dx}" cy="${mid.y + dy}" r="${rr}"/>`).join('');
      fog += `<g class="fog" data-region="${r.id}" data-locked="true" role="img" aria-label="${r.name} is locked. ${unlockRequirement(i)}">
      <g class="fog-puffs" fill="#f3f6fb" opacity=".96" filter="url(#soft)">${puffs}</g>
      <g filter="url(#shadow)"><rect x="${mid.x - w / 2}" y="${mid.y - hgt / 2 + 2}" width="${w}" height="${hgt}" rx="14" fill="#fff8e1" stroke="#ffb21c" stroke-width="3"/></g>
      <g transform="translate(${mid.x} ${mid.y - hgt / 2 + 14})"><rect x="-6" y="-2" width="12" height="9" rx="2" fill="#f5c518" stroke="${INK}" stroke-width="1.8"/><path d="M-3.5 -2V-5.5a3.5 3.5 0 0 1 7 0V-2" fill="none" stroke="${INK}" stroke-width="1.8"/></g>
      <text text-anchor="middle" font-size="12.5" font-weight="bold" fill="${INK}">${lines.map((l, k) => `<tspan x="${mid.x}" y="${mid.y - hgt / 2 + 34 + k * 15}">${l}</tspan>`).join('')}</text></g>`;
    } else {
      const py = mid.y - 50, label = r.name, lw = label.length * 8.4 + 22;
      pins += `<g class="pin nest-link" data-region="${r.id}" role="link" tabindex="0" aria-label="Open ${r.name} Nest" style="cursor:pointer">
      <g filter="url(#shadow)"><ellipse cx="${mid.x}" cy="${py + 12}" rx="27" ry="9" fill="#ff9f1c"/><ellipse cx="${mid.x}" cy="${py + 9}" rx="27" ry="9" fill="#ffc766"/>
      <path d="M${mid.x} ${py - 22}C${mid.x + 13} ${py - 22} ${mid.x + 19} ${py - 5} ${mid.x + 19} ${py + 1}A19 12 0 0 1 ${mid.x - 19} ${py + 1}C${mid.x - 19} ${py - 5} ${mid.x - 13} ${py - 22} ${mid.x} ${py - 22}Z" fill="#fff6dc"/></g>
      <circle cx="${mid.x - 5}" cy="${py - 2}" r="2.6" fill="#e8c27a"/><circle cx="${mid.x + 5}" cy="${py - 10}" r="2.2" fill="#e8c27a"/><circle cx="${mid.x + 6}" cy="${py + 1}" r="2" fill="#e8c27a"/>
      <rect x="${mid.x - lw / 2}" y="${py - 52}" width="${lw}" height="23" rx="11.5" fill="#fff" stroke="#ffb21c" stroke-width="2.5"/>
      <text x="${mid.x}" y="${py - 36}" text-anchor="middle" font-size="13.5" font-weight="bold" fill="${INK}">${label}</text></g>`;
    }
  });
  svg.querySelector('.layer-regions').innerHTML = regions;
  svg.querySelector('.layer-fog').innerHTML = fog;
  svg.querySelector('.layer-pins').innerHTML = pins;
  svg.querySelectorAll('.nest-link').forEach((el) => {
    const go = () => app.go(`/nest/${el.dataset.region}`);
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });

  // region wheel in the sky: coloured wedges for open regions, a pointer on the current one
  const cur = REGIONS.findIndex((r) => r.id === regionOfStep(Math.max(1, step)));
  svg.querySelector('.layer-wheel').innerHTML = waveWheel(400, 66, 46, unlocked, cur, companionSvg(profile, { size: 32 }));

  // star stops: one every 10 steps, claimable once
  function drawLandmarks() {
    svg.querySelector('.layer-landmarks').innerHTML = LANDMARKS.map((lm) => {
      const p = at(lm.step), reached = isReached(profile, lm), claimed = isClaimed(profile, lm), ready = reached && !claimed;
      const state = claimed ? 'claimed' : ready ? 'ready' : 'far';
      return `<g class="landmark ${state}" data-landmark="${lm.id}" transform="translate(${p.x} ${p.y})" opacity="${reached ? 1 : 0.6}" ${ready ? `role="button" tabindex="0" aria-label="Open treasure star" style="cursor:pointer"` : 'aria-hidden="true"'}>${starTile(state)}</g>`;
    }).join('');
    svg.querySelectorAll('.landmark.ready').forEach((el) => {
      const claim = () => {
        const r = claimLandmark(profile, el.dataset.landmark);
        if (!r.ok) return;
        store.save(); audio.play('chime');
        msg.textContent = `Treasure! You found ${r.crickets} crickets${r.boost ? ' and your egg got warmer!' : '!'}`;
        app.refreshStats?.();
        drawLandmarks();
      };
      el.addEventListener('click', claim);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); claim(); } });
    });
  }
  drawLandmarks();

  // Token: stands on an orange podium and walks from where it was last shown to its new step.
  token.innerHTML = `<ellipse rx="25" ry="9" cy="6" fill="#d97e00"/><ellipse rx="25" ry="9" cy="2" fill="#ffb74d"/><ellipse rx="17" ry="5.5" cy="1" fill="#ffd28a"/><ellipse class="token-ring" rx="30" ry="11" cy="3" fill="none" stroke="#fff" stroke-width="3" opacity="0"/><g class="token-art"><g transform="translate(-27 -52)">${companionSvg(profile, { size: 54 })}</g></g>`;
  const progress = svg.querySelector('.trail-done');
  const place = (n) => {
    const p = at(n);
    token.setAttribute('transform', `translate(${p.x} ${p.y})`);
    progress.setAttribute('stroke-dasharray', `${(len * n) / TOTAL_STEPS} ${len}`);
  };
  const from = Math.min(app.shownStep?.[app.profileId] ?? step, step);
  const settle = () => { token.dataset.settled = 'true'; token.dataset.step = String(step); app.shownStep = { ...(app.shownStep ?? {}), [app.profileId]: step }; };
  token.dataset.step = String(from);
  if (reduceMotion() || from === step) { place(step); settle(); }
  else {
    place(from);
    const dur = Math.min(1500, 250 * (step - from)), t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      place(from + (step - from) * k);
      if (k < 1 && token.isConnected) requestAnimationFrame(tick); else { place(step); settle(); }
    };
    requestAnimationFrame(tick);
  }
  wrapEl.append(msg);
  return wrapEl;
}
export { UNLOCKS };
