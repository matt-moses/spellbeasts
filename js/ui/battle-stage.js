// The battle stage: the player's creature on the left, the wild one on the right, its hearts, and every battle
// animation. It is a view only: js/logic/battle.js decides what happened, js/logic/battle-cues.js says how it looks.
//
// Rule one: nothing here ever makes the player wait. play() returns at once, a new event cuts the old one short, and
// the hearts, poses and places always jump straight to where the newest event says they end up.
import { h } from './dom.js';
import { creatureSvg } from '../assets/creatures.js';
import { speciesById, stageName } from '../logic/species.js';
import { CUES, BANNER_MS, TAUNT_GAP_MS, restView, announce } from '../logic/battle-cues.js';

const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C5 15 2 11.5 2 8a5 5 0 0 1 10-1.5A5 5 0 0 1 22 8c0 3.500-3 7-10 13z" fill="currentColor" stroke="#1d2433" stroke-width="2" stroke-linejoin="round"/></svg>';
const STAR8 = '<svg viewBox="-50 -50 100 100" aria-hidden="true"><path d="M0 -48 L11 -18 L40 -30 L22 -6 L48 8 L18 14 L24 44 L0 24 L-24 44 L-18 14 L-48 8 L-22 -6 L-40 -30 L-11 -18z" fill="currentColor" stroke="#1d2433" stroke-width="4" stroke-linejoin="round"/><circle r="12" fill="#fff"/></svg>';
const LINES = '<svg viewBox="0 0 60 40" aria-hidden="true"><path d="M4 8 H40 M14 20 H56 M4 32 H36" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M4 8 H40 M14 20 H56 M4 32 H36" fill="none" stroke="#1d2433" stroke-width="1.5" stroke-linecap="round" opacity=".35"/></svg>';
const POUCH = '<svg viewBox="0 0 40 44" aria-hidden="true"><path d="M12 12 Q20 4 28 12 L34 30 Q34 42 20 42 Q6 42 6 30z" fill="#c98b52" stroke="#1d2433" stroke-width="3" stroke-linejoin="round"/><path d="M11 13 H29" stroke="#1d2433" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="28" r="6" fill="#ffc928" stroke="#1d2433" stroke-width="2.5"/></svg>';
const GRASS = '<svg viewBox="0 0 60 22" aria-hidden="true"><path d="M4 22 Q6 8 2 2 Q12 8 12 22z M16 22 Q20 4 28 0 Q24 10 26 22z M34 22 Q34 8 42 3 Q40 12 44 22z M50 22 Q52 10 58 6 Q56 14 58 22z" fill="#2f9e44" stroke="#1d2433" stroke-width="2" stroke-linejoin="round"/></svg>';
const CONFETTI = ['#ff5d73', '#ffc928', '#2f7df6', '#2bb673', '#8b5cf6', '#ff9f1c'];

