// World map (PRD 11A) drawn as a board-game path through a park: sky and hills, region patches with themed
// scenery, cream path tiles with yellow star stops, fog over locked regions, a region wheel, and the player's
// token on an orange podium. Layered SVG so regions can be added without redrawing.
import { h, icon } from './dom.js';
import { companionSvg } from './art.js';
import { REGIONS } from '../logic/species.js';
import { landCount } from '../config.js';
import { arenaOn } from '../config.js';
import { arenaOpen, ARENA_LEVEL } from '../logic/battle.js';
import { awardTrophies } from '../logic/collection.js';
import { TROPHIES } from '../logic/trophies.js';
import { UNLOCKS, TOTAL_STEPS, REGION_END, regionStart, LANDMARKS, isReached, isClaimed, unlockRequirement, claimLandmark, regionOfStep } from '../logic/world.js';

// The map is drawn for 9 lands (2800 wide), 12 (4100), 15 (5400), 21 (8000) or all 27 (10600): each trail is the previous one, carried on.
const LANDS = landCount();
const W = LANDS >= 27 ? 10600 : LANDS >= 21 ? 8000 : LANDS >= 15 ? 5400 : LANDS >= 12 ? 4100 : 2800, H = 620;
// One long winding trail through all the lands (Catmull-Rom through these points).
const ALL_POINTS = [[60, 520], [170, 450], [290, 520], [400, 540], [520, 470], [640, 400], [760, 330], [880, 380], [990, 470], [1110, 530], [1240, 480], [1350, 400], [1450, 320], [1570, 280], [1690, 350], [1800, 450], [1910, 520], [2030, 500], [2140, 430], [2250, 350], [2350, 290], [2460, 330], [2560, 420], [2660, 480], [2740, 430],
  [2850, 500], [2970, 540], [3090, 480], [3200, 400], [3310, 330], [3420, 290], [3530, 350], [3640, 450], [3750, 520], [3860, 500], [3960, 440], [4040, 400],
  [4150, 500], [4270, 540], [4390, 480], [4500, 400], [4610, 330], [4720, 290], [4830, 350], [4940, 450], [5050, 520], [5160, 500], [5260, 440], [5340, 400]];
