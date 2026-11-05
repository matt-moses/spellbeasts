// Hop Run and Memory Match. Each game draws into ctx.root and returns { stop }. ctx.exit() leaves without a prize;
// ctx.result({...}) shows the shared result screen.
import { h, icon, fill } from './dom.js';
import { creatureSvg } from './art.js';
import { createRunner, stepRunner, jump, score, prizeFor as runPrize, HEARTS, PLAYER_X0 } from '../logic/runner.js';
import { createMemory, flip, settle, prizeFor as memPrize } from '../logic/memory.js';
import { finishGame } from '../logic/care.js';
import { SPECIES, STARTER_IDS } from '../logic/species.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const reduceMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- Hop Run
export function runnerGame({ app, creature, root, exit, result, restart, art }) {
  const { audio } = app, profile = app.profile;
  const g = createRunner({ rng: Math.random });
  let raf = 0, last = null, lastHearts = g.hearts, jumpHeld = false;
  fill(root,
    h('div', { class: 'game-top' }, h('span', { class: 'pill gold', id: 'run-score' }, 'Distance 0'), h('span', { class: 'pill', id: 'run-hearts', 'aria-label': `${HEARTS} hearts` }),
      h('button', { class: 'secondary', id: 'game-exit', type: 'button', onclick: exit }, 'Exit game')),
    h('div', { class: 'game-wrap', html: `<svg class="game-field run-field" viewBox="0 0 100 60" role="img" aria-label="Hop Run. Press Space, the up arrow, or tap to hop over the logs and rocks." style="touch-action:none">
      <defs><linearGradient id="rsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#76d3ff"/><stop offset="1" stop-color="#d4f3ff"/></linearGradient></defs>
      <rect width="100" height="60" fill="url(#rsky)"/><circle cx="86" cy="10" r="6" fill="#ffe27a"/>
      <g class="hills"><path d="M0 40Q20 28 40 40T80 38T120 40V50H0Z" fill="#45b84d"/></g>
      <rect y="46" width="100" height="14" fill="#4fc254"/><rect y="46" width="100" height="2.5" fill="#3fb350"/>
      <g class="stripes"></g><g class="obstacles"></g><g class="runner"><g class="runner-art"><g transform="translate(${PLAYER_X0 - 6} -12)">${art(20)}</g></g></g></svg>` }),
    h('div', { class: 'actions' }, h('button', { class: 'primary big', id: 'run-jump', type: 'button' }, icon('play'), 'Hop!')),
    h('p', { class: 'small' }, 'Space, ↑ or a tap to hop. Hold on, you have 3 hearts!'));
  const svg = root.querySelector('.run-field'), obsLayer = svg.querySelector('.obstacles'), me = svg.querySelector('.runner'), stripes = svg.querySelector('.stripes');
  const hop = () => { if (g.y === 0 && !g.over) audio.play('boing'); jump(g); };
  svg.addEventListener('pointerdown', hop);
  root.querySelector('#run-jump').addEventListener('click', hop);
  const key = (e) => { if ([' ', 'ArrowUp', 'w'].includes(e.key)) { e.preventDefault(); if (!jumpHeld) hop(); jumpHeld = true; } };
  const keyUp = () => { jumpHeld = false; };
  document.addEventListener('keydown', key); document.addEventListener('keyup', keyUp);
  const hearts = () => fillHearts(root.querySelector('#run-hearts'), g.hearts);
  hearts();
  function fillHearts(el, n) { el.replaceChildren(...Array.from({ length: HEARTS }, (_, i) => { const x = icon('heart'); if (i >= n) x.classList.add('lost'); return x; })); el.setAttribute('aria-label', `${n} hearts`); }
  const stopAll = () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', key); document.removeEventListener('keyup', keyUp); };

  function frame(ts) {
    if (last == null) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    stepRunner(g, dt);
    me.setAttribute('transform', `translate(0 ${-g.y * 0.55})`);
    me.classList.toggle('bumped', g.safe > 0);
    stripes.innerHTML = Array.from({ length: 6 }, (_, i) => `<rect x="${((i * 22 - (g.dist * 0.9) % 22) + 100) % 110 - 5}" y="52" width="9" height="1.6" rx=".8" fill="#3fb350"/>`).join('');
    obsLayer.replaceChildren(...g.obstacles.map((o) => {
      const el = document.createElementNS(SVGNS, 'g'); el.setAttribute('class', `obstacle ${o.kind}`); el.dataset.x = o.x.toFixed(1);
      const y = 46 - o.h * 0.55, w = o.w, hh = o.h * 0.55;
      el.innerHTML = o.kind === 'rock'
        ? `<path d="M${o.x} 46 L${o.x + w * 0.2} ${y + 2} L${o.x + w * 0.6} ${y} L${o.x + w} 46Z" fill="#8c8aa0" stroke="#1d2433" stroke-width=".7" stroke-linejoin="round"/>`
        : `<rect x="${o.x}" y="${46 - hh}" width="${w}" height="${hh}" rx="1.6" fill="#a8693a" stroke="#1d2433" stroke-width=".7"/><path d="M${o.x + 1} ${46 - hh * 0.5}H${o.x + w - 1}" stroke="#7a4a24" stroke-width=".7"/>`;
      return el;
    }));
    if (g.hearts !== lastHearts) { lastHearts = g.hearts; hearts(); audio.play('gentle'); }
    root.querySelector('#run-score').textContent = `Distance ${score(g)}`;
    if (g.over) {
      stopAll();
      const paid = finishGame(profile, creature, app.today(), 0, runPrize(g));
      return result({ title: 'Great run!', lines: [`You ran ${score(g)} steps!`], ...paid, again: restart });
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return { stop: stopAll };
}

// ---------------------------------------------------------------- Memory Match
export function memoryGame({ app, creature, root, exit, result, restart }) {
  const { audio } = app, profile = app.profile;
  const PAIRS = 6;
  const owned = [...new Set(profile.creatures.map((c) => c.species))];
  const fillers = [...new Set([...STARTER_IDS, ...SPECIES.map((s) => s.id)])].filter((id) => !owned.includes(id));   // each creature at most once
  const chosen = [...owned.sort(() => Math.random() - 0.5), ...fillers].slice(0, PAIRS);
  console.assert(new Set(chosen).size === chosen.length, 'memory pairs must be distinct');
  const g = createMemory({ pairs: chosen, rng: Math.random });
  let timer = 0;
  const grid = h('div', { class: 'memory-grid', role: 'group', 'aria-label': 'Memory cards' });
  const moves = h('span', { class: 'pill gold', id: 'memory-moves' }, 'Moves 0');
  const draw = () => {
    moves.textContent = `Moves ${g.moves}`;
    grid.replaceChildren(...g.cards.map((c) => {
      const open = c.state !== 'down';
      const b = h('button', { class: `mem-card ${c.state}`, type: 'button', 'data-index': String(c.index), 'data-state': c.state,
        'aria-label': open ? `Card ${c.index + 1}: ${SPECIES.find((s) => s.id === c.id)?.name ?? 'creature'}` : `Card ${c.index + 1}, face down`,
        onclick: () => pick(c.index) });
      if (open) { b.dataset.species = c.id; b.innerHTML = creatureSvg(c.id, 1, { size: 64 }); } else b.textContent = '?';
      return b;
    }));
  };
  function pick(i) {
    const r = flip(g, i);
    if (r === 'ignored') return;
    audio.play(r === 'match' ? 'chime' : 'pop');
    draw();
    if (r === 'mismatch') timer = setTimeout(() => { settle(g); draw(); grid.querySelector('.mem-card')?.focus?.(); }, reduceMotion() ? 500 : 800);
    if (g.done) {
      const paid = finishGame(profile, creature, app.today(), 0, memPrize(g));
      setTimeout(() => result({ title: 'You found them all!', lines: [`It took ${g.moves} moves.`], ...paid, again: restart }), 500);
    }
  }
  fill(root,
    h('div', { class: 'game-top' }, moves, h('button', { class: 'secondary', id: 'game-exit', type: 'button', onclick: exit }, 'Exit game')),
    h('p', { class: 'small' }, 'Tap two cards to find a matching pair. Take your time!'), grid);
  draw();
  return { stop: () => clearTimeout(timer) };
}
