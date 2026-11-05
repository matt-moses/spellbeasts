// Make a creature clickable: each click plays the next action from a shuffled rotation, so it never repeats
// back to back. An action is any mix of: an animation, a sound, floating effects, and a speech bubble.
import { h, icon } from './dom.js';
import { createRotation } from '../logic/pet.js';

const LINES = [
  (n) => `Hi ${n}!`, () => 'Boop!', () => 'Tickle tickle!', () => 'I love berries!', () => 'You are a great speller!',
  () => 'Practice makes perfect!', () => 'Wheee!', () => 'Can we play a game?', () => 'Hee hee hee!', () => 'You are my favorite!',
  () => 'Every word has a secret!', () => 'Let us explore!', () => 'High five!', () => 'I believe in you!',
];

// anim: CSS class (see .pet-* in the stylesheet). sound: a name from platform/audio.js. fx: floating decorations.
export const ACTIONS = [
  { id: 'hop', anim: 'pet-hop', sound: 'boing' },
  { id: 'spin', anim: 'pet-spin', sound: 'whoosh' },
  { id: 'wiggle', anim: 'pet-wiggle', sound: 'giggle' },
  { id: 'flip', anim: 'pet-flip', sound: 'pop' },
  { id: 'grow', anim: 'pet-grow', sound: 'squeak' },
  { id: 'shake', anim: 'pet-shake', sound: 'squeak' },
  { id: 'dash', anim: 'pet-dash', sound: 'whoosh' },
  { id: 'dance', anim: 'pet-dance', sound: 'tune', fx: 'notes' },
  { id: 'hearts', anim: 'pet-hop', sound: 'chirp', fx: 'hearts' },
  { id: 'sparkle', anim: 'pet-grow', sound: 'chime', fx: 'sparkles' },
  { id: 'bubbles', anim: 'pet-wiggle', sound: 'pop', fx: 'bubbles' },
  { id: 'talk', anim: 'pet-hop', sound: 'giggle', say: true },
  { id: 'cheer', anim: 'pet-flip', sound: 'tada', fx: 'sparkles', say: true },
];
const FX = { hearts: 'heart', sparkles: 'star', notes: 'note', bubbles: 'bubble' };
const reduceMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// opts: { name, speak (say bubbles aloud, default false), focusable (default true), onAct(action) }
export function makeInteractive(el, app, opts = {}) {
  const rotation = createRotation(ACTIONS);
  el.classList.add('pet-wrap');
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', opts.label ?? 'Tap your creature to play with it');
  if (opts.focusable !== false) el.tabIndex = 0;
  let bubble = null, timer = 0;

  function fx(kind) {
    const name = FX[kind];
    for (let i = 0; i < 6; i++) {
      const piece = h('span', { class: 'pet-fx', style: `left:${10 + Math.random() * 80}%; animation-delay:${i * 70}ms` }, icon(name));
      el.append(piece); setTimeout(() => piece.remove(), 1500);
    }
  }
  function say(text) {
    bubble?.remove(); clearTimeout(timer);
    bubble = h('span', { class: 'pet-bubble', role: 'status' }, text);
    el.append(bubble);
    timer = setTimeout(() => { bubble?.remove(); bubble = null; }, 2300);
    if (opts.speak && app.speaker?.available) app.speaker.speak(text);
  }
  function act() {
    const a = rotation.next();
    el.dataset.petAction = a.id;
    el.dataset.petCount = String(Number(el.dataset.petCount ?? 0) + 1);
    for (const x of ACTIONS) if (x.anim) el.classList.remove(x.anim);
    if (!reduceMotion()) { void el.offsetWidth; el.classList.add(a.anim); setTimeout(() => el.classList.remove(a.anim), 1100); }
    if (a.sound) app.audio?.play(a.sound);
    if (a.fx && !reduceMotion()) fx(a.fx);
    if (a.say) say(LINES[Math.floor(Math.random() * LINES.length)](opts.name ?? 'friend'));
    opts.onAct?.(a);
    return a;
  }
  el.addEventListener('mousedown', (e) => e.preventDefault());           // keep focus where it is (e.g. the answer box)
  el.addEventListener('click', act);
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
  return { act };
}