// Lands 16-27 repeat the shape of lands 10-12, carried on 1300 further each time.
ALL_POINTS.push(...[1300, 2600, 3900, 5200].flatMap((dx) => ALL_POINTS.slice(37, 49).map(([x, y]) => [x + dx, y])));
const POINTS = ALL_POINTS.slice(0, LANDS >= 27 ? 97 : LANDS >= 21 ? 73 : LANDS >= 15 ? 49 : LANDS >= 12 ? 37 : 25);
function smooth(pts) {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}
const TRAIL = smooth(POINTS);
const COLORS = ['#8fd45f', '#4fb39d', '#e5784d', '#9a8ee0', '#5cbfe8', '#d3e2f6', '#b9a7e8', '#f0cf86', '#6f8de8', '#e8a24a', '#e08fa8', '#9fb59a', '#8fd0ec', '#2fb5a8', '#7a74e0', '#8a9ac8', '#c9a06a', '#6f6ab0', '#7fc78a', '#e6cf94', '#b79be6', '#f2a5c8', '#cfb27a', '#a8dcee', '#a7c96a', '#a47a52', '#6a68b8'].slice(0, REGIONS.length);
const INK = '#1d2433';
const reduceMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function hills(y, amp, seed) {
  const r = prng(seed + 40);
  let d = `M0 ${y}`;
  for (let x = 0; x < W; x += 260) d += ` Q${x + 90} ${y - amp * (0.4 + r())} ${x + 180} ${y - amp * 0.2 * r()} T${x + 260} ${y}`;
  return `${d} V${H} H0Z`;
}
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
  // r7 Crystal Caves: crystal clusters, stalagmites, glowing mushrooms
  ([x, y, k]) => k < 0.5 ? `<g transform="translate(${x} ${y})"><path d="M-8 8L-5 -10L0 8ZM0 8L4 -16L9 8ZM-2 8L2 -4L6 8Z" fill="${k < 0.25 ? '#c9a0ff' : '#8ee6ff'}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M-10 8L-3 -10L4 8Z" fill="#8c8aa0" stroke="${INK}" stroke-width="1.8"/>${k > 0.75 ? '<path d="M8 8V2" stroke="#e8e0ff" stroke-width="2"/><ellipse cx="8" cy="1" rx="5" ry="3.4" fill="#ff9bd2" stroke="#1d2433" stroke-width="1.4"/>' : ''}</g>`,
  // r8 Sunset Dunes: cacti, dune ripples, warm rocks
  ([x, y, k]) => k < 0.5 ? `<g transform="translate(${x} ${y})" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"><path d="M0 9V-10" stroke-width="6" stroke="#3f9a45"/><path d="M0 0H-7V-6M0 -3H7V-8" fill="none" stroke="#3f9a45" stroke-width="4"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M-16 8Q-6 -6 4 4T20 8" fill="none" stroke="#c99a4a" stroke-width="3" stroke-linecap="round"/><ellipse cx="10" cy="5" rx="6" ry="4" fill="#d9a066" stroke="${INK}" stroke-width="1.4"/></g>`,
  // r9 Starfall Isles: fallen stars, moon rocks, comets
  ([x, y, k]) => k < 0.55 ? `<g transform="translate(${x} ${y})"><path d="M0-10L3 -3L10 -2L4 3L6 10L0 6L-6 10L-4 3L-10 -2L-3 -3Z" fill="#ffe27a" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/></g>`
    : `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="3" rx="11" ry="7" fill="#c9d4f5" stroke="${INK}" stroke-width="1.6"/><circle cx="-3" cy="1" r="2" fill="#a4b2e0"/><path d="M12 -6L26 -14" stroke="#fff3a8" stroke-width="2.4" stroke-linecap="round" opacity=".8"/></g>`,
  // r10 Harvest Hollow: autumn trees, pumpkins, haystacks
  ([x, y, k]) => k < 0.4 ? `<g transform="translate(${x} ${y})"><rect x="-2" y="2" width="4" height="9" fill="#7a4a24"/><circle r="9" cy="-3" fill="${k < 0.2 ? '#e8782a' : '#f0b030'}" stroke="${INK}" stroke-width="2"/><circle r="3" cx="-3" cy="-6" fill="#ffd27a"/></g>`
    : k < 0.75 ? `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="2" rx="9" ry="7" fill="#f08a24" stroke="${INK}" stroke-width="1.8"/><path d="M-3 -4Q0 6 3 -4M-6 -2Q-5 5 -2 6M6 -2Q5 5 2 6" fill="none" stroke="#b85a10" stroke-width="1.2"/><path d="M0 -5V-9" stroke="#3f7a35" stroke-width="2.4" stroke-linecap="round"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M-11 8Q-11 -8 0 -9Q11 -8 11 8Z" fill="#e8c25a" stroke="${INK}" stroke-width="1.8"/><path d="M-6 6L-4 -3M0 7V-5M6 6L4 -3" stroke="#b8902a" stroke-width="1.2"/></g>`,
  // r11 Lantern Harbor: lamp posts, barrels, little boats
  ([x, y, k]) => k < 0.4 ? `<g transform="translate(${x} ${y})"><circle cy="-15" r="9" fill="#ffe27a" opacity=".5"/><rect x="-1.6" y="-12" width="3.2" height="20" fill="#3c4660" stroke="${INK}" stroke-width="1.2"/><rect x="-4.5" y="-19" width="9" height="9" rx="2" fill="#ffd23f" stroke="${INK}" stroke-width="1.6"/></g>`
    : k < 0.75 ? `<g transform="translate(${x} ${y})"><rect x="-7" y="-8" width="14" height="16" rx="4" fill="#a8693a" stroke="${INK}" stroke-width="1.8"/><path d="M-7 -3H7M-7 3H7" stroke="#5e3a1a" stroke-width="1.6"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M-13 2H13L8 9H-8Z" fill="#e5484d" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M0 2V-14" stroke="${INK}" stroke-width="2"/><path d="M1 -13L10 -2H1Z" fill="#fff" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/></g>`,
  // r12 Wishing Ruins: broken pillars, glowing stones, vines
  ([x, y, k]) => k < 0.45 ? `<g transform="translate(${x} ${y})"><path d="M-6 9V-8L-3 -11L0 -7L3 -12L6 -8V9Z" fill="#c9c3b0" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M-2 9V-4M2 9V-5" stroke="#9a947e" stroke-width="1.2"/><path d="M-6 2Q-9 -2 -7 -6" fill="none" stroke="#4f9a5a" stroke-width="2.2" stroke-linecap="round"/></g>`
    : k < 0.75 ? `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="3" rx="10" ry="6.5" fill="#b8b4a0" stroke="${INK}" stroke-width="1.6"/><path d="M0 -3L1.6 0.5L5 1L2.4 3.2L3.2 6.6L0 4.8L-3.2 6.6L-2.4 3.2L-5 1L-1.6 0.5Z" fill="#ffe27a" stroke="${INK}" stroke-width="1"/></g>`
    : `<g transform="translate(${x} ${y})" fill="none" stroke="#4f9a5a" stroke-width="2.4" stroke-linecap="round"><path d="M-8 8Q-10 -2 -4 -6Q2 -10 4 -3Q6 3 10 2"/><ellipse cx="-5" cy="-2" rx="3" ry="1.8" fill="#7cc96a" stroke="${INK}" stroke-width="1"/><ellipse cx="5" cy="-1" rx="3" ry="1.8" fill="#7cc96a" stroke="${INK}" stroke-width="1"/></g>`,
  // r13 Frostwood: snowy pines, snowmen, ice crystals
  ([x, y, k]) => k < 0.45 ? `<g transform="translate(${x} ${y})"><rect x="-2" y="4" width="4" height="7" fill="#6b4a2a"/><path d="M0-17L9-4H-9Z M0-9L12 4H-12Z" fill="#3f8f6a" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M-4-9L0-14L4-9ZM-7-1L0-6L7-1Z" fill="#fff" opacity=".9"/></g>`
    : k < 0.75 ? `<g transform="translate(${x} ${y})"><circle cy="5" r="7.5" fill="#fff" stroke="${INK}" stroke-width="1.8"/><circle cy="-5" r="5.5" fill="#fff" stroke="${INK}" stroke-width="1.8"/><circle cx="-2" cy="-6" r="0.9" fill="${INK}"/><circle cx="2" cy="-6" r="0.9" fill="${INK}"/><path d="M0-4L4-3" stroke="#f08a24" stroke-width="1.8" stroke-linecap="round"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M0-12L5-2L0 8L-5-2Z" fill="#bfe8ff" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M0-12V8M-5-2H5" stroke="#fff" stroke-width="1.2" opacity=".8"/><path d="M8 8L13-2L16 8Z" fill="#9fd4f2" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/></g>`,
  // r14 Sunken Bazaar: striped awnings, pots, coins
  ([x, y, k]) => k < 0.4 ? `<g transform="translate(${x} ${y})"><rect x="-10" y="-3" width="20" height="12" fill="#f5e2b0" stroke="${INK}" stroke-width="1.8"/><path d="M-12-3Q-12-12 0-12Q12-12 12-3Z" fill="#e5484d" stroke="${INK}" stroke-width="1.8"/><path d="M-4-3Q-4-12 0-12M4-3Q4-12 0-12" fill="none" stroke="#fff" stroke-width="2"/></g>`
    : k < 0.75 ? `<g transform="translate(${x} ${y})"><path d="M-6-8H6L9 2Q9 9 0 9Q-9 9-9 2Z" fill="#2fb5a8" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M-7-3H8" stroke="#d0f7f0" stroke-width="1.6"/><ellipse cy="-8" rx="6" ry="2" fill="#126a66" stroke="${INK}" stroke-width="1.4"/></g>`
    : `<g transform="translate(${x} ${y})"><circle cx="-4" cy="4" r="6" fill="#ffd23f" stroke="${INK}" stroke-width="1.6"/><circle cx="5" cy="1" r="6" fill="#ffe27a" stroke="${INK}" stroke-width="1.6"/><path d="M5-2V4" stroke="#b8902a" stroke-width="1.6"/><circle cx="12" cy="-8" r="2" fill="#bfeee9" opacity=".8"/></g>`,
  // r15 Starfall Summit: rocky peaks, shooting stars, moon rocks
  ([x, y, k]) => k < 0.4 ? `<g transform="translate(${x} ${y})"><path d="M-14 9L-3-12L4-3L8-9L16 9Z" fill="#8a93c0" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M-6-4L-3-12L1-6L-2-3Z" fill="#fff"/></g>`
    : k < 0.75 ? `<g transform="translate(${x} ${y})"><path d="M0-10L3-3L10-2L4 3L6 10L0 6L-6 10L-4 3L-10-2L-3-3Z" fill="#e9e4ff" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M12-8L28-18" stroke="#c8d4ff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/></g>`
    : `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="3" rx="11" ry="7" fill="#c8cbe8" stroke="${INK}" stroke-width="1.6"/><circle cx="3" cy="1" r="2.6" fill="#a4a8d0"/><circle cx="-4" cy="5" r="1.6" fill="#a4a8d0"/></g>`,
  // r16 Stormbreak Cliffs: storm clouds, jagged cliffs, lightning
  ([x, y, k]) => k < 0.45 ? `<g transform="translate(${x} ${y})"><circle cx="-7" cy="-6" r="7" fill="#7f8aa8" stroke="${INK}" stroke-width="1.8"/><circle cx="3" cy="-10" r="9" fill="#929db8" stroke="${INK}" stroke-width="1.8"/><circle cx="11" cy="-5" r="6" fill="#7f8aa8" stroke="${INK}" stroke-width="1.8"/><path d="M2-2L-3 6H1L-1 13L6 3H2Z" fill="#ffe14d" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/></g>`
    : k < 0.75 ? `<g transform="translate(${x} ${y})"><path d="M-12 9L-8-8L-2 0L3-12L9-1L13 9Z" fill="#7a86a8" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M-8-8L-5-2M3-12L5-5" stroke="#c8d0e8" stroke-width="1.6"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M-3-14L3-2H-1L2 10L-6-3H-2Z" fill="#ffe14d" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><ellipse cy="11" rx="9" ry="3" fill="#8a93b0" opacity=".6"/></g>`,
  // r17 Clockwork Glen: gears, clock posts, springs
  ([x, y, k]) => k < 0.45 ? `<g transform="translate(${x} ${y})"><circle r="10" fill="#d8a02a" stroke="${INK}" stroke-width="1.8"/><circle r="4" fill="#fff3c0" stroke="${INK}" stroke-width="1.4"/><path d="M0-14V-10M0 10V14M-14 0H-10M10 0H14M-10-10L-7-7M10-10L7-7M-10 10L-7 7M10 10L7 7" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></g>`
    : k < 0.75 ? `<g transform="translate(${x} ${y})"><rect x="-2" y="-2" width="4" height="12" fill="#8a5a2e"/><circle cy="-10" r="9" fill="#fff6dc" stroke="${INK}" stroke-width="1.8"/><path d="M0-10V-15M0-10L4-8" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M-6 9H6M-6 4H6M-6-1H6M-6-6H6" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><path d="M-6 9Q-9 6.5-6 4M6 4Q9 1.5 6-1M-6-1Q-9-3.5-6-6" fill="none" stroke="#b0b8c4" stroke-width="2"/></g>`,
  // r18 Glowcap Grotto: giant mushrooms, glowing spores
  ([x, y, k]) => k < 0.45 ? `<g transform="translate(${x} ${y})"><rect x="-3" y="-2" width="6" height="12" fill="#f4e6d0" stroke="${INK}" stroke-width="1.8"/><path d="M-14-2Q-14-16 0-16Q14-16 14-2Z" fill="#e8647a" stroke="${INK}" stroke-width="1.8"/><circle cx="-5" cy="-9" r="2" fill="#fff"/><circle cx="4" cy="-7" r="2.4" fill="#fff"/></g>`
    : k < 0.75 ? `<g transform="translate(${x} ${y})"><rect x="-2" y="0" width="4" height="9" fill="#d8f4f0" stroke="${INK}" stroke-width="1.6"/><path d="M-9 0Q-9-10 0-10Q9-10 9 0Z" fill="#35b8c4" stroke="${INK}" stroke-width="1.8"/><circle cy="-16" r="6" fill="#bff7ff" opacity=".45"/></g>`
    : `<g transform="translate(${x} ${y})"><circle cx="-6" cy="2" r="2.6" fill="#c8f4f8" opacity=".9"/><circle cx="4" cy="-6" r="2" fill="#ecd8ff" opacity=".9"/><circle cx="9" cy="5" r="3" fill="#ffd8e0" opacity=".9"/><circle cx="-2" cy="-10" r="1.6" fill="#fff"/></g>`,
  // r19 Bamboo Falls: bamboo, waterfalls, stepping stones
  ([x, y, k]) => k < 0.45 ? `<g transform="translate(${x} ${y})"><path d="M-6 9V-14M0 9V-18M6 9V-12" stroke="#4a8a24" stroke-width="4.5" stroke-linecap="round"/><path d="M-8-3H-4M-2-7H2M4-1H8" stroke="${INK}" stroke-width="1.4"/><path d="M0-14Q8-16 11-11" fill="none" stroke="#8fcf5a" stroke-width="3" stroke-linecap="round"/></g>`
    : k < 0.75 ? `<g transform="translate(${x} ${y})"><path d="M-8-12H8L10 10H-10Z" fill="#8a93a0" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M-3-12V10M3-12V10" stroke="#bfe6fa" stroke-width="3.5"/><ellipse cy="11" rx="12" ry="3.5" fill="#d4eefa" stroke="${INK}" stroke-width="1.4"/></g>`
    : `<g transform="translate(${x} ${y})"><ellipse cx="-5" cy="5" rx="7" ry="3.5" fill="#b8c0c8" stroke="${INK}" stroke-width="1.6"/><ellipse cx="7" cy="0" rx="6" ry="3" fill="#c8d0d8" stroke="${INK}" stroke-width="1.6"/><path d="M-12 9Q-8 7-4 9M2 4Q6 2 10 4" fill="none" stroke="#9fd4f2" stroke-width="1.6"/></g>`,
  // r20 Treasure Cove: chests, palms, anchors
  ([x, y, k]) => k < 0.45 ? `<g transform="translate(${x} ${y})"><rect x="-11" y="-2" width="22" height="12" rx="2" fill="#a8693a" stroke="${INK}" stroke-width="1.8"/><path d="M-11-2Q-11-12 0-12Q11-12 11-2Z" fill="#c4833f" stroke="${INK}" stroke-width="1.8"/><rect x="-2" y="-3" width="4" height="6" fill="#ffd23f" stroke="${INK}" stroke-width="1.2"/></g>`
    : k < 0.75 ? `<g transform="translate(${x} ${y})"><path d="M0 10Q-3-4 2-14" fill="none" stroke="#8a5a2e" stroke-width="4" stroke-linecap="round"/><path d="M2-14Q-8-16-12-8M2-14Q12-18 14-9M2-14Q-2-22 6-22" fill="none" stroke="#3fb870" stroke-width="3.5" stroke-linecap="round"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M0-12V8M-6-6H6M-9 2Q-9 9 0 9Q9 9 9 2" fill="none" stroke="#46546a" stroke-width="3" stroke-linecap="round"/><circle cy="-13" r="2.6" fill="none" stroke="#46546a" stroke-width="2.2"/></g>`,
  // r21 Rainbow Reach: rainbows, prism crystals, sparkles
  ([x, y, k]) => k < 0.45 ? `<g transform="translate(${x} ${y})"><path d="M-16 8Q-16-14 0-14Q16-14 16 8" fill="none" stroke="#ef5a5a" stroke-width="3.6"/><path d="M-12 8Q-12-10 0-10Q12-10 12 8" fill="none" stroke="#ffd23f" stroke-width="3.6"/><path d="M-8 8Q-8-6 0-6Q8-6 8 8" fill="none" stroke="#5cbfe8" stroke-width="3.6"/><circle cx="-18" cy="9" r="4" fill="#fff"/><circle cx="18" cy="9" r="4" fill="#fff"/></g>`
    : k < 0.75 ? `<g transform="translate(${x} ${y})"><path d="M0-13L8-3L0 9L-8-3Z" fill="#e0c8ff" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M0-13V9M-8-3H8" stroke="#fff" stroke-width="1.2" opacity=".8"/><path d="M11-8L16-12M12-3H18" stroke="#ff9fd0" stroke-width="2" stroke-linecap="round"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M0-10L2.5-3L10-2L4 3L6 10L0 6L-6 10L-4 3L-10-2L-2.5-3Z" fill="#fff6a8" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="-8" r="2" fill="#ff9fd0"/><circle cx="-12" cy="-6" r="1.6" fill="#9fe0ff"/></g>`,
  // r22 Sugarplum Meadows: gumdrops, lollipops, candy canes
  ([x, y, k]) => k < 0.45 ? `<g transform="translate(${x} ${y})"><path d="M-5-4H5V3Q5 9 0 9Q-5 9-5 3Z" fill="#f58ab8" stroke="${INK}" stroke-width="1.8"/><path d="M-5-4Q-5-12 0-12Q5-12 5-4" fill="#ffd1e6" stroke="${INK}" stroke-width="1.8"/><circle cx="-1.5" cy="-1" r="1.2" fill="#fff"/></g>`
    : k < 0.75 ? `<g transform="translate(${x} ${y})"><rect x="-1.6" y="-2" width="3.2" height="12" fill="#fff" stroke="${INK}" stroke-width="1.4"/><circle cy="-10" r="9" fill="#f5a14a" stroke="${INK}" stroke-width="1.8"/><path d="M0-10m-5 0a5 5 0 1 1 5 5" fill="none" stroke="#fff" stroke-width="2"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M-6 9V-6Q-6-14 2-14Q10-14 10-8" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M-6 9V-6Q-6-14 2-14Q10-14 10-8" fill="none" stroke="#e5484d" stroke-width="2" stroke-dasharray="4 4" stroke-linecap="round"/></g>`,
  // r23 Fossil Flats: bone arches, dino eggs, ferns
  ([x, y, k]) => k < 0.45 ? `<g transform="translate(${x} ${y})"><path d="M-14 6Q-14-6 0-6Q14-6 14 6" fill="none" stroke="#f3e7c9" stroke-width="3.5" stroke-linecap="round"/><path d="M-10 6V-2M-5 6V-5M0 6V-6M5 6V-5M10 6V-2" stroke="${INK}" stroke-width="2" stroke-linecap="round"/></g>`
    : k < 0.75 ? `<g transform="translate(${x} ${y})"><ellipse cy="2" rx="8" ry="10" fill="#e8d9a8" stroke="${INK}" stroke-width="1.8"/><path d="M-5-3L-2 0L-5 3M3-5L5-2L2 0" fill="none" stroke="#a38a52" stroke-width="1.5"/><circle cx="2" cy="6" r="1.6" fill="#a38a52"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M0 10Q-2 0 0-8" fill="none" stroke="#4a8a3a" stroke-width="3" stroke-linecap="round"/><path d="M0-8Q-12-10-14 0M0-4Q-10-4-12 4M0-8Q12-10 14 0M0-4Q10-4 12 4" fill="none" stroke="#6fb040" stroke-width="3" stroke-linecap="round"/></g>`,
  // r24 Aurora Ice Shelf: icebergs, igloos, aurora ribbons
  ([x, y, k]) => k < 0.45 ? `<g transform="translate(${x} ${y})"><path d="M-12 9L-6-6L0 0L5-12L13 9Z" fill="#d6eefa" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M5-12L2-4L7-2" fill="none" stroke="#fff" stroke-width="2"/></g>`
    : k < 0.75 ? `<g transform="translate(${x} ${y})"><path d="M-11 9Q-11-6 0-6Q11-6 11 9Z" fill="#fff" stroke="${INK}" stroke-width="1.8"/><path d="M-3 9V3Q-3 0 0 0Q3 0 3 3V9" fill="#6fb0c9" stroke="${INK}" stroke-width="1.5"/><path d="M-9 2H9M-6-3H6" stroke="#cfe3f0" stroke-width="1.2"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M-14-2Q-6-14 0-4Q6-14 14-2" fill="none" stroke="#5ad0c0" stroke-width="4" stroke-linecap="round" opacity=".85"/><path d="M-12 4Q-5-6 0 2Q5-6 12 4" fill="none" stroke="#a090d8" stroke-width="3" stroke-linecap="round" opacity=".85"/></g>`,
  // r25 Moonberry Orchard: fruit trees, baskets, fallen fruit
  ([x, y, k]) => k < 0.45 ? `<g transform="translate(${x} ${y})"><rect x="-2" y="2" width="4" height="9" fill="#7a4a2a" stroke="${INK}" stroke-width="1.4"/><circle r="10" cy="-5" fill="#a7c96a" stroke="${INK}" stroke-width="1.8"/><circle cx="-4" cy="-6" r="2.4" fill="#e5484d"/><circle cx="4" cy="-3" r="2.4" fill="#e5484d"/><circle cx="1" cy="-10" r="2.4" fill="#e5484d"/></g>`
    : k < 0.75 ? `<g transform="translate(${x} ${y})"><path d="M-9-2H9L7 9H-7Z" fill="#c9a06a" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M-9-2Q0-14 9-2" fill="none" stroke="#7a4a2a" stroke-width="2.4"/><circle cx="-3" cy="-4" r="3" fill="#e5484d" stroke="${INK}" stroke-width="1.2"/><circle cx="3" cy="-5" r="3" fill="#f0a070" stroke="${INK}" stroke-width="1.2"/></g>`
    : `<g transform="translate(${x} ${y})"><circle cx="-4" cy="3" r="6" fill="#e5484d" stroke="${INK}" stroke-width="1.6"/><circle cx="6" cy="5" r="5" fill="#8ab83a" stroke="${INK}" stroke-width="1.6"/><path d="M-4-3Q-2-7 1-7" fill="none" stroke="#4a8a3a" stroke-width="2" stroke-linecap="round"/></g>`,
  // r26 Lexicon Library: book stacks, scrolls, candles
  ([x, y, k]) => k < 0.45 ? `<g transform="translate(${x} ${y})"><rect x="-12" y="5" width="24" height="5" fill="#a03a4a" stroke="${INK}" stroke-width="1.6"/><rect x="-10" y="0" width="20" height="5" fill="#3a5a9a" stroke="${INK}" stroke-width="1.6"/><rect x="-8" y="-5" width="16" height="5" fill="#c8a050" stroke="${INK}" stroke-width="1.6"/></g>`
    : k < 0.75 ? `<g transform="translate(${x} ${y})"><path d="M-8-8H6Q10-8 10-4V6Q10 10 6 10H-8Z" fill="#f3e7c9" stroke="${INK}" stroke-width="1.8"/><path d="M-4-3H5M-4 1H5M-4 5H3" stroke="#a38a52" stroke-width="1.4"/><circle cx="-8" cy="1" r="3" fill="#e0c88a" stroke="${INK}" stroke-width="1.4"/></g>`
    : `<g transform="translate(${x} ${y})"><rect x="-3" y="-2" width="6" height="12" fill="#f5e9c8" stroke="${INK}" stroke-width="1.6"/><path d="M0-3Q-4-9 0-14Q4-9 0-3Z" fill="#ffb347" stroke="${INK}" stroke-width="1.4"/><ellipse cy="10" rx="8" ry="2.5" fill="#a47a52" stroke="${INK}" stroke-width="1.2"/></g>`,
  // r27 Slumber Sky: crescent moons, pillow clouds, stars
  ([x, y, k]) => k < 0.45 ? `<g transform="translate(${x} ${y})"><path d="M-6-12Q-14 0-4 11Q-10 0-2-8Q0-10-6-12Z" fill="#fff6a8" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M0-12Q14-6 8 7Q4 11-4 11Q8 4 0-12Z" fill="#f6e46a" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/></g>`
    : k < 0.75 ? `<g transform="translate(${x} ${y})"><ellipse cx="-4" cy="3" rx="10" ry="6" fill="#d9d8ff" stroke="${INK}" stroke-width="1.8"/><ellipse cx="6" cy="-2" rx="8" ry="5" fill="#ece8ff" stroke="${INK}" stroke-width="1.8"/><path d="M-8 3Q-4 6 0 3" fill="none" stroke="#8a86d6" stroke-width="1.4"/></g>`
    : `<g transform="translate(${x} ${y})"><path d="M0-10L2.5-3L10-2L4 3L6 10L0 6L-6 10L-4 3L-10-2L-2.5-3Z" fill="#ffe27a" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="-8" r="2" fill="#c8d4ff"/><circle cx="-12" cy="-6" r="1.6" fill="#fff"/></g>`,
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

