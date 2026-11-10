// Parametric inline-SVG creature builder. Every species/stage is composed from drawn parts
// (bodies, ears, tails, horns, wings...) using each species' palette; stages add parts and grow.
import { speciesById, stageName } from '../logic/species.js';

const INK = '#1d2433';
const st = (w = 3.5) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const ST = st();
const GOLD = '#f5c518';

const BODIES = {
  round: { top: 35, side: 30, fy: 58, draw: (c) => `<ellipse cx="50" cy="62" rx="30" ry="27" fill="${c[0]}" ${ST}/>`, belly: [50, 68, 17, 14] },
  tall: { top: 25, side: 24, fy: 50, draw: (c) => `<ellipse cx="50" cy="58" rx="24" ry="33" fill="${c[0]}" ${ST}/>`, belly: [50, 68, 14, 17] },
  wide: { top: 44, side: 36, fy: 62, draw: (c) => `<ellipse cx="50" cy="68" rx="36" ry="24" fill="${c[0]}" ${ST}/>`, belly: [50, 74, 22, 11] },
  block: { top: 36, side: 30, fy: 58, draw: (c) => `<rect x="20" y="36" width="60" height="52" rx="16" fill="${c[0]}" ${ST}/>`, belly: null },
  long: { top: 24, side: 20, fy: 44, draw: (c) => `<ellipse cx="50" cy="70" rx="34" ry="19" fill="${c[0]}" ${ST}/><ellipse cx="50" cy="45" rx="21" ry="21" fill="${c[0]}" ${ST}/><path d="M34 62 Q50 72 66 62" fill="${c[0]}"/>`, belly: [50, 74, 22, 9] },
};

const mirror = (fn) => fn(1) + fn(-1);
const X = (sign, dx) => 50 + sign * dx;

const EARS = {
  point: (b) => mirror((s) => `<path d="M${X(s, 20)} ${b.top + 8} L${X(s, 24)} ${b.top - 14} L${X(s, 4)} ${b.top + 2}z" fill="var(--c0)" ${ST}/>`),
  round: (b) => mirror((s) => `<circle cx="${X(s, 20)}" cy="${b.top + 4}" r="9" fill="var(--c0)" ${ST}/><circle cx="${X(s, 20)}" cy="${b.top + 4}" r="4" fill="var(--c2)"/>`),
  long: (b) => mirror((s) => `<ellipse cx="${X(s, 11)}" cy="${b.top - 8}" rx="7" ry="18" transform="rotate(${-s * 8} ${X(s, 11)} ${b.top - 8})" fill="var(--c0)" ${ST}/><ellipse cx="${X(s, 11)}" cy="${b.top - 8}" rx="3" ry="11" transform="rotate(${-s * 8} ${X(s, 11)} ${b.top - 8})" fill="var(--c2)"/>`),
  fin: (b) => mirror((s) => `<path d="M${X(s, b.side - 2)} ${b.fy - 8} L${X(s, b.side + 15)} ${b.fy - 20} L${X(s, b.side + 9)} ${b.fy + 6}z" fill="var(--c1)" ${ST}/>`),
  none: () => '',
};

const TAILS = {
  fluff: () => `<ellipse cx="82" cy="70" rx="13" ry="9" transform="rotate(-30 82 70)" fill="var(--c0)" ${ST}/><ellipse cx="87" cy="64" rx="5" ry="4" fill="var(--c2)"/>`,
  tuft: () => `<circle cx="80" cy="80" r="8" fill="var(--c1)" ${ST}/>`,
  flame: () => `<path d="M76 82 Q98 78 92 54 Q86 68 76 68z" fill="#ffb347" ${ST}/><path d="M80 78 Q91 74 89 63 Q85 70 79 71z" fill="#fff0a8"/>`,
  curl: () => `<path d="M72 82 Q98 84 92 62 Q88 54 80 60" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M72 82 Q98 84 92 62 Q88 54 80 60" fill="none" stroke="var(--c0)" stroke-width="7" stroke-linecap="round"/>`,
  none: () => '',
};

