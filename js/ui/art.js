import { creatureSvg } from '../assets/creatures.js';
import { companionOf } from '../logic/collection.js';

export { creatureSvg };

// The player's companion (or avatar) as SVG markup.
export function companionSvg(profile, opts = {}) {
  const c = companionOf(profile);
  return c ? creatureSvg(c.species, c.stage, opts) : creatureSvg('burrowby', 1, opts);
}

export function eggSvg(ratio, color = '#f3e6c8') {
  const cracks = ratio >= 1 ? 3 : ratio >= 0.66 ? 2 : ratio >= 0.33 ? 1 : 0;
  const lines = ['M38 42 l8 8 l-6 6', 'M62 48 l-8 8 l6 6', 'M44 30 l6 8 l8 -6'].slice(0, cracks)
    .map((d) => `<path d="${d}" fill="none" stroke="#1d2433" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  return `<svg class="egg${ratio >= 1 ? ' ready' : ''}" viewBox="0 0 100 100" width="84" height="84" role="img" aria-label="Egg ${Math.round(ratio * 100)} percent warm">
<path d="M50 10 C74 10 86 46 86 64 C86 82 70 92 50 92 C30 92 14 82 14 64 C14 46 26 10 50 10z" fill="${color}" stroke="#1d2433" stroke-width="4"/>
<circle cx="36" cy="64" r="5" fill="#e8c27a"/><circle cx="62" cy="72" r="6" fill="#e8c27a"/><circle cx="58" cy="52" r="4" fill="#e8c27a"/>${lines}</svg>`;
}

export function trophySvg(locked) {
  const fill = locked ? '#c9d3e6' : '#f5b301';
  return `<svg class="trophy ${locked ? 'locked' : 'earned'}" viewBox="0 0 100 100" width="64" height="64" aria-hidden="true">
  <path d="M28 18h44v22a22 22 0 0 1-44 0z" fill="${fill}" stroke="#1d2433" stroke-width="4"/>
  <path d="M28 24H14c0 14 6 22 16 24M72 24h14c0 14-6 22-16 24" fill="none" stroke="#1d2433" stroke-width="4"/>
  <rect x="42" y="62" width="16" height="12" fill="${fill}" stroke="#1d2433" stroke-width="4"/>
  <rect x="30" y="74" width="40" height="10" rx="3" fill="${fill}" stroke="#1d2433" stroke-width="4"/></svg>`;
}
