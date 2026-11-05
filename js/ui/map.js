// World map: layered SVG (terrain, regions, fog, trail, landmarks, pins, token). PRD 11A.
import { h } from './dom.js';
import { companionSvg } from './art.js';
import { REGIONS } from '../logic/species.js';
import { UNLOCKS, TOTAL_STEPS, LANDMARKS, isReached, isClaimed, unlockRequirement, claimLandmark } from '../logic/world.js';

const TRAIL = 'M 70 450 C 150 405, 200 485, 300 445 S 430 385, 520 428 S 705 445, 718 375 S 640 315, 560 335 S 470 275, 540 205 S 705 175, 665 110 S 485 80, 405 120 S 255 150, 225 210 S 120 250, 110 165 S 95 100, 150 70';
const COLORS = ['#8fd45f', '#4fb39d', '#e5784d', '#9a8ee0', '#5cbfe8', '#d3e2f6'];
const ISLAND = 'M30 470 C10 330 60 200 90 120 C130 20 300 30 420 40 C560 40 700 70 760 160 C800 260 780 420 700 500 C600 560 400 545 250 540 C120 545 45 530 30 470Z';
const NS = 'http://www.w3.org/2000/svg';
const reduceMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;


const INK = '#1d2433';
const mix = (hex, amt, to = 255) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - amt) + to * amt).toString(16).padStart(2, '0')).join('');
function prng(seed) { let a = (seed + 1) * 2654435761 >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Scatter points inside a region ellipse, keeping the middle clear for the pin and name.
function scatter(seed, n, cx, cy, rx, ry) {
  const r = prng(seed), pts = [];
  for (let tries = 0; pts.length < n && tries < 200; tries++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    const x = cx + Math.cos(a) * d * rx * 0.82, y = cy + Math.sin(a) * d * ry * 0.8;
    if (Math.abs(x - cx) < 48 && y > cy - 32 && y < cy + 48) continue;
    if (pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < 20)) continue;
    pts.push([x, y, r()]);
  }
  return pts;
}

const SCENERY = [
  // r1 Sunny Meadow: trees and flowers
  ([x, y, k]) => k < 0.5 ? `<g transform="translate(${x} ${y})"><rect x="-2" y="2" width="4" height="9" fill="#7a4a24"/><circle r="9" cy="-3" fill="#3f9a45" stroke="${INK}" stroke-width="2"/><circle r="3" cx="-3" cy="-6" fill="#8fd47c"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M0 0V8" stroke="#2f7a35" stroke-width="2"/>${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="2.6" ry="4" cy="-4" transform="rotate(${a})" fill="${k < 0.75 ? '#ff8fb1' : '#fff'}" stroke="${INK}" stroke-width="1"/>`).join('')}<circle r="2.2" fill="#f5c518"/></g>`,
  // r2 Misty Marsh: reeds and lily pads
  ([x, y, k]) => k < 0.5 ? `<g transform="translate(${x} ${y})" stroke="#2f6a35" stroke-width="2" stroke-linecap="round"><path d="M-4 8Q-6 -2 -3 -10M0 8V-12M4 8Q6 -2 3 -9" fill="none"/><ellipse cx="0" cy="-13" rx="2.4" ry="5" fill="#7a4a24" stroke="none"/></g>`
    : `<g transform="translate(${x} ${y})"><ellipse rx="10" ry="5" fill="#7cc96a" stroke="${INK}" stroke-width="1.6"/><path d="M0 0L9 -2" stroke="${INK}" stroke-width="1.4"/>${k > 0.8 ? '<circle cx="-2" cy="-1" r="2.4" fill="#ff9bc0"/>' : ''}</g>`,
  // r3 Ember Peaks: mountains and a lava vent
  ([x, y, k]) => k < 0.7 ? `<g transform="translate(${x} ${y})"><path d="M-14 8L0 -16L14 8Z" fill="#8c5a45" stroke="${INK}" stroke-width="2"/><path d="M-5 -6L0 -16L5 -6L2 -4L0 -7L-3 -4Z" fill="#fff" stroke="${INK}" stroke-width="1.2"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M-12 8L-4 -10H4L12 8Z" fill="#5b3a30" stroke="${INK}" stroke-width="2"/><path d="M-4 -10Q0 -20 4 -10Z" fill="#ff7a2f"/><circle cy="-18" r="3" fill="#ffb347" opacity=".8"/></g>`,
  // r4 Moonlit Highlands: rounded hills, stars, tiny moon
  ([x, y, k]) => k < 0.55 ? `<g transform="translate(${x} ${y})"><path d="M-16 8Q0 -18 16 8Z" fill="#7a6fc4" stroke="${INK}" stroke-width="2"/><path d="M-6 3Q0 -6 6 3" fill="none" stroke="#c9c2f5" stroke-width="2"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M0-8L2 -2L8 0L2 2L0 8L-2 2L-8 0L-2 -2Z" fill="#fff3a8" stroke="${INK}" stroke-width="1.4"/></g>`,
  // r5 Coral Reef: coral, shells, bubbles
  ([x, y, k]) => k < 0.5 ? `<g transform="translate(${x} ${y})" fill="none" stroke="${k < 0.25 ? '#ff6f91' : '#ff9f43'}" stroke-width="3.4" stroke-linecap="round"><path d="M0 9V-2M0 3Q-7 0 -8 -8M0 -1Q6 -3 7 -11M0 -2V-12"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M-8 4Q0 -12 8 4Z" fill="#ffd9c2" stroke="${INK}" stroke-width="1.8"/><path d="M0 4V-5M-4 4L-3 -3M4 4L3 -3" stroke="${INK}" stroke-width="1.2"/></g>`,
  // r6 Cloudspire: puffy clouds and a little spire
  ([x, y, k]) => k < 0.7 ? `<g transform="translate(${x} ${y})" fill="#fff" stroke="${INK}" stroke-width="1.8"><circle cx="-7" cy="1" r="6"/><circle cx="1" cy="-3" r="8"/><circle cx="9" cy="1" r="6"/><rect x="-12" y="2" width="27" height="6" stroke="none"/></g>`
    : `<g transform="translate(${x} ${y})"><rect x="-4" y="-6" width="8" height="14" fill="#cfd8ea" stroke="${INK}" stroke-width="1.8"/><path d="M-6 -6L0 -18L6 -6Z" fill="#6d86d6" stroke="${INK}" stroke-width="1.8"/></g>`,
];