// Parts drawn behind the body.
const BACK = {
  wings: (b) => mirror((s) => `<ellipse cx="${X(s, b.side + 3)}" cy="${b.fy + 6}" rx="13" ry="21" transform="rotate(${-s * 25} ${X(s, b.side + 3)} ${b.fy + 6})" fill="var(--c2)" ${ST}/>`),
  bigwings: (b) => mirror((s) => `<path d="M${X(s, b.side - 4)} ${b.fy + 10} Q${X(s, b.side + 26)} ${b.fy - 34} ${X(s, b.side + 22)} ${b.fy + 14} Q${X(s, b.side + 12)} ${b.fy + 20} ${X(s, b.side - 4)} ${b.fy + 20}z" fill="var(--c2)" ${ST}/>`),
  mane: (b) => `<circle cx="50" cy="${b.fy}" r="${b.side + 9}" fill="var(--c1)" ${ST}/>`,
  spikes: (b) => [38, 50, 62].map((x) => `<path d="M${x - 7} ${b.top + 8} L${x} ${b.top - 9} L${x + 7} ${b.top + 8}z" fill="var(--c1)" ${ST}/>`).join(''),
  tentacles: () => [34, 50, 66].map((x, i) => `<ellipse cx="${x}" cy="${92 + (i === 1 ? 2 : 0)}" rx="6" ry="9" fill="var(--c0)" ${ST}/>`).join(''),
  batwings: (b) => mirror((s) => `<path d="M${X(s, b.side - 8)} ${b.fy - 2} L${X(s, b.side + 22)} ${b.fy - 24} L${X(s, b.side + 19)} ${b.fy - 7} L${X(s, b.side + 27)} ${b.fy + 2} L${X(s, b.side + 16)} ${b.fy + 5} L${X(s, b.side + 19)} ${b.fy + 16} L${X(s, b.side - 8)} ${b.fy + 14}z" fill="var(--c1)" ${ST}/>`),
  cape: (b) => `<path d="M${50 - b.side + 4} ${b.fy - 6} Q50 ${b.fy - 16} ${50 + b.side - 4} ${b.fy - 6} L${50 + b.side + 11} 93 Q50 84 ${50 - b.side - 11} 93z" fill="#d1495b" ${ST}/>`,
  shell: () => `<ellipse cx="50" cy="64" rx="39" ry="32" fill="var(--c1)" ${ST}/><path d="M50 32 V96" stroke="${INK}" stroke-width="3"/>`,
};

