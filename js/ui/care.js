// Care screen + Berry Catch game: feed berries, give a bath, pet, play. All gentle, nothing can go wrong.
import { h, icon, fill } from './dom.js';
import { creatureSvg } from './art.js';
import { careOf, moodOf, giveBerry, pet, finishBath, finishGame, claimSparkle, MEASURES, METER_MAX, SPARKLE_CRICKETS } from '../logic/care.js';
import { createCatchGame, stepCatchGame, maxScore, FIELD, CATCH_Y, HALF_WIDTH } from '../logic/minigame.js';
import { awardTrophies } from '../logic/collection.js';
import { TROPHIES } from '../logic/trophies.js';
import { stageName } from '../logic/species.js';
import { makeInteractive } from './pet.js';

const LABELS = { fed: 'Fed', clean: 'Clean', loved: 'Loved', fun: 'Fun' };
const trophyNames = (ids) => ids.map((id) => TROPHIES.find((t) => t.id === id).name).join(', ');

// After any activity: hand out the daily sparkle gift if earned, then any trophies. Returns text to show.
function afterCare(app, creature) {
  const { store } = app, profile = app.profile, today = app.today();
  const bits = [];
  const gift = claimSparkle(profile, creature, today);
  if (gift.ok) bits.push(`Sparkling! ${creature.name ?? stageName(creature.species, creature.stage)} is so happy it left you a gift: +${SPARKLE_CRICKETS} crickets.`);
  const won = awardTrophies(profile, today);
  if (won.length) bits.push(`New trophy: ${trophyNames(won)}!`);
  store.save();
  return bits.join(' ');
}

