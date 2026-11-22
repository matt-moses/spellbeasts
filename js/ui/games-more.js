// Sky Flap, Critter Pop and Pattern Parrot. Same contract as games.js: draw into ctx.root, return { stop }.
import { h, icon, fill } from './dom.js';
import { creatureSvg } from './art.js';
import { createFlap, stepFlap, flap, prizeFor as flapPrize, H, FX, HALF, GATE_W, HEARTS } from '../logic/flap.js';
import { createPop, stepPop, whack, HOLES, prizeFor as popPrize } from '../logic/pop.js';
import { createPattern, nextRound, press, PADS, prizeFor as patternPrize } from '../logic/pattern.js';
import { finishGame } from '../logic/care.js';
import { STARTER_IDS, bookSpecies } from '../logic/species.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const reduceMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- Sky Flap
export function flapGame({ app, creature, root, exit, result, restart, art, difficulty, hand }) {
  const { audio } = app, profile = app.profile;
  const g = createFlap({ rng: Math.random, difficulty });
  let raf = 0, last = null, lastHearts = g.hearts, held = false;
  fill(root,
    h('div', { class: 'game-top' }, h('span', { class: 'pill gold', id: 'flap-score' }, 'Gates 0'), h('span', { class: 'pill', id: 'flap-hearts' }),
      h('button', { class: 'secondary', id: 'game-exit', type: 'button', onclick: exit }, 'Exit game')),
    h('div', { class: 'game-wrap', html: `<svg class="game-field flap-field" viewBox="0 0 100 ${H}" role="img" aria-label="Sky Flap. Press Space, the up arrow, or tap to flap through the gates." style="touch-action:none">
      <defs><linearGradient id="fsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5cc3ff"/><stop offset="1" stop-color="#e3f7ff"/></linearGradient></defs>
      <rect width="100" height="${H}" fill="url(#fsky)"/><ellipse cx="20" cy="12" rx="9" ry="3.5" fill="#fff" opacity=".8"/><ellipse cx="70" cy="46" rx="11" ry="3.5" fill="#fff" opacity=".7"/>
      <g class="gates"></g><g class="flyer"><g transform="translate(${FX - 10} -10)">${art(20)}</g></g></svg>` }),
    h('div', { class: `actions hand-${hand}` }, h('button', { class: 'primary big', id: 'flap-btn', type: 'button' }, icon('play'), 'Flap!')),
    h('p', { class: 'small' }, `Space, ↑ or a tap to flap. Fly through the gaps! You have ${g.hearts} hearts.`));
  const svg = root.querySelector('.flap-field'), gateLayer = svg.querySelector('.gates'), me = svg.querySelector('.flyer');
  const doFlap = () => { if (!g.over) { audio.play('boing'); flap(g); } };
  svg.addEventListener('pointerdown', doFlap);
  root.querySelector('#flap-btn').addEventListener('click', doFlap);
  const key = (e) => { if ([' ', 'ArrowUp', 'w'].includes(e.key)) { e.preventDefault(); if (!held) doFlap(); held = true; } };
  const keyUp = () => { held = false; };
  document.addEventListener('keydown', key); document.addEventListener('keyup', keyUp);
  const hearts = () => { const el = root.querySelector('#flap-hearts'); el.replaceChildren(...Array.from({ length: HEARTS }, (_, i) => { const x = icon('heart'); if (i >= g.hearts) x.classList.add('lost'); return x; })); el.setAttribute('aria-label', `${g.hearts} hearts`); };
  hearts();
  const stopAll = () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', key); document.removeEventListener('keyup', keyUp); };
  function frame(ts) {
    if (last == null) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    stepFlap(g, dt);
    me.setAttribute('transform', `translate(0 ${g.y})`); me.classList.toggle('bumped', g.safe > 0);
    gateLayer.replaceChildren(...g.gates.map((o) => {
      const el = document.createElementNS(SVGNS, 'g'); el.setAttribute('class', 'gate'); el.dataset.x = o.x.toFixed(1);
      const top = o.gapY - g.gap / 2, bottom = o.gapY + g.gap / 2;
      el.innerHTML = `<rect x="${o.x}" y="0" width="${GATE_W}" height="${top}" rx="2" fill="#fff" stroke="#6aa6d6" stroke-width=".8"/><rect x="${o.x}" y="${bottom}" width="${GATE_W}" height="${H - bottom}" rx="2" fill="#fff" stroke="#6aa6d6" stroke-width=".8"/>`;
      return el;
    }));
    if (g.hearts !== lastHearts) { lastHearts = g.hearts; hearts(); audio.play('gentle'); }
    root.querySelector('#flap-score').textContent = `Gates ${g.score}`;
    if (g.over) {
      stopAll();
      const paid = finishGame(profile, creature, app.today(), 0, flapPrize(g));
      return result({ title: 'What a flight!', lines: [`You flew through ${g.score} gates!`], game: 'flap', score: g.score, ...paid, again: restart });
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return { stop: stopAll };
}

// ---------------------------------------------------------------- Critter Pop
export function popGame({ app, creature, root, exit, result, restart, difficulty }) {
  const { audio } = app, profile = app.profile;
  const g = createPop({ rng: Math.random, difficulty });
  const pool = [...new Set([...STARTER_IDS, ...bookSpecies().map((s) => s.id)])];
  let raf = 0, last = null;
  const score = h('span', { class: 'pill gold', id: 'pop-score' }, 'Popped 0');
  const clock = h('span', { class: 'pill', id: 'pop-time' }, `${g.dur}s`);
  const holes = Array.from({ length: HOLES }, (_, i) => {
    const species = pool[Math.floor(Math.random() * pool.length)];
    const b = h('button', { class: 'pop-hole', type: 'button', 'data-index': String(i), 'data-up': 'false', 'aria-label': `Hole ${i + 1}, empty`,
      onclick: () => { if (whack(g, i)) { audio.play('chirp'); paint(); } } });
    b.innerHTML = `<span class="pop-critter">${creatureSvg(species, 1, { size: 72 })}</span>`;
    return b;
  });
  function paint() {
    g.holes.forEach((hl, i) => { const b = holes[i]; const up = hl.up; if (b.dataset.up !== String(up)) { b.dataset.up = String(up); b.setAttribute('aria-label', up ? `Hole ${i + 1}, a critter! Tap it` : `Hole ${i + 1}, empty`); } });
    score.textContent = `Popped ${g.score}`; clock.textContent = `${Math.max(0, Math.ceil(g.dur - g.t))}s`;
  }
  fill(root,
    h('div', { class: 'game-top' }, score, clock, h('button', { class: 'secondary', id: 'game-exit', type: 'button', onclick: exit }, 'Exit game')),
    h('p', { class: 'small' }, 'Tap every critter before it ducks back down!'),
    h('div', { class: 'pop-grid', role: 'group', 'aria-label': 'Critter holes' }, holes));
  const stopAll = () => cancelAnimationFrame(raf);
  function frame(ts) {
    if (last == null) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    stepPop(g, dt); paint();
    if (g.done) {
      stopAll();
      const paid = finishGame(profile, creature, app.today(), 0, popPrize(g));
      return result({ title: 'Pop-tastic!', lines: [`You popped ${g.score} critters!`], game: 'pop', score: g.score, ...paid, again: restart });
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return { stop: stopAll };
}

// ---------------------------------------------------------------- Pattern Parrot
const PAD_COLORS = [['Red', '#e5484d'], ['Blue', '#3b82f6'], ['Green', '#3fb36b'], ['Yellow', '#ffc928']];
export function patternGame({ app, creature, root, exit, result, restart, difficulty }) {
  const { audio } = app, profile = app.profile;
  const g = createPattern({ rng: Math.random, difficulty });
  let timers = [], locked = true;
  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
  const round = h('span', { class: 'pill gold', id: 'pattern-round' }, `Round 0 of ${g.rounds}`);
  const say = h('p', { class: 'lead', id: 'pattern-say', role: 'status' }, 'Watch closely…');
  const pads = PAD_COLORS.slice(0, PADS).map(([name, color], i) => h('button', { class: 'pad', id: `pad-${i}`, type: 'button', 'aria-label': `${name} pad`, style: `--pad:${color}`, onclick: () => tap(i) }, name));
  const light = (i, ms) => { pads[i].classList.add('lit'); audio.play(i % 2 ? 'chime' : 'pop'); later(() => pads[i].classList.remove('lit'), ms); };
  function play() {
    locked = true; say.textContent = 'Watch closely…';
    const seq = nextRound(g); round.textContent = `Round ${seq.length} of ${g.rounds}`;
    const step = reduceMotion() ? g.show * 0.6 : g.show;
    seq.forEach((p, k) => later(() => light(p, step * 0.6), 600 + k * step));
    later(() => { locked = false; say.textContent = 'Your turn!'; }, 600 + seq.length * step);
  }
  function tap(i) {
    if (locked) return;
    light(i, 180);
    const r = press(g, i);
    if (r === 'round') { locked = true; say.textContent = 'Yes! Next round…'; later(play, 900); }
    else if (r === 'wrong' || r === 'win') {
      locked = true;
      later(() => {
        const paid = finishGame(profile, creature, app.today(), 0, patternPrize(g));
        result({ title: r === 'win' ? 'Perfect parrot!' : 'Good listening!', lines: [`You repeated ${g.score} ${g.score === 1 ? 'round' : 'rounds'}!`], game: 'pattern', score: g.score, ...paid, again: restart });
      }, 600);
    }
  }
  fill(root,
    h('div', { class: 'game-top' }, round, h('button', { class: 'secondary', id: 'game-exit', type: 'button', onclick: exit }, 'Exit game')),
    say, h('div', { class: 'pad-grid', role: 'group', 'aria-label': 'Pattern pads' }, pads));
  play();
  return { stop: () => { timers.forEach(clearTimeout); timers = []; } };
}
