// A short burst of confetti, used when a word is mastered for the first time. Pure DOM + CSS (no libraries), never blocks
// clicks, cleans itself up, and is skipped when the player prefers reduced motion.
const COLORS = ['#ff5d73', '#ffc928', '#2bb673', '#2f7df6', '#9a6bff', '#ff9f1c'];

export function confetti(doc = document, { count = 60, ms = 2200 } = {}) {
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
  const layer = doc.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i++) {
    const p = doc.createElement('i');
    const r = Math.random;
    p.style.cssText = `left:${(r() * 100).toFixed(1)}%;background:${COLORS[i % COLORS.length]};--dx:${((r() - 0.5) * 240).toFixed(0)}px;--rot:${(360 + r() * 720).toFixed(0)}deg;`
      + `animation-delay:${(r() * 0.35).toFixed(2)}s;animation-duration:${(1.4 + r() * 0.8).toFixed(2)}s;${r() < 0.4 ? 'border-radius:50%;' : ''}`;
    layer.append(p);
  }
  doc.body.append(layer);
  setTimeout(() => layer.remove(), ms + 400);
  return layer;
}