function waves() {
  const r = prng(99); let out = '';
  for (let i = 0; i < 16; i++) {
    const x = r() * 760 + 10, y = r() * 520 + 20, w = 26 + r() * 22;
    out += `<path class="wave" style="animation-delay:${(-r() * 6).toFixed(1)}s" d="M${x} ${y}q${w / 4} -7 ${w / 2} 0t${w / 2} 0" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>`;
  }
  return out;
}

const CLOUDS = [[40, 70, 1.1, 70], [420, 310, 0.8, 95], [250, 470, 1.0, 120]].map(([x, y, sc, dur], i) =>
  `<g class="drift" style="animation-duration:${dur}s;animation-delay:${-i * 25}s" opacity=".55" pointer-events="none"><g transform="translate(${x} ${y}) scale(${sc})" fill="#fff"><ellipse cx="0" cy="0" rx="46" ry="14"/><circle cx="-14" cy="-10" r="14"/><circle cx="10" cy="-14" r="18"/><circle cx="28" cy="-6" r="11"/></g></g>`).join('');

const DEFS = (colors) => `<defs>
<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3ef"/><stop offset="1" stop-color="#3f9fd1"/></linearGradient>
<radialGradient id="sand" cx=".45" cy=".4" r=".8"><stop offset="0" stop-color="#fbf3da"/><stop offset="1" stop-color="#e8d7a6"/></radialGradient>
${colors.map((c, i) => `<radialGradient id="rg${i}" cx=".4" cy=".35" r=".85"><stop offset="0" stop-color="${mix(c, 0.45)}"/><stop offset=".7" stop-color="${c}"/><stop offset="1" stop-color="${mix(c, 0.25, 0)}"/></radialGradient>`).join('')}
<filter id="rough" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".011" numOctaves="1" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="14"/></filter>
<filter id="roughSmall" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="1" seed="9" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="8"/></filter>
<filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="3.5" flood-color="#1d2433" flood-opacity=".35"/></filter>
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="2"/><feColorMatrix values="0 0 0 0 .25  0 0 0 0 .2  0 0 0 0 .1  0 0 0 .55 0"/></filter>
<radialGradient id="vignette" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#0b1a33" stop-opacity="0"/><stop offset="1" stop-color="#0b1a33" stop-opacity=".38"/></radialGradient>
<clipPath id="mapclip"><rect width="800" height="560" rx="18"/></clipPath>
</defs>`;