export function careView(app, creatureId) {
  const { store, audio } = app;
  const profile = app.profile;
  const creature = profile.creatures.find((c) => c.id === creatureId);
  if (!creature) { queueMicrotask(() => app.go('/sanctuary')); return h('div'); }
  const today = app.today();
  const care = careOf(creature, today);
  const root = h('section', { class: 'screen care', 'data-creature': creature.id });
  const msg = h('p', { class: 'bubble care-msg', role: 'status', 'aria-live': 'polite' });
  let bath = null;                                                       // { left } while scrubbing
  // One persistent creature element: only its artwork is swapped on redraw, so its tap rotation, floating effects
  // and speech bubble survive every update.
  const critter = h('span', { class: 'care-creature' });
  makeInteractive(critter, app, { name: profile.name, speak: false, label: 'Pet your creature', onAct: () => { if (bath) scrub(); else love(); } });

  const say = (text) => { msg.textContent = text; msg.hidden = !text; };
  function hearts(n = 3) {
    const stage = root.querySelector('.care-stage'); if (!stage) return;
    for (let i = 0; i < n; i++) {
      const el = h('span', { class: 'float-heart', style: `left:${30 + Math.random() * 40}%; animation-delay:${i * 90}ms` }, icon('heart'));
      stage.append(el); setTimeout(() => el.remove(), 1400);
    }
  }
  const done = (text) => { const extra = afterCare(app, creature); say([text, extra].filter(Boolean).join(' ')); draw(); };

  function feed() {
    const r = giveBerry(profile, creature, today);
    if (!r.ok) { say(r.reason === 'full' ? 'Too full for another berry right now!' : 'No berries left. Practice words or open treasure stars to find more!'); draw(); return; }
    audio.play('chirp'); store.save();
    const stage = root.querySelector('.care-stage'); stage?.classList.add('munch'); setTimeout(() => stage?.classList.remove('munch'), 700);
    done('Yum! That berry was delicious.');
  }
  function love() {
    const r = pet(profile, creature, today);
    hearts(r.notch ? 5 : 2); audio.play('chirp'); store.save();
    done(r.notch ? 'They feel so loved!' : '');
  }
  function startBath() { bath = { left: 6 }; say('Scrub away the dirt! Tap Scrub or rub across the creature.'); draw(); }
  function scrub() {
    if (!bath) return;
    bath.left -= 1;
    if (bath.left <= 0) { bath = null; finishBath(profile, creature, today); audio.play('chime'); store.save(); done('Squeaky clean! Splish splash.'); }
    else draw();
  }

  function draw() {
    const mood = moodOf(care);
    const spots = bath ? Array.from({ length: bath.left }, (_, i) => h('span', { class: 'dirt', style: `left:${24 + ((i * 37) % 48)}%; top:${30 + ((i * 23) % 36)}%` })) : [];
    const holder = document.createElement('div');
    holder.innerHTML = creatureSvg(creature.species, creature.stage, { size: 220, mood: mood === 'sad' ? 'sad' : 'happy' });
    const oldArt = critter.querySelector(':scope > svg');
    if (oldArt) oldArt.replaceWith(holder.firstElementChild); else critter.prepend(holder.firstElementChild);
    critter.querySelectorAll('.dirt').forEach((d) => d.remove());
    critter.append(...spots);                                           // dirt sits on the creature itself
    fill(root,
      h('h1', {}, stageName(creature.species, creature.stage)),
      h('div', { class: 'stats' }, h('span', { class: `pill mood mood-${mood}`, 'data-mood': mood }, `Feeling ${mood}`), ' ',
        h('span', { class: 'pill', id: 'berry-count' }, '🍓', ` ${profile.berries ?? 0} berries`), ' ', h('span', { class: 'pill gold' }, '🦗', ` ${profile.crickets} crickets`)),
      h('div', { class: `care-stage${mood === 'sparkling' ? ' sparkling' : ''}${bath ? ' bathing' : ''}`, onpointermove: (e) => { if (bath && e.buttons) scrub(); } },
        critter, bath ? h('div', { class: 'suds', 'aria-hidden': 'true' }) : null),
      msg,
      h('div', { class: 'meters' }, MEASURES.map((m) => h('div', { class: 'meter-row', 'data-meter': m },
        h('span', { class: 'meter-label' }, LABELS[m]),
        h('span', { class: 'meter', role: 'meter', 'aria-label': `${LABELS[m]}: ${care[m]} of ${METER_MAX}`, 'aria-valuenow': String(care[m]), 'aria-valuemin': '0', 'aria-valuemax': String(METER_MAX) },
          Array.from({ length: METER_MAX }, (_, i) => h('span', { class: `pip${i < care[m] ? ' on' : ''}` })))))),
      bath
        ? h('div', { class: 'actions' }, h('button', { class: 'primary big', id: 'scrub', onclick: scrub }, icon('bath'), `Scrub (${bath.left} left)`), h('button', { class: 'secondary', onclick: () => { bath = null; say(''); draw(); } }, 'Stop'))
        : h('div', { class: 'care-actions' },
          h('button', { class: 'tile t-pink', id: 'care-feed', onclick: feed }, icon('berry'), 'Give a berry'),
          h('button', { class: 'tile t-blue', id: 'care-bath', onclick: startBath }, icon('bath'), 'Bath time'),
          h('button', { class: 'tile t-yellow', id: 'care-love', onclick: love }, icon('heart'), 'Give love'),
          h('button', { class: 'tile t-grey', id: 'care-play', onclick: () => app.go(`/play/${creature.id}`) }, icon('gamepad'), 'Play a game')),
      h('div', { class: 'actions' }, h('button', { class: 'secondary', onclick: () => app.go('/sanctuary') }, 'Back to Sanctuary')));
  }
  draw();
  critter.classList.add('pet-hop');
  say(''); const first = afterCare(app, creature); if (first) { say(first); draw(); }
  return root;
}