// trees, pines, bushes and flowers are common; lamps, benches, swings and rocks are the occasional treat
const PROP_PICK = [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 5, 6, 7, 7];

function waveWheel(cx, cy, r, open, idx, face) {
  const n = REGIONS.length, span = 360 / n;
  const pt = (deg, rad) => { const a = (deg * Math.PI) / 180; return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]; };
  const wedges = REGIONS.map((reg, i) => {
    const a0 = -90 + span * i, [x0, y0] = pt(a0, r), [x1, y1] = pt(a0 + span, r), [tx, ty] = pt(a0 + span / 2, r * 0.7);
    const on = open.has(reg.id);
    return `<path d="M${cx} ${cy}L${x0} ${y0}A${r} ${r} 0 0 1 ${x1} ${y1}Z" fill="${on ? COLORS[i] : '#cfd6e2'}" stroke="#fff" stroke-width="2"/><text x="${tx}" y="${ty + 5}" text-anchor="middle" font-size="14" font-weight="bold" fill="${on ? '#fff' : '#8993a6'}" stroke="${on ? 'rgba(0,0,0,.25)' : 'none'}" stroke-width="2.5" paint-order="stroke">${i + 1}</text>`;
  }).join('');
  const dots = Array.from({ length: 18 }, (_, i) => { const [x, y] = pt(i * 20, r + 5); return `<circle cx="${x}" cy="${y}" r="1.8" fill="#fff" opacity=".9"/>`; }).join('');
  return `<g class="region-wheel" filter="url(#shadow)">
  <circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="#ffb21c"/>${wedges}<circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="none" stroke="#ffb21c" stroke-width="9"/>${dots}
  <circle cx="${cx}" cy="${cy}" r="19" fill="#fff" stroke="#ffb21c" stroke-width="5"/><g transform="translate(${cx - 16} ${cy - 18})">${face}</g>
  <g class="wheel-ptr" transform="rotate(${span * idx + span / 2} ${cx} ${cy})"><circle cx="${cx}" cy="${cy - r - 15}" r="9" fill="#cdbcff" stroke="#fff" stroke-width="3"/><path d="M${cx - 6} ${cy - r - 9}L${cx + 6} ${cy - r - 9}L${cx} ${cy - r + 1}Z" fill="#cdbcff" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/></g></g>`;
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