function chest(open, glow) {
  return `<g class="chest-art">${glow ? '<circle r="18" fill="#fff3b8" opacity=".85" filter="url(#soft)"/><path class="twinkle" d="M14 -14L15.5 -10L19.5 -8.5L15.5 -7L14 -3L12.5 -7L8.5 -8.5L12.5 -10Z" fill="#f5c518" stroke="#1d2433" stroke-width="1"/>' : ''}<rect x="-11" y="-7" width="22" height="15" rx="3" fill="${open ? '#b9a98f' : '#b9702e'}" stroke="#1d2433" stroke-width="2.5"/>
<path d="M-11 -2 H11" stroke="#1d2433" stroke-width="2.5"/>${open ? '<path d="M-9 -7 Q0 -17 9 -7" fill="none" stroke="#1d2433" stroke-width="2.5"/>' : '<rect x="-3" y="-4" width="6" height="6" fill="#f5c518" stroke="#1d2433" stroke-width="2"/>'}</g>`;
}

function wrap(text, max = 17) {
  const words = text.split(' '), lines = [''];
  for (const w of words) { const cur = lines[lines.length - 1]; if ((cur + ' ' + w).trim().length > max) lines.push(w); else lines[lines.length - 1] = (cur + ' ' + w).trim(); }
  return lines;
}

