// Sky Flap, Critter Pop and Pattern Parrot. Same contract as games.js: draw into ctx.root, return { stop }.
import { h, icon, fill } from './dom.js';
import { creatureSvg } from './art.js';
import { createFlap, stepFlap, flap, prizeFor as flapPrize, H, FX, HALF, GATE_W, HEARTS } from '../logic/flap.js';
import { createPop, stepPop, whack, HOLES, prizeFor as popPrize } from '../logic/pop.js';
import { createPattern, nextRound, press, PADS, prizeFor as patternPrize } from '../logic/pattern.js';
import { createPatch, dig, flag as flagTile, score as patchScore, prizeFor as patchPrize, HEARTS as PATCH_HEARTS } from '../logic/patch.js';
import { createSpace, stepSpace, fire, prizeFor as spacePrize, F as SPACE_F } from '../logic/space.js';
import { createHangman, guess as hangGuess, advance as hangNext, shown as hangShown, LETTERS, prizeFor as hangPrize, ROUNDS } from '../logic/hangman.js';
import { createSnake, stepSnake, turn, prizeFor as snakePrize } from '../logic/snake.js';
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

// ---------------------------------------------------------------- Berry Patch
export function patchGame({ app, creature, root, exit, result, restart, difficulty, hand }) {
  const { audio } = app, profile = app.profile;
  const g = createPatch({ rng: Math.random, difficulty });
  let raf = 0, last = null, flagMode = false, ended = false;
  const time = h('span', { class: 'pill gold', id: 'patch-time' }, '0s');
  const left = h('span', { class: 'pill', id: 'patch-left' });
  const hearts = h('span', { class: 'pill', id: 'patch-hearts' });
  const grid = h('div', { class: 'patch-grid', role: 'group', 'aria-label': 'Berry patch', style: `grid-template-columns:repeat(${g.cols}, minmax(0,1fr))` });
  const flagBtn = h('button', { class: 'secondary', id: 'patch-flag', type: 'button', 'aria-pressed': 'false', onclick: () => { flagMode = !flagMode; flagBtn.setAttribute('aria-pressed', String(flagMode)); flagBtn.classList.toggle('on', flagMode); flagBtn.textContent = flagMode ? '🚩 Flagging' : '🚩 Flag mode'; } }, '🚩 Flag mode');
  const label = (t, i) => `Tile ${i + 1}, ${t.state === 'open' ? (t.near ? `${t.near} skunks nearby` : 'clear') : t.state === 'boom' ? 'skunk' : t.state === 'flag' ? 'flagged' : 'hidden'}`;
  function draw() {
    const had = grid.contains(document.activeElement) ? document.activeElement.dataset.index : null;
    grid.replaceChildren(...g.tiles.map((t) => h('button', { class: `patch-tile ${t.state}${t.state === 'open' && t.near ? ` n${t.near}` : ''}`, type: 'button', 'data-index': String(t.index), 'data-state': t.state, 'aria-label': label(t, t.index),
      onclick: () => tap(t.index) }, t.state === 'open' ? (t.near ? String(t.near) : '') : t.state === 'boom' ? '🦨' : t.state === 'flag' ? '🚩' : '')));
    if (had != null) grid.querySelector(`[data-index="${had}"]`)?.focus();
    hearts.replaceChildren(...Array.from({ length: PATCH_HEARTS }, (_, i) => { const x = icon('heart'); if (i >= g.hearts) x.classList.add('lost'); return x; }));
    left.textContent = `Safe tiles left ${g.tiles.filter((t) => !t.skunk && t.state !== 'open').length}`;
  }
  function tap(i) {
    if (ended) return;
    if (flagMode) { if (flagTile(g, i)) { audio.play('pop'); draw(); } return; }
    const r = dig(g, i);
    if (r === 'ignored') return;
    audio.play(r === 'boom' ? 'gentle' : 'chirp'); draw();
    if (g.over) finish();
  }
  function finish() {
    ended = true; cancelAnimationFrame(raf);
    setTimeout(() => {
      const paid = finishGame(profile, creature, app.today(), 0, patchPrize(g));
      if (g.won) result({ title: 'Patch cleared!', lines: [`You dug up every berry in ${patchScore(g)} seconds!`], game: 'patch', score: patchScore(g), ...paid, again: restart });
      else result({ title: 'Skunks everywhere!', lines: ['The skunks got you this time. Try again!'], ...paid, again: restart });
    }, 700);
  }
  fill(root,
    h('div', { class: 'game-top' }, time, hearts, h('button', { class: 'secondary', id: 'game-exit', type: 'button', onclick: exit }, 'Exit game')),
    h('p', { class: 'small' }, 'Dig for berries. A number counts the skunks touching that tile. Avoid the skunks!'),
    left, grid, h('div', { class: `actions hand-${hand}` }, flagBtn));
  draw();
  function frame(ts) {
    if (last == null) last = ts;
    const dt = Math.min(0.25, (ts - last) / 1000); last = ts;
    if (g.placed && !g.over) { g.t += dt; time.textContent = `${Math.floor(g.t)}s`; }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return { stop: () => { cancelAnimationFrame(raf); ended = true; } };
}

// ---------------------------------------------------------------- Star Drift
export function spaceGame({ app, creature, root, exit, result, restart, art, difficulty, hand }) {
  const { audio } = app, profile = app.profile;
  const g = createSpace({ rng: Math.random, difficulty });
  const input = { left: false, right: false, thrust: false };
  let raf = 0, last = null, lastHearts = g.hearts;
  fill(root,
    h('div', { class: 'game-top' }, h('span', { class: 'pill gold', id: 'space-score' }, 'Rocks 0'), h('span', { class: 'pill', id: 'space-hearts' }),
      h('button', { class: 'secondary', id: 'game-exit', type: 'button', onclick: exit }, 'Exit game')),
    h('div', { class: 'game-wrap', html: `<svg class="game-field space-field" viewBox="0 0 ${SPACE_F} ${SPACE_F}" role="img" aria-label="Star Drift. Turn with the arrow keys, boost with the up arrow, and zap rocks with Space." style="touch-action:none">
      <rect width="${SPACE_F}" height="${SPACE_F}" fill="#14163a"/>
      ${Array.from({ length: 24 }, (_, i) => `<circle cx="${(i * 37) % 100}" cy="${(i * 53 + 11) % 100}" r=".4" fill="#fff" opacity=".7"/>`).join('')}
      <g class="rocks"></g><g class="bullets"></g><g class="ship"><g class="ship-art"><g transform="translate(-6 -6)">${art(12)}</g><path d="M0 -9L2 -6H-2Z" fill="#ffd34d"/></g></g></svg>` }),
    h('div', { class: `actions space-pad hand-${hand}` },
      h('button', { class: 'secondary big', id: 'space-left', type: 'button', 'aria-label': 'Turn left' }, '◀'),
      h('button', { class: 'secondary big', id: 'space-right', type: 'button', 'aria-label': 'Turn right' }, '▶'),
      h('button', { class: 'secondary big', id: 'space-boost', type: 'button' }, 'Boost'),
      h('button', { class: 'primary big', id: 'space-fire', type: 'button' }, 'Zap!')),
    h('p', { class: 'small' }, '← → turn, ↑ boost, Space zaps. Zap the rocks! Big ones split in two.'));
  const svg = root.querySelector('.space-field'), rockLayer = svg.querySelector('.rocks'), bulletLayer = svg.querySelector('.bullets'), ship = svg.querySelector('.ship'), shipArt = svg.querySelector('.ship-art');
  const bind = (id, key) => { const b = root.querySelector(id); const on = (v) => (e) => { e.preventDefault?.(); input[key] = v; }; b.addEventListener('pointerdown', on(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, on(false)); };
  bind('#space-left', 'left'); bind('#space-right', 'right'); bind('#space-boost', 'thrust');
  const zap = () => { if (fire(g)) audio.play('pop'); };
  root.querySelector('#space-fire').addEventListener('click', zap);
  const MAP = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'thrust', w: 'thrust' };
  const kd = (e) => { if (MAP[e.key]) { input[MAP[e.key]] = true; e.preventDefault(); } else if (e.key === ' ') { e.preventDefault(); zap(); } };
  const ku = (e) => { if (MAP[e.key]) input[MAP[e.key]] = false; };
  document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
  const drawHearts = () => { const el = root.querySelector('#space-hearts'); el.replaceChildren(...Array.from({ length: g.maxHearts }, (_, i) => { const x = icon('heart'); if (i >= g.hearts) x.classList.add('lost'); return x; })); el.setAttribute('aria-label', `${g.hearts} hearts`); };
  drawHearts();
  const stopAll = () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); };
  function frame(ts) {
    if (last == null) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    stepSpace(g, dt, input);
    ship.setAttribute('transform', `translate(${g.ship.x} ${g.ship.y})`); shipArt.setAttribute('transform', `rotate(${(g.ship.a * 180) / Math.PI})`);
    ship.classList.toggle('bumped', g.safe > 0 && g.t > 1.7);
    rockLayer.replaceChildren(...g.rocks.map((r) => { const el = document.createElementNS(SVGNS, 'circle'); el.setAttribute('class', `rock s${r.size}`); el.setAttribute('cx', r.x.toFixed(1)); el.setAttribute('cy', r.y.toFixed(1)); el.setAttribute('r', r.r); el.setAttribute('fill', '#8c8aa0'); el.setAttribute('stroke', '#d9d7ee'); el.setAttribute('stroke-width', '.8'); return el; }));
    bulletLayer.replaceChildren(...g.bullets.map((b) => { const el = document.createElementNS(SVGNS, 'circle'); el.setAttribute('cx', b.x.toFixed(1)); el.setAttribute('cy', b.y.toFixed(1)); el.setAttribute('r', '1'); el.setAttribute('fill', '#ffd34d'); return el; }));
    if (g.hearts !== lastHearts) { lastHearts = g.hearts; drawHearts(); audio.play('gentle'); }
    root.querySelector('#space-score').textContent = `Rocks ${g.score}`;
    if (g.over) {
      stopAll();
      const paid = finishGame(profile, creature, app.today(), 0, spacePrize(g));
      return result({ title: 'Star Drift complete!', lines: [`You zapped ${g.score} space rocks!`], game: 'space', score: g.score, ...paid, again: restart });
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return { stop: stopAll };
}

// ---------------------------------------------------------------- Caterpillar (Snake)
export function snakeGame({ app, creature, root, exit, result, restart, difficulty, hand }) {
  const { audio } = app, profile = app.profile;
  const g = createSnake({ rng: Math.random, difficulty });
  let raf = 0, last = null, lastScore = 0, sx = null, sy = null;
  fill(root,
    h('div', { class: 'game-top' }, h('span', { class: 'pill gold', id: 'snake-score' }, 'Berries 0'), h('button', { class: 'secondary', id: 'game-exit', type: 'button', onclick: exit }, 'Exit game')),
    h('div', { class: 'game-wrap', html: `<svg class="game-field snake-field" viewBox="0 0 ${g.cols} ${g.rows}" role="img" aria-label="Caterpillar. Steer with the arrow keys, the buttons or a swipe, and eat the berries." style="touch-action:none"><rect width="${g.cols}" height="${g.rows}" fill="#c9f0c0"/><g class="cells"></g></svg>` }),
    h('div', { class: `actions snake-pad hand-${hand}` }, [['left', '◀'], ['up', '▲'], ['down', '▼'], ['right', '▶']].map(([d, ch]) =>
      h('button', { class: 'secondary big', id: `snake-${d}`, type: 'button', 'aria-label': d, onclick: () => turn(g, d) }, ch))),
    h('p', { class: 'small' }, g.wrap ? 'Arrow keys, buttons or a swipe. The edges wrap around!' : 'Arrow keys, buttons or a swipe. Stay off the walls and your own tail!'));
  const svg = root.querySelector('.snake-field'), cells = svg.querySelector('.cells');
  svg.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
  svg.addEventListener('pointerup', (e) => {
    if (sx == null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    turn(g, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });
  const MAP = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down' };
  const kd = (e) => { if (MAP[e.key]) { e.preventDefault(); turn(g, MAP[e.key]); } };
  document.addEventListener('keydown', kd);
  const stopAll = () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', kd); };
  const draw = () => {
    const out = [];
    if (g.food) out.push(`<circle class="food" data-x="${g.food.x}" data-y="${g.food.y}" cx="${g.food.x + 0.5}" cy="${g.food.y + 0.5}" r=".36" fill="#e5484d" stroke="#a82a32" stroke-width=".06"/>`);
    g.body.forEach((b, i) => {
      if (i === 0) out.push(`<circle class="head" cx="${b.x + 0.5}" cy="${b.y + 0.5}" r=".5" fill="#2e9e4a" stroke="#1d6b31" stroke-width=".07"/><circle cx="${b.x + 0.35}" cy="${b.y + 0.4}" r=".09" fill="#fff"/><circle cx="${b.x + 0.65}" cy="${b.y + 0.4}" r=".09" fill="#fff"/>`);
      else out.push(`<circle class="seg" cx="${b.x + 0.5}" cy="${b.y + 0.5}" r="${i % 2 ? 0.44 : 0.47}" fill="${i % 2 ? '#5ccd6e' : '#49bf5d'}"/>`);
    });
    cells.innerHTML = out.join('');
  };
  function frame(ts) {
    if (last == null) last = ts;
    const dt = Math.min(0.1, (ts - last) / 1000); last = ts;
    stepSnake(g, dt); draw();
    if (g.score !== lastScore) { lastScore = g.score; audio.play('chirp'); root.querySelector('#snake-score').textContent = `Berries ${g.score}`; }
    if (g.over) {
      stopAll();
      const paid = finishGame(profile, creature, app.today(), 0, snakePrize(g));
      return result({ title: 'Wiggle-tastic!', lines: [`Your caterpillar ate ${g.score} berries!`], game: 'snake', score: g.score, ...paid, again: restart });
    }
    raf = requestAnimationFrame(frame);
  }
  draw(); raf = requestAnimationFrame(frame);
  return { stop: stopAll };
}

// ---------------------------------------------------------------- Hangman
export function hangmanGame({ app, creature, root, exit, result, restart, difficulty }) {
  const { audio } = app, profile = app.profile;
  const list = app.store.state.wordLists[profile.activeListId] ?? app.store.state.wordLists.sample;
  const g = createHangman({ words: list.words, rng: Math.random, difficulty });
  let timer = 0;
  const round = h('span', { class: 'pill gold', id: 'hang-round' });
  const lives = h('span', { class: 'pill', id: 'hang-lives' });
  const slots = h('div', { class: 'hang-word', id: 'hang-word', 'aria-live': 'polite' });
  const hint = h('p', { class: 'lead', id: 'hang-hint' });
  const say = h('p', { class: 'small', id: 'hang-say', role: 'status' });
  const hintBtn = h('button', { class: 'secondary', id: 'hang-hint-btn', type: 'button', onclick: () => { g.hintShown = true; draw(); } }, 'Show a hint');
  const keys = LETTERS.map((l) => h('button', { class: 'key', type: 'button', 'data-letter': l, onclick: () => pick(l) }, l.toUpperCase()));
  function draw(reveal = false) {
    round.textContent = `Word ${Math.min(g.i + 1, ROUNDS)} of ${g.picks.length}`;
    lives.replaceChildren(...Array.from({ length: g.maxLives }, (_, i) => { const x = icon('heart'); if (i >= g.lives) x.classList.add('lost'); return x; })); lives.setAttribute('aria-label', `${g.lives} hearts`);
    slots.replaceChildren(...hangShown(g, reveal).map((c) => h('span', { class: `slot${c ? ' on' : ''}` }, c ? c.toUpperCase() : '')));
    slots.setAttribute('aria-label', `Word with ${g.entry.word.length} letters`);
    hint.textContent = g.hintShown ? `Hint: ${g.entry.definition}` : '';
    hintBtn.hidden = g.hintShown;
    keys.forEach((k) => { const l = k.dataset.letter; k.disabled = g.guessed.includes(l) || g.status !== 'playing'; k.classList.toggle('miss', g.guessed.includes(l) && !g.entry.word.toLowerCase().includes(l)); });
  }
  function pick(l) {
    const r = hangGuess(g, l);
    if (r === 'ignored') return;
    audio.play(r === 'hit' || r === 'solved' ? 'chime' : 'pop');
    if (r === 'solved' || r === 'failed') {
      draw(true); say.textContent = r === 'solved' ? `Yes! ${g.entry.word}` : `The word was ${g.entry.word}.`;
      app.speaker?.speak?.(g.entry.word);
      timer = setTimeout(() => { if (hangNext(g)) { say.textContent = ''; draw(); } else finish(); }, 1500);
    } else draw();
  }
  function finish() {
    const paid = finishGame(profile, creature, app.today(), 0, hangPrize(g));
    result({ title: g.solved === g.picks.length ? 'Word wizard!' : 'Good guessing!', lines: [`You solved ${g.solved} of ${g.picks.length} words!`], game: 'hangman', score: g.solved, ...paid, again: restart });
  }
  if (g.over) { fill(root, h('p', { class: 'lead' }, 'This list has no words that work here yet.'), h('button', { class: 'secondary', id: 'game-exit', onclick: exit }, 'Back')); return { stop() {} }; }
  const kd = (e) => { if (/^[a-z]$/i.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) pick(e.key); };
  document.addEventListener('keydown', kd);
  fill(root,
    h('div', { class: 'game-top' }, round, lives, h('button', { class: 'secondary', id: 'game-exit', type: 'button', onclick: exit }, 'Exit game')),
    slots, hint, h('p', {}, hintBtn), say, h('div', { class: 'keyboard', role: 'group', 'aria-label': 'Letters' }, keys));
  draw();
  return { stop: () => { clearTimeout(timer); document.removeEventListener('keydown', kd); } };
}