// Parts drawn on top of the body, before the face.
const FRONT = {
  antlers: (b) => mirror((s) => { const d = `M${X(s, 8)} ${b.top + 7} Q${X(s, 9)} ${b.top - 6} ${X(s, 19)} ${b.top - 17} M${X(s, 10)} ${b.top - 3} L${X(s, 22)} ${b.top - 3} M${X(s, 14)} ${b.top - 11} L${X(s, 8)} ${b.top - 20}`; return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#e6c88f" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`; }),
  pincers: (b) => mirror((s) => { const cx = X(s, b.side + 9), cy = b.fy - 6; return `<path d="M${X(s, b.side - 6)} ${b.fy + 8} L${cx} ${cy + 6}" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M${X(s, b.side - 6)} ${b.fy + 8} L${cx} ${cy + 6}" fill="none" stroke="var(--c1)" stroke-width="4.5" stroke-linecap="round"/><path d="M${cx} ${cy} L${cx - 5} ${cy - 10} A11.2 11.2 0 1 0 ${cx + 5} ${cy - 10}z" fill="var(--c0)" ${ST}/>`; }),
  claws: () => mirror((s) => `<path d="M${X(s, 14)} 91 l3 8 l3 -8z" fill="#fff" ${st(2)}/>`),
  helmet: (b) => `<path d="M${50 - b.side + 4} ${b.top + 14} Q50 ${b.top - 16} ${50 + b.side - 4} ${b.top + 14}z" fill="#9aa5b8" ${ST}/><path d="M50 ${b.top - 8} q6 -10 12 -4 q-4 4 -8 6z" fill="#e8573a" ${st(2.5)}/>`,
  hat: (b) => `<ellipse cx="50" cy="${b.top + 8}" rx="22" ry="5" fill="var(--c1)" ${ST}/><path d="M37 ${b.top + 8} L52 ${b.top - 22} L63 ${b.top + 8}z" fill="var(--c1)" ${ST}/><circle cx="52" cy="${b.top - 4}" r="3" fill="${GOLD}"/>`,
  crown: (b) => `<path d="M35 ${b.top + 6} L37 ${b.top - 8} L44 ${b.top + 1} L50 ${b.top - 12} L56 ${b.top + 1} L63 ${b.top - 8} L65 ${b.top + 6}z" fill="${GOLD}" ${ST}/>`,
  horns: (b) => mirror((s) => `<path d="M${X(s, 10)} ${b.top + 6} Q${X(s, 18)} ${b.top - 6} ${X(s, 13)} ${b.top - 15} Q${X(s, 4)} ${b.top - 4} ${X(s, 2)} ${b.top + 4}z" fill="#f4ead2" ${st(3)}/>`),
  crystals: (b) => [[36, 6], [50, -2], [64, 6]].map(([x, d], i) => `<path d="M${x} ${b.top + 10 + d} L${x - 6} ${b.top + 2 + d} L${x} ${b.top - 12 + d} L${x + 6} ${b.top + 2 + d}z" fill="${i === 1 ? '#8ee6ff' : '#b7f0ff'}" ${st(2.5)}/>`).join(''),
  antennae: (b) => mirror((s) => `<path d="M${X(s, 6)} ${b.top + 4} Q${X(s, 12)} ${b.top - 10} ${X(s, 18)} ${b.top - 12}" fill="none" ${st(3)}/><circle cx="${X(s, 19)}" cy="${b.top - 13}" r="4" fill="var(--c2)" ${st(2.5)}/>`),
  beak: (b) => `<path d="M44 ${b.fy + 3} L56 ${b.fy + 3} L50 ${b.fy + 14}z" fill="#f2a900" ${st(2.5)}/>`,
  lantern: () => `<circle cx="80" cy="36" r="13" fill="#fff3b8" opacity=".5"/><circle cx="80" cy="36" r="7" fill="#fff3b8" ${st(2.5)}/><path d="M80 29 Q74 18 66 20" fill="none" ${st(2.5)}/>`,
  leafy: (b) => `<ellipse cx="40" cy="${b.top + 2}" rx="5" ry="10" transform="rotate(-25 40 ${b.top + 2})" fill="#6fbf5a" ${st(2.5)}/><ellipse cx="58" cy="${b.top}" rx="5" ry="10" transform="rotate(20 58 ${b.top})" fill="#7ccc62" ${st(2.5)}/><circle cx="32" cy="76" r="6" fill="#6fbf5a"/><circle cx="68" cy="82" r="5" fill="#7ccc62"/>`,
  flame: (b) => `<path d="M42 ${b.top + 4} Q36 ${b.top - 12} 50 ${b.top - 22} Q64 ${b.top - 12} 58 ${b.top + 4}z" fill="#ffb347" ${st(3)}/><path d="M46 ${b.top + 2} Q44 ${b.top - 8} 50 ${b.top - 13} Q56 ${b.top - 8} 54 ${b.top + 2}z" fill="#fff0a8"/>`,
  eyebumps: (b) => mirror((s) => `<circle cx="${X(s, 14)}" cy="${b.top + 4}" r="10" fill="var(--c0)" ${ST}/>`),
  bolts: () => `<path d="M80 28 L71 48 L79 48 L72 68 L90 42 L81 42 L87 28z" fill="#ffe14d" ${st(2.5)}/>`,
  bubbles: () => `<circle cx="18" cy="34" r="6" fill="#fff" opacity=".75" ${st(2)}/><circle cx="28" cy="18" r="4" fill="#fff" opacity=".75" ${st(2)}/><circle cx="84" cy="24" r="5" fill="#fff" opacity=".75" ${st(2)}/>`,
  stars: () => [[16, 24, 7], [86, 18, 6], [90, 60, 5]].map(([x, y, r]) => `<path d="M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3}z" fill="${GOLD}" ${st(2)}/>`).join(''),
};

// Parts drawn after the face.
const FACEFRONT = {
  cheeks: (b) => mirror((s) => `<circle cx="${X(s, 17)}" cy="${b.fy + 5}" r="5" fill="#ff8fa3" opacity=".7"/>`),
  whiskers: (b) => mirror((s) => [0, 5].map((d) => `<path d="M${X(s, 12)} ${b.fy + 3 + d} L${X(s, 26)} ${b.fy + d * 1.6 - 2 + (d ? 6 : 0)}" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`).join('')),
};

// Battle poses reuse the same drawn parts: only the face and a small lean change (PRD 12).
export const POSES = ['ready', 'attack', 'hurt', 'dodge', 'dizzy', 'cheer', 'smitten'];
const LEAN = { ready: -4, attack: -9, hurt: 7, dodge: 6 };

function face(kind, b, mood, pose) {
  const ey = b.fy - 3, my = b.fy + 8;
  const dot = (x) => `<circle cx="${x}" cy="${ey}" r="4.5" fill="${INK}"/><circle cx="${x + 1.5}" cy="${ey - 1.5}" r="1.6" fill="#fff"/>`;
  const big = (x, r = 7, p = 3.8, dx = 1) => `<circle cx="${x}" cy="${ey}" r="${r}" fill="#fff" ${st(2.5)}/><circle cx="${x + dx}" cy="${ey + 1}" r="${p}" fill="${INK}"/><circle cx="${x + dx + 1}" cy="${ey}" r="1.3" fill="#fff"/>`;
  const closed = (x) => `<path d="M${x - 5} ${ey} Q${x} ${ey + 6} ${x + 5} ${ey}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  const line = (d, w = 3) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const brows = `<path d="M33 ${ey - 8} L45 ${ey - 4} M67 ${ey - 8} L55 ${ey - 4}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  const mouths = {
    happy: `M44 ${my} Q50 ${my + 7} 56 ${my}`, smirk: `M44 ${my} Q52 ${my + 6} 57 ${my - 2}`, sleepy: `M46 ${my} Q50 ${my + 4} 54 ${my}`,
    fierce: `M44 ${my + 2} Q50 ${my + 4} 56 ${my + 2}`, sad: `M44 ${my + 4} Q50 ${my - 2} 56 ${my + 4}`,
  };
  const mouth = mood === 'sad' ? mouths.sad : kind === 'smirk' ? mouths.smirk : kind === 'sleepy' ? mouths.sleepy : kind === 'fierce' ? mouths.fierce : mouths.happy;
  let eyes;
  if (kind === 'wide') eyes = big(40, 6.5, 3.5) + big(60, 6.5, 3.5);
  else if (kind === 'owl') eyes = big(38, 10, 5) + big(62, 10, 5);
  else if (kind === 'sleepy' && mood !== 'sad' && !pose) eyes = closed(40) + closed(60);
  else if (kind === 'fierce') eyes = dot(40) + dot(60) + brows;
  else eyes = dot(40) + dot(60);
  let lips = line(mouth);
  if (pose === 'ready') { if (kind !== 'fierce') eyes += brows; lips = line(kind === 'smirk' ? mouths.smirk : `M45 ${my + 2} Q50 ${my + 4} 55 ${my + 2}`); }
  else if (pose === 'attack') { if (kind !== 'fierce') eyes += brows; lips = `<ellipse cx="50" cy="${my + 2}" rx="6" ry="5" fill="#7a2a3a" ${st(2.5)}/>`; }
  else if (pose === 'hurt') { eyes = line(`M35 ${ey - 5} L43 ${ey} L35 ${ey + 5} M65 ${ey - 5} L57 ${ey} L65 ${ey + 5}`); lips = line(`M43 ${my + 3} q3.5 -5 7 0 t7 0`); }
  else if (pose === 'dodge') { eyes = big(40, 6, 3.2, 3) + big(60, 6, 3.2, 3); lips = line(mouths.smirk) + `<path d="M52 ${my + 2} q4 6 6 0z" fill="#ff8fa3" ${st(2)}/>`; }
  else if (pose === 'dizzy') { const sp = (x) => line(`M${x - 6} ${ey} a6 6 0 1 1 6 6 a4 4 0 1 1 -4 -4 a2 2 0 1 1 2 2`, 2.2); eyes = sp(40) + sp(60); lips = line(`M43 ${my + 3} q3.5 -5 7 0 t7 0`); }
  else if (pose === 'cheer') { const up = (x) => line(`M${x - 5} ${ey + 2} Q${x} ${ey - 6} ${x + 5} ${ey + 2}`); eyes = up(40) + up(60); lips = `<path d="M43 ${my - 1} Q50 ${my + 12} 57 ${my - 1}z" fill="#7a2a3a" ${st(2.5)}/>`; }
  else if (pose === 'smitten') { const heart = (x) => `<path d="M${x} ${ey + 6} C${x - 10} ${ey - 2} ${x - 4} ${ey - 9} ${x} ${ey - 3} C${x + 4} ${ey - 9} ${x + 10} ${ey - 2} ${x} ${ey + 6}z" fill="#ff4d6d" ${st(2)}/>`; eyes = heart(40) + heart(60); lips = line(mouths.happy); }
  return `<g class="c-eyes">${eyes}</g><g class="c-mouth">${lips}</g>`;
}

export const GROW = [0.74, 0.86, 0.94];

export function creatureParts(speciesId, stage) {
  const a = speciesById(speciesId).art;
  return [...(a.s1 ?? []), ...(stage >= 2 ? a.s2 ?? [] : []), ...(stage >= 3 ? a.s3 ?? [] : [])];
}

// opts: {mood:'happy'|'sad', silhouette:bool, size:px, pose: one of POSES, flip:bool (mirrored, so the tail is on the left)}
// Every part sits in its own named group (.c-back, .c-tail, .c-ears, .c-body, .c-front, .c-face, .p-<part>) so each can
// move on its own in CSS. The groups carry no transform of their own.
export function creatureSvg(speciesId, stage = 1, { mood = 'happy', silhouette = false, size = 96, pose = null, flip = false } = {}) {
  const sp = speciesById(speciesId);
  const a = sp.art, b = BODIES[a.body];
  const parts = creatureParts(speciesId, stage);
  const group = (set) => parts.filter((p) => set[p]).map((p) => `<g class="p p-${p}">${set[p](b)}</g>`).join('');
  const belly = b.belly ? `<ellipse cx="${b.belly[0]}" cy="${b.belly[1]}" rx="${b.belly[2]}" ry="${b.belly[3]}" fill="var(--c2)" opacity=".85"/>` : '';
  const feet = mirror((s) => `<ellipse cx="${X(s, 15)}" cy="90" rx="10" ry="5.5" fill="var(--c1)" ${ST}/>`);
  const glow = stage >= 3 ? `<circle cx="50" cy="60" r="48" fill="var(--c2)" opacity=".28"/>` : stage === 2 ? `<circle cx="50" cy="62" r="42" fill="var(--c2)" opacity=".14"/>` : '';
  const g = GROW[stage - 1];
  const label = silhouette ? 'Unknown creature' : `${stageName(speciesId, stage)}`;
  const lean = LEAN[pose] ? ` transform="rotate(${LEAN[pose]} 50 96)"` : '';
  const figure = `<g class="idle"><g class="c-glow">${glow}</g><g transform="translate(50 96) scale(${g}) translate(-50 -96)"><g class="c-pose"${lean}>`
    + `<g class="c-back">${group(BACK)}</g><g class="c-tail tail-${a.tail}">${TAILS[a.tail]()}</g><g class="c-ears ears-${a.ears}">${EARS[a.ears](b)}</g><g class="c-feet">${feet}</g>`
    + `<g class="c-body">${b.draw(a.pal)}${belly}</g><g class="c-front">${group(FRONT)}</g><g class="c-face">${face(a.face, b, mood, pose)}${group(FACEFRONT)}</g></g></g></g>`;
  return `<svg class="creature stage-${stage}${silhouette ? ' silhouette' : ''}${pose ? ` pose-${pose}` : ''}" viewBox="0 0 100 100" width="${size}" height="${size}" overflow="visible" role="img" aria-label="${label}" style="--c0:${a.pal[0]};--c1:${a.pal[1]};--c2:${a.pal[2]}">
${flip ? `<g class="c-flip" transform="translate(100 0) scale(-1 1)">${figure}</g>` : figure}</svg>`;
}

export const PART_NAMES = new Set([...Object.keys(BACK), ...Object.keys(FRONT), ...Object.keys(FACEFRONT)]);
export const ART_KEYS = { body: Object.keys(BODIES), ears: Object.keys(EARS), tail: Object.keys(TAILS), face: ['happy', 'smirk', 'sleepy', 'fierce', 'wide', 'owl'] };