export function mapSection(app) {
  const { store, audio } = app;
  const profile = app.profile;
  const unlocked = new Set(profile.map.unlockedRegions);
  const step = profile.map.trailStep;
  const wrapEl = h('div', { class: 'world-map' });
  const msg = h('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
  wrapEl.innerHTML = `<svg class="map" viewBox="0 0 800 560" role="group" aria-label="World map">
  ${DEFS(COLORS)}
  <g clip-path="url(#mapclip)">
  <rect width="800" height="560" fill="url(#water)"/>
  <g class="waves">${waves()}</g>
  <path d="${ISLAND}" fill="#fff" opacity=".55" stroke="#fff" stroke-width="22" stroke-linejoin="round" filter="url(#rough)"/>
  <g filter="url(#shadow)"><path d="${ISLAND}" fill="url(#sand)" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" filter="url(#rough)"/></g>
  <g class="layer-regions"></g>
  <path class="trail" d="${TRAIL}" fill="none" stroke="#fffdf2" stroke-width="10" stroke-linecap="round" stroke-dasharray="1 15" opacity=".95"/>
  <path class="trail-done" d="${TRAIL}" fill="none" stroke="#ff6a3d" stroke-width="7" stroke-linecap="round" filter="url(#glow)"/>
  <g class="layer-landmarks"></g><g class="layer-fog"></g><g class="layer-pins"></g>
  <g class="token" data-settled="false" style="pointer-events:none"></g>
  <g class="clouds">${CLOUDS}</g>
  <rect width="800" height="560" filter="url(#grain)" opacity=".16" pointer-events="none"/>
  <rect width="800" height="560" fill="url(#vignette)" pointer-events="none"/>
  <g transform="translate(748 512)" opacity=".85" pointer-events="none"><circle r="26" fill="#fff8e1" stroke="${INK}" stroke-width="2.5"/><path d="M0 -22L5 0L0 22L-5 0Z" fill="#e8573a" stroke="${INK}" stroke-width="1.5"/><path d="M-22 0L0 -5L22 0L0 5Z" fill="#fff" stroke="${INK}" stroke-width="1.5"/><text y="-28" text-anchor="middle" font-size="12" font-weight="bold" fill="${INK}" stroke="#fff" stroke-width="3" paint-order="stroke">N</text></g>
  </g></svg>`;
  const svg = wrapEl.firstElementChild;
  const path = svg.querySelector('.trail');
  const len = path.getTotalLength();
  const at = (n) => path.getPointAtLength((len * n) / TOTAL_STEPS);
  const token = svg.querySelector('.token');

  // Regions, fog and pins sit at the middle of each region's stretch of trail.
  let regions = '', fog = '', pins = '';
  REGIONS.forEach((r, i) => {
    const mid = at(i * 30 + 15);
    const open = unlocked.has(r.id);
    const deco = scatter(i * 7 + 3, 11, mid.x, mid.y, 86, 66).map(SCENERY[i]).join('');
    regions += `<g data-region="${r.id}"><g filter="url(#shadow)"><ellipse cx="${mid.x}" cy="${mid.y}" rx="86" ry="66" fill="url(#rg${i})" stroke="${INK}" stroke-width="3.2" filter="url(#roughSmall)"/></g>${deco}</g>`;
    if (!open) {
      const lines = wrap(unlockRequirement(i), 18), w = 150, hgt = 20 + lines.length * 15 + 22;
      const puffs = [[-62, 6, 40], [-32, -32, 44], [8, -42, 46], [46, -24, 44], [62, 12, 40], [30, 40, 44], [-14, 44, 44], [-44, 34, 40], [0, 0, 56]].map(([dx, dy, rr]) => `<circle cx="${mid.x + dx}" cy="${mid.y + dy}" r="${rr}"/>`).join('');
      fog += `<g class="fog" data-region="${r.id}" data-locked="true" role="img" aria-label="${r.name} is locked. ${unlockRequirement(i)}">
      <g class="fog-puffs" fill="#f3f6fb" opacity=".95" filter="url(#soft)">${puffs}</g>
      <g filter="url(#shadow)"><rect x="${mid.x - w / 2}" y="${mid.y - hgt / 2 + 2}" width="${w}" height="${hgt}" rx="10" fill="#fff8e1" stroke="${INK}" stroke-width="2.5"/></g>
      <g transform="translate(${mid.x} ${mid.y - hgt / 2 + 14})"><rect x="-6" y="-2" width="12" height="9" rx="2" fill="#f5c518" stroke="${INK}" stroke-width="1.8"/><path d="M-3.5 -2V-5.5a3.5 3.5 0 0 1 7 0V-2" fill="none" stroke="${INK}" stroke-width="1.8"/></g>
      <text text-anchor="middle" font-size="12.5" font-weight="bold" fill="${INK}">${lines.map((l, k) => `<tspan x="${mid.x}" y="${mid.y - hgt / 2 + 34 + k * 15}">${l}</tspan>`).join('')}</text></g>`;
    } else {
      pins += `<g class="pin nest-link" data-region="${r.id}" role="link" tabindex="0" aria-label="Open ${r.name} Nest" style="cursor:pointer">
      <g filter="url(#shadow)"><ellipse cx="${mid.x}" cy="${mid.y - 4}" rx="15" ry="19" fill="#fff6dc" stroke="${INK}" stroke-width="3"/></g><circle cx="${mid.x - 4}" cy="${mid.y}" r="3" fill="#e8c27a"/><circle cx="${mid.x + 5}" cy="${mid.y - 9}" r="2.4" fill="#e8c27a"/>
      <rect x="${mid.x - r.name.length * 4.1 - 8}" y="${mid.y + 22}" width="${r.name.length * 8.2 + 16}" height="22" rx="11" fill="#fff8e1" stroke="${INK}" stroke-width="2.2"/>
      <text x="${mid.x}" y="${mid.y + 38}" text-anchor="middle" font-size="13.5" font-weight="bold" fill="${INK}">${r.name}</text></g>`;
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

  // Landmarks: one chest every 10 steps, claimable once.
  function drawLandmarks() {
    svg.querySelector('.layer-landmarks').innerHTML = LANDMARKS.map((lm) => {
      const p = at(lm.step), reached = isReached(profile, lm), claimed = isClaimed(profile, lm), ready = reached && !claimed;
      const state = claimed ? 'claimed' : ready ? 'ready' : 'far';
      return `<g class="landmark ${state}" data-landmark="${lm.id}" transform="translate(${p.x} ${p.y})" opacity="${reached ? 1 : 0.55}" ${ready ? `role="button" tabindex="0" aria-label="Open treasure chest" style="cursor:pointer"` : 'aria-hidden="true"'}>${chest(claimed, ready)}</g>`;
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

  // Token: walks from where it was last shown to its new step (instantly under reduced motion).
  const tokenArt = `<ellipse class="token-ring" rx="22" ry="8" cy="2" fill="none" stroke="#ff6a3d" stroke-width="3" opacity="0"/><ellipse rx="15" ry="4.5" cy="1" fill="#1d2433" opacity=".28"/><g class="token-art"><g transform="translate(-27 -50)">${companionSvg(profile, { size: 54 })}</g></g>`;
  token.innerHTML = tokenArt;
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
