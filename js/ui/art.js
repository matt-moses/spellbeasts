// Placeholder creature art until the real species arrive in Phase 5.
export const STARTERS = [
  { id: 'starter-1', name: 'Sprout', color: '#4caf50' },
  { id: 'starter-2', name: 'Spark', color: '#f59f0b' },
  { id: 'starter-3', name: 'Splash', color: '#2f7fd8' },
];
export const starterById = (id) => STARTERS.find((s) => s.id === id) ?? STARTERS[0];

export function blobSvg(color, mood = 'happy') {
  const mouth = mood === 'sad' ? 'M38 62 Q50 56 62 62' : 'M38 58 Q50 70 62 58';
  return `<svg class="blob ${mood}" viewBox="0 0 100 100" width="96" height="96" role="img" aria-hidden="true">
  <ellipse cx="50" cy="58" rx="36" ry="32" fill="${color}" stroke="#1d2433" stroke-width="4"/>
  <circle cx="38" cy="48" r="5" fill="#1d2433"/><circle cx="62" cy="48" r="5" fill="#1d2433"/>
  <path d="${mouth}" fill="none" stroke="#1d2433" stroke-width="4" stroke-linecap="round"/></svg>`;
}