// ---------------------------------------------------------------- Berry Catch
export function playView(app, creatureId) {
  const { store, audio } = app;
  const profile = app.profile;
  const creature = profile.creatures.find((c) => c.id === creatureId);
  if (!creature) { queueMicrotask(() => app.go('/sanctuary')); return h('div'); }
  const root = h('section', { class: 'screen play', 'data-creature': creature.id });
  const art = creatureSvg(creature.species, creature.stage, { size: 24 });
  let g = null, raf = 0, last = null, px = 50, pointerX = null;
  const keys = new Set();
  let els = [];

  function field() {
    return `<svg class="game-field" viewBox="0 0 ${FIELD} ${FIELD}" role="img" aria-label="Berry catch field. Move your creature left and right to catch the falling berries." style="touch-action:none">
    <defs><linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#76d3ff"/><stop offset="1" stop-color="#d4f3ff"/></linearGradient></defs>
    <rect width="${FIELD}" height="${FIELD}" fill="url(#gsky)"/><circle cx="84" cy="14" r="9" fill="#ffe27a"/>
    <path d="M0 80Q25 74 50 80T100 78V100H0Z" fill="#4fc254"/><rect y="94" width="100" height="6" fill="#3fb350"/>
    <g class="berries"></g><g class="player"><g transform="translate(-12 70)">${art}</g></g></svg>`;
  }

  function intro() {
    cancelAnimationFrame(raf); g = null;
    fill(root,
      h('h1', {}, 'Berry Catch'),
      h('p', { class: 'lead' }, `Help ${stageName(creature.species, creature.stage)} catch the falling berries!`),
      h('p', {}, 'Slide with your mouse or finger, or use the ← and → keys. Golden berries count double. There is no way to lose.'),
      h('div', { class: 'actions' }, h('button', { class: 'primary big', id: 'game-start', onclick: start }, icon('play'), 'Start'),
        h('button', { class: 'secondary', onclick: () => app.go(`/care/${creature.id}`) }, 'Back')));
  }

  function start() {
    g = createCatchGame({ rng: Math.random }); px = 50; pointerX = null; last = null;
    fill(root,
      h('div', { class: 'game-top' }, h('span', { class: 'pill gold', id: 'game-score' }, '🍓', ' 0'), h('span', { class: 'small' }, '← → or drag')),
      h('div', { class: 'game-wrap', html: field() }));
    const svg = root.querySelector('.game-field');
    const layer = svg.querySelector('.berries');
    els = g.items.map((it) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      el.setAttribute('class', 'berry'); el.dataset.state = 'waiting';
      el.innerHTML = it.golden
        ? '<circle r="4.2" fill="#ffc928" stroke="#d99a00" stroke-width="1"/><path d="M0-2.600L.8-.8 2.600-.6 1.200.6 1.500 2.400 0 1.500-1.500 2.400-1.200.6-2.600-.6-.8-.8Z" fill="#fff6c2"/>'
        : '<circle r="3.800" fill="#e5484d" stroke="#a82a32" stroke-width="1"/><path d="M-1.600-3.600L0-5.400 1.600-3.600" fill="none" stroke="#3fb36b" stroke-width="1.200" stroke-linecap="round"/><circle cx="-1.200" cy="-1" r=".8" fill="#ffb3b8"/>';
      el.setAttribute('visibility', 'hidden'); layer.append(el); return el;
    });
    const toX = (e) => { const r = svg.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * FIELD; };
    svg.addEventListener('pointermove', (e) => { pointerX = toX(e); });
    svg.addEventListener('pointerdown', (e) => { pointerX = toX(e); });
    raf = requestAnimationFrame(frame);
  }

  function frame(ts) {
    if (last == null) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    if (pointerX != null) px = pointerX;
    else px += ((keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0)) * 70 * dt;
    stepCatchGame(g, dt, px); px = g.px;
    const player = root.querySelector('.player');
    if (player) player.setAttribute('transform', `translate(${px} 0)`);
    g.items.forEach((it, i) => {
      const el = els[i]; if (!el) return;
      if (el.dataset.state !== it.state) { el.dataset.state = it.state; if (it.state === 'caught') audio.play('chirp'); }
      if (it.state === 'falling') { el.setAttribute('visibility', 'visible'); el.setAttribute('transform', `translate(${it.x} ${it.y})`); el.dataset.x = it.x.toFixed(1); }
      else el.setAttribute('visibility', 'hidden');
    });
    const score = root.querySelector('#game-score'); if (score) score.replaceChildren(icon('berry'), ` ${g.caught}`);
    if (g.done) return finish();
    raf = requestAnimationFrame(frame);
  }

  function finish() {
    const { prize } = finishGame(profile, creature, app.today(), g.caught);
    audio.play('levelup');
    const extra = afterCare(app, creature);
    const best = maxScore(g);
    fill(root,
      h('h1', {}, g.caught >= best ? 'Perfect catch!' : 'Great game!'),
      h('div', { class: 'panel', id: 'game-result' },
        h('p', { class: 'lead' }, `You caught ${g.caught} of ${best} berries!`),
        h('p', {}, prize ? `You won ${prize} berr${prize === 1 ? 'y' : 'ies'} to keep.` : 'Catch 4 or more to win berries to keep.'),
        h('p', {}, `${stageName(creature.species, creature.stage)} had so much fun!`),
        extra ? h('p', { class: 'bubble' }, extra) : null),
      h('div', { class: 'actions' }, h('button', { class: 'primary big', id: 'game-again', onclick: start }, icon('play'), 'Play again'),
        h('button', { class: 'secondary', id: 'game-back', onclick: () => app.go(`/care/${creature.id}`) }, 'Back to care')));
  }

  const down = (e) => { if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) { keys.add(e.key); pointerX = null; e.preventDefault(); } };
  const up = (e) => keys.delete(e.key);
  document.addEventListener('keydown', down); document.addEventListener('keyup', up);
  app.cleanup.push(() => { cancelAnimationFrame(raf); document.removeEventListener('keydown', down); document.removeEventListener('keyup', up); });
  intro();
  return root;
}