const CLOUDS = [[40, 50, 1.0, 190], [620, 30, 0.8, 230], [1100, 90, 0.7, 260], [1600, 40, 1.0, 210], [2150, 80, 0.8, 240], [2600, 30, 0.9, 200], ...(LANDS >= 12 ? [[3050, 60, 0.9, 220], [3500, 35, 0.8, 250], [3950, 80, 1.0, 210]] : []), ...(LANDS >= 15 ? [[4350, 55, 0.9, 230], [4800, 35, 1.0, 215], [5250, 85, 0.8, 245]] : []), ...(LANDS >= 21 ? [[5650, 50, 0.9, 225], [6100, 85, 0.8, 240], [6550, 35, 1.0, 210], [7000, 70, 0.9, 235], [7450, 40, 0.8, 250], [7850, 80, 1.0, 220]] : []), ...(LANDS >= 27 ? [[8250, 55, 0.9, 232], [8700, 80, 0.8, 244], [9150, 35, 1.0, 212], [9600, 70, 0.9, 238], [10050, 45, 0.8, 248], [10450, 85, 1.0, 222]] : [])].map(([x, y, sc, dur], i) =>
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

// Where a land's Arena flag stands: on the rim of the land's patch, as far as possible from the trail (so it never
// covers a path tile or a treasure star) and clear of the Nest pin and its name label above the centre.
function arenaSpot(mid, samples) {
  const clear = (x, y) => Math.min(...samples.map((p) => Math.hypot(Math.max(x - 38 - p.x, 0, p.x - (x + 38)), Math.max(y - 50 - p.y, 0, p.y - (y + 44)))));   // gap from the whole flag to the trail
  const free = (x, y) => y <= H - 60 && y >= 200 && x >= 50 && x <= W - 50;
  let best = null;
  for (let deg = 0; deg < 360; deg += 10) {          // first choice: on the rim of the patch, as far from the trail and the Nest pin as possible
    const a = (deg * Math.PI) / 180, x = mid.x + Math.cos(a) * 98, y = mid.y + Math.sin(a) * 78;
    if (!free(x, y)) continue;
    const trail = Math.min(...samples.map((p) => Math.hypot(p.x - x, p.y - y)));
    const nest = Math.min(Math.hypot(mid.x - x, mid.y - 50 - y), Math.hypot(mid.x - x, mid.y - 92 - y) + 10);
    const score = Math.min(trail, nest);
    if (!best || score > best.score) best = { x, y, score };
  }
  if (best && clear(best.x, best.y) >= 20) return best;
  // The trail runs too close to that spot (it can when lands sit close together): look further out, judging the whole flag.
  let wide = null;
  for (const [rx, ry] of [[98, 78], [112, 90], [126, 102], [140, 112], [154, 122], [168, 132]]) for (let deg = 0; deg < 360; deg += 5) {
    const a = (deg * Math.PI) / 180, x = mid.x + Math.cos(a) * rx, y = mid.y + Math.sin(a) * ry;
    if (!free(x, y)) continue;
    const nest = Math.min(Math.hypot(mid.x - x, mid.y - 50 - y), Math.hypot(mid.x - x, mid.y - 92 - y) + 10);
    const score = Math.min(clear(x, y), nest - 10);
    if (!wide || score > wide.score) wide = { x, y, score };
  }
  return wide ?? best ?? { x: mid.x + 70, y: mid.y + 40 };
}

// The Arena flag beside a land's Nest (PRD 12). Locked (grey, not a link) until the trainer reaches the Arena level.
function arenaPin(r, x, y, open) {
  const flag = open ? '#e5484d' : '#b8c2d4', pole = open ? '#8a5a2e' : '#8d97aa';
  const art = `<g filter="url(#shadow)"><ellipse cx="${x}" cy="${y + 15}" rx="19" ry="6.5" fill="${open ? '#d97e00' : '#9aa5b8'}"/><ellipse cx="${x}" cy="${y + 12}" rx="19" ry="6.5" fill="${open ? '#ffc766' : '#d5dbe6'}"/>
      <rect x="${x - 1.8}" y="${y - 24}" width="3.6" height="37" rx="1.8" fill="${pole}"/><path d="M${x + 1.5} ${y - 24} L${x + 25} ${y - 16} L${x + 1.5} ${y - 7}z" fill="${flag}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/></g>
      ${open ? `<path d="M${x + 9} ${y - 20.500} l1.300 2.700 3 .400 -2.200 2.100 .500 3 -2.600 -1.400 -2.600 1.400 .500 -3 -2.200 -2.100 3 -.400z" fill="#ffe14d"/>` : `<g transform="translate(${x + 8} ${y - 15})"><rect x="-4" y="-1" width="8" height="6" rx="1.500" fill="#f5c518" stroke="${INK}" stroke-width="1.300"/><path d="M-2.300 -1V-3.200a2.300 2.300 0 0 1 4.600 0V-1" fill="none" stroke="${INK}" stroke-width="1.300"/></g>`}
      <rect x="${x - 24}" y="${y + 20}" width="48" height="17" rx="8.500" fill="#fff" stroke="${open ? '#e5484d' : '#b8c2d4'}" stroke-width="2"/>
      <text x="${x}" y="${y + 32.500}" text-anchor="middle" font-size="11" font-weight="bold" fill="${INK}">Arena</text>`;
  const big = `<g transform="translate(${x} ${y}) scale(1.3) translate(${-x} ${-y})">${art}</g>`;
  return open
    ? `<g class="pin arena-link" data-region="${r.id}" role="link" tabindex="0" aria-label="Open ${r.name} Arena" style="cursor:pointer">${big}</g>`
    : `<g class="arena-pin-locked" data-region="${r.id}" role="img" aria-label="${r.name} Arena. Opens at level ${ARENA_LEVEL}">${big}</g>`;
}

export function mapSection(app) {
  const { store, audio } = app;
  const profile = app.profile;
  const unlocked = new Set(profile.map.unlockedRegions);
  const step = profile.map.trailStep;
  const wrapEl = h('div', { class: 'world-map' });
  const msg = h('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
  wrapEl.innerHTML = `<div class="map-frame"><div class="map-scroll" tabindex="0" role="region" aria-label="World map. Scroll sideways to explore new lands.">
  <svg class="map" viewBox="0 0 ${W} ${H}" role="group" aria-label="World map">
  ${DEFS(COLORS)}
  <g clip-path="url(#mapclip)">
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <path d="${hills(150, 36, 1)}" fill="#45b84d"/>
  <path d="${hills(178, 30, 2)}" fill="url(#grass)"/>
  <g class="scene"><g class="layer-decor"></g><g class="layer-regions"></g></g>
  <path class="trail-edge" d="${TRAIL}" fill="none" stroke="#cbbd93" stroke-width="42" stroke-linecap="round" stroke-linejoin="round"/>
  <path class="trail" d="${TRAIL}" fill="none" stroke="#f7f0d8" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
  <g class="layer-ticks"></g><g class="layer-stops"></g>
  <path class="trail-done" d="${TRAIL}" fill="none" stroke="#ff6a3d" stroke-opacity=".38" stroke-width="34" stroke-linecap="round"/>
  <g class="layer-landmarks"></g><g class="layer-fog"></g><g class="layer-pins"></g><g class="layer-sign"></g>
  <g class="token" data-settled="false" style="pointer-events:none"></g>
  <g class="clouds">${CLOUDS}</g>
  </g></svg></div>
  <div class="wheel-wrap"><svg viewBox="0 0 150 150" width="132" height="132" role="img" class="wheel-svg"></svg></div>
  <button class="map-arrow left" type="button" aria-label="Scroll the map left"></button><button class="map-arrow right" type="button" aria-label="Scroll the map right"></button></div>
  <p class="map-hint">Drag, swipe or use the arrows to explore new lands.</p>`;
  const svg = wrapEl.querySelector('svg.map');
  const scroller = wrapEl.querySelector('.map-scroll');
  const path = svg.querySelector('.trail');
  const len = path.getTotalLength();
  const at = (n) => path.getPointAtLength((len * n) / TOTAL_STEPS);
  const token = svg.querySelector('.token');
  const samples = Array.from({ length: 420 }, (_, i) => path.getPointAtLength((len * i) / 419));
  const fine = Array.from({ length: Math.ceil(len / 6) + 1 }, (_, i) => path.getPointAtLength(Math.min(len, i * 6)));   // for the Arena flags: a long trail needs a closer look than 420 points give
  const centers = REGIONS.map((_, i) => at((regionStart(i) + REGION_END[i]) / 2));

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
  for (let i = 0, tries = 0; i < Math.round((80 * W) / 2800) && tries < 2400 * (W / 2800); tries++) {
    const x = 26 + rnd() * (W - 52), y = 185 + rnd() * (H - 210);
    if (!clear(x, y, 6)) continue;
    placed.push([x, y, rnd(), PROP_PICK[Math.floor(rnd() * PROP_PICK.length)]]); i++;
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
      if (arenaOn()) { const spot = arenaSpot(mid, fine.filter((p) => Math.abs(p.x - mid.x) < 260)); pins += arenaPin(r, spot.x, spot.y - 8, arenaOpen(profile)); }
    }
  });
  svg.querySelector('.layer-regions').innerHTML = regions;
  svg.querySelector('.layer-fog').innerHTML = fog;
  svg.querySelector('.layer-pins').innerHTML = pins;
  svg.querySelectorAll('.arena-link').forEach((el) => {
    const go = () => app.go(`/arena/${el.dataset.region}`);
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
  svg.querySelectorAll('.nest-link').forEach((el) => {
    const go = () => app.go(`/nest/${el.dataset.region}`);
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });

  // region wheel in the sky: coloured wedges for open regions, a pointer on the current one
  const cur = REGIONS.findIndex((r) => r.id === regionOfStep(Math.max(1, step)));
  const wheel = wrapEl.querySelector('.wheel-svg');
  wheel.innerHTML = waveWheel(75, 78, 46, unlocked, cur, companionSvg(profile, { size: 32 }));
  wheel.setAttribute('aria-label', `Region wheel: you are in ${REGIONS[cur].name}. ${unlocked.size} of ${REGIONS.length} lands open.`);
  const endPt = at(TOTAL_STEPS);
  svg.querySelector('.layer-sign').innerHTML = `<g transform="translate(${endPt.x + 8} ${endPt.y - 34})"><rect x="-2" y="0" width="5" height="40" fill="#8a5a2e"/><rect x="-46" y="-26" width="96" height="30" rx="8" fill="#fff8e1" stroke="#ffb21c" stroke-width="3"/><text x="2" y="-15" text-anchor="middle" font-size="11" font-weight="bold" fill="${INK}">More lands</text><text x="2" y="-2" text-anchor="middle" font-size="11" font-weight="bold" fill="${INK}">coming soon!</text></g>`;

  // Scrolling: native scroll + mouse drag + arrow buttons; the view follows the token.
  const scale = () => svg.getBoundingClientRect().width / W;
  const scrollToX = (x, smoothly = false) => scroller.scrollTo({ left: Math.max(0, x * scale() - scroller.clientWidth / 2), behavior: smoothly && !reduceMotion() ? 'smooth' : 'auto' });
  const arrows = wrapEl.querySelectorAll('.map-arrow');
  arrows[0].append(icon('chevL')); arrows[1].append(icon('chevR'));
  const syncArrows = () => { arrows[0].disabled = scroller.scrollLeft < 4; arrows[1].disabled = scroller.scrollLeft > scroller.scrollWidth - scroller.clientWidth - 4; };
  arrows[0].addEventListener('click', () => scroller.scrollBy({ left: -scroller.clientWidth * 0.7, behavior: reduceMotion() ? 'auto' : 'smooth' }));
  arrows[1].addEventListener('click', () => scroller.scrollBy({ left: scroller.clientWidth * 0.7, behavior: reduceMotion() ? 'auto' : 'smooth' }));
  scroller.addEventListener('scroll', syncArrows, { passive: true });
  let drag = null, justDragged = false;
  scroller.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button === 0) drag = { x: e.clientX, left: scroller.scrollLeft, moved: false }; });
  const move = (e) => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 6) { drag.moved = true; scroller.classList.add('dragging'); } if (drag.moved) scroller.scrollLeft = drag.left - dx; };
  const up = () => { if (drag?.moved) { justDragged = true; setTimeout(() => { justDragged = false; }, 0); } drag = null; scroller.classList.remove('dragging'); };
  document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
  app.cleanup?.push(() => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); });
  scroller.addEventListener('click', (e) => { if (justDragged) { e.stopPropagation(); e.preventDefault(); } }, true);

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
        const won = awardTrophies(profile, app.today());
        store.save();
        msg.textContent = `Treasure! You found ${r.crickets} crickets and a berry${r.boost ? ', and your egg got warmer!' : '!'}${won.length ? ` New trophy: ${won.map((id) => TROPHIES.find((t) => t.id === id).name).join(', ')}!` : ''}`;
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
  const here = (n) => at(n).x;
  const centre = (n, smoothly) => requestAnimationFrame(() => { scrollToX(here(n), smoothly); syncArrows(); });
  if (reduceMotion() || from === step) { place(step); settle(); centre(step, false); }
  else {
    place(from); centre(from, false);
    const dur = Math.min(1500, 250 * (step - from)), t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const cursor = from + (step - from) * k;
      place(cursor); scrollToX(here(cursor), false);
      if (k < 1 && token.isConnected) requestAnimationFrame(tick); else { place(step); settle(); syncArrows(); }
    };
    requestAnimationFrame(tick);
  }
  wrapEl.append(msg);
  return wrapEl;
}
export { UNLOCKS };