const hash = (str) => [...str].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);
const pick = (x) => (Array.isArray(x) ? x[Math.floor(Math.random() * x.length)] : x);
const prefersReduced = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// player / wild: { species, stage }. hearts: the wild creature's full hearts. rest: see restView().
export function createBattleStage({ player, wild, hearts, heartsLeft = hearts, land = 'r1', audio = null, reducedMotion = prefersReduced } = {}) {
  const wildName = speciesById(wild.species).name;
  let state = { hearts, heartsLeft, charge: 0, won: false, prize: null, escaped: false };
  let cueTimers = [], bannerTimer = 0, tauntTimer = 0, dead = false;
  const drawn = { player: {}, wild: {} };

  const side = (who, sp) => {
    const holder = h('div', { class: 'bs-creature' });
    // Each species keeps its own tempo, so no two creatures breathe, blink or flap in step.
    const k = hash(sp.species);
    holder.style.setProperty('--bs-k', (0.85 + (k % 36) / 100).toFixed(2));
    holder.style.setProperty('--bs-d', `${((k >> 3) % 20) / 10}s`);
    const mover = h('div', { class: 'bs-mover' }, h('div', { class: 'bs-aura', 'aria-hidden': 'true' }), holder);
    const spot = h('div', { class: 'bs-spot' }, h('div', { class: 'bs-shadow', 'aria-hidden': 'true' }), mover, h('div', { class: 'bs-grass', 'aria-hidden': 'true', html: GRASS }));
    const el = h('div', { class: `bs-side bs-${who}` }, spot);
    return { el, spot, mover, holder };
  };
  const P = side('player', player), W = side('wild', wild);
  const heartsRow = h('div', { class: 'bs-hearts', role: 'img' });
  const pips = h('div', { class: 'bs-pips', role: 'img' }, [0, 1, 2].map(() => h('span', { class: 'bs-pip' })));
  const sweat = h('div', { class: 'bs-sweat', 'aria-hidden': 'true' });
  W.mover.append(sweat);
  P.el.append(pips, h('div', { class: 'bs-name' }, stageName(player.species, player.stage)));
  W.el.prepend(heartsRow);
  W.el.append(h('div', { class: 'bs-name' }, `Wild ${wildName}`));
  const fx = h('div', { class: 'bs-fx', 'aria-hidden': 'true' });
  const banner = h('div', { class: 'bs-banner', 'aria-hidden': 'true', hidden: true });
  const live = h('p', { class: 'bs-live', role: 'status', 'aria-live': 'polite' });
  const field = h('div', { class: 'bs-field' }, P.el, W.el, fx);
  const el = h('div', { class: 'battle-stage', 'data-land': land, 'data-wild': wild.species }, banner, field, live);
  el.style.setProperty('--bs-pc', speciesById(player.species).art.pal[0]);
  el.style.setProperty('--bs-wc', speciesById(wild.species).art.pal[0]);

  // Swaps only the face and lean, so wings, tails and blinking carry on undisturbed.
  function setPose(who, S, sp, pose, flip) {
    const d = drawn[who];
    if (d.pose === pose && d.flip === flip) return;
    const svg = creatureSvg(sp.species, sp.stage, { pose, flip, size: 120 });
    const old = S.holder.querySelector('svg');
    if (!old || d.flip !== flip) S.holder.innerHTML = svg;
    else {
      const next = new DOMParser().parseFromString(svg, 'text/html').querySelector('svg');
      old.querySelector('.c-face').replaceChildren(...next.querySelector('.c-face').childNodes);
      const lean = next.querySelector('.c-pose').getAttribute('transform');
      if (lean) old.querySelector('.c-pose').setAttribute('transform', lean); else old.querySelector('.c-pose').removeAttribute('transform');
      old.setAttribute('class', next.getAttribute('class'));
    }
    d.pose = pose; d.flip = flip;
  }

  function measureJoin() {
    const a = P.el.getBoundingClientRect(), b = W.el.getBoundingClientRect();
    const gap = (b.left + b.width / 2) - (a.left + a.width / 2);
    el.style.setProperty('--bs-join', `${Math.max(0, Math.round(gap - Math.min(a.width, 150) * 0.72))}px`);
  }

  // Draws the resting look for the current state. `during` overrides poses while a cue plays; `popped` marks hearts just lost.
  function render({ during = null, popped = 0 } = {}) {
    const v = restView(state);
    el.dataset.place = v.wildPlace;
    el.classList.toggle('tired', v.tired);
    el.classList.toggle('charged', v.charged);
    el.classList.toggle('won', state.won);
    if (v.wildPlace === 'joined') measureJoin();
    setPose('player', P, player, during?.player ?? v.playerPose, true);
    // Once it has joined your side it turns to face the same way as your own creature.
    setPose('wild', W, wild, during?.wild ?? v.wildPose, v.wildPlace === 'joined' && !during);
    heartsRow.replaceChildren(...Array.from({ length: state.hearts }, (_, i) => h('span', {
      class: `bs-heart ${i < state.heartsLeft ? 'full' : 'lost'}${i >= state.heartsLeft && i < state.heartsLeft + popped ? ' pop' : ''}`, html: HEART,
    })));
    heartsRow.setAttribute('aria-label', state.won ? `${wildName} has no hearts left` : `${wildName}: ${state.heartsLeft} of ${state.hearts} hearts`);
    heartsRow.dataset.left = String(state.heartsLeft);
    [...pips.children].forEach((p, i) => p.classList.toggle('on', i < v.pips));
    pips.setAttribute('aria-label', v.pips === 2 ? 'Special move ready on the next right answer' : `Special move: ${v.pips} of 3`);
    pips.dataset.charge = String(v.pips);
    pips.hidden = state.won || state.escaped;
  }

  const later = (fn, ms) => { const t = setTimeout(fn, ms); cueTimers.push(t); return t; };
  function settle() {
    cueTimers.splice(0).forEach(clearTimeout);
    clearTimeout(tauntTimer);
    for (const m of [P.mover, W.mover]) { m.removeAttribute('data-anim'); m.style.removeProperty('--bs-ms'); }
    field.removeAttribute('data-shake');
    W.el.querySelector('.bs-grass').classList.remove('rustle');
    fx.replaceChildren();
    W.el.querySelectorAll('.bs-ghost').forEach((n) => n.remove());
  }
  function animate(S, name, ms) {
    S.mover.removeAttribute('data-anim');
    void S.mover.offsetWidth;                                  // restart even if the same animation plays twice running
    S.mover.style.setProperty('--bs-ms', `${ms}ms`);
    S.mover.dataset.anim = name;
  }
  const spawn = (cls, where, html = '', style = {}) => {
    const n = h('span', { class: `bs-f ${cls}`, html });
    for (const [k, v] of Object.entries(style)) n.style.setProperty(k, v);
    where.append(n);
    return n;
  };
  function effects(cue, { damage }) {
    for (const f of cue.fx) {
      if (f === 'burst' || f === 'bigburst') spawn(`bs-${f}`, fx, STAR8);
      else if (f === 'number' && damage) spawn('bs-number', fx, `&minus;${damage}`);
      else if (f === 'shake') field.dataset.shake = '1';
      else if (f === 'rustle') W.el.querySelector('.bs-grass').classList.add('rustle');
      else if (f === 'dust') [0, 1, 2].forEach((i) => spawn('bs-dust', fx, '', { '--i': String(i) }));
      else if (f === 'ghost') W.spot.insertBefore(h('div', { class: 'bs-ghost', 'aria-hidden': 'true', html: W.holder.innerHTML }), W.mover);
      else if (f === 'whoosh') spawn('bs-whoosh', fx, LINES);
      else if (f === 'hearts') [0, 1, 2, 3, 4].forEach((i) => spawn('bs-loveheart', fx, HEART, { '--i': String(i) }));
      else if (f === 'confetti') Array.from({ length: 14 }, (_, i) => spawn('bs-confetti', fx, '', { '--i': String(i), '--x': `${(i * 37) % 100}%`, '--r': `${(i * 67) % 360}deg`, background: CONFETTI[i % CONFETTI.length] }));
      else if (f === 'pouch') spawn('bs-pouch', fx, POUCH);
      else if (f === 'sparkle') [0, 1, 2].forEach((i) => spawn('bs-sparkle', fx, STAR8, { '--i': String(i) }));
    }
  }
  function showBanner(text) {
    clearTimeout(bannerTimer);
    banner.textContent = text; banner.hidden = false;
    banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show');
    bannerTimer = setTimeout(() => { banner.hidden = true; }, BANNER_MS);
  }
  function scheduleTaunt() {
    clearTimeout(tauntTimer);
    if (dead || reducedMotion() || state.won || state.escaped) return;
    const [lo, hi] = TAUNT_GAP_MS;
    tauntTimer = setTimeout(() => { if (!cueTimers.length) run('taunt'); scheduleTaunt(); }, lo + Math.random() * (hi - lo));
  }
  function run(event, extra = {}) {
    const cue = CUES[event];
    const wildAnim = pick(cue.wild.anim);
    render({ during: { player: cue.player?.pose, wild: cue.wild.pose }, popped: extra.damage ?? 0 });
    if (cue.player) animate(P, pick(cue.player.anim), cue.ms);
    animate(W, wildAnim, cue.ms);
    effects(cue, extra);
    later(() => { settle(); render(); scheduleTaunt(); }, cue.ms);
    return wildAnim;
  }

  const api = {
    el,
    get state() { return { ...state }; },
    // Plays an event. `rest` is how things stand once it is over (heartsLeft, charge, won, prize, escaped).
    play(event, rest = {}, { damage = 0 } = {}) {
      if (dead || !CUES[event]) return null;
      settle();
      state = { ...state, ...rest };
      const said = announce(event, { name: wildName, heartsLeft: state.heartsLeft, damage });
      if (said) live.textContent = said;
      if (CUES[event].sound) audio?.play(CUES[event].sound);
      el.dataset.event = event;
      if (event === 'enter') showBanner(`A wild ${wildName} appears!`);
      else if (event === 'win-befriend') showBanner(`${wildName} joined you!`);
      else if (event === 'win-crickets') showBanner('You won!');
      else if (event === 'escape') showBanner(`${wildName} got away!`);
      if (reducedMotion()) { render(); return event; }
      run(event, { damage });
      return event;
    },
    // Jumps straight to a state with no animation.
    set(rest = {}) { settle(); state = { ...state, ...rest }; render(); scheduleTaunt(); },
    destroy() { dead = true; settle(); clearTimeout(bannerTimer); globalThis.removeEventListener?.('resize', onResize); },
  };
  const onResize = () => { if (el.dataset.place === 'joined') measureJoin(); };
  globalThis.addEventListener?.('resize', onResize);
  render();
  return api;
}
