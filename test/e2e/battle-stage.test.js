// The battle stage on its own test page (test/fixtures/battle-stage.html): every animation runs, ends on time,
// never clips, survives being interrupted, and has a still version for reduced motion.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch } from './helpers.js';
import { captureEvent } from '../../tools/battle-filmstrip.mjs';
import { CUES, EVENTS } from '../../js/logic/battle-cues.js';
import { SPECIES } from '../../js/logic/species.js';
import { creatureParts } from '../../js/assets/creatures.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

async function open(query = '', { width = 820, height = 600, reducedMotion = 'no-preference' } = {}) {
  const context = await env.browser.newContext({ viewport: { width, height }, reducedMotion });
  const errors = [];
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${env.server.url}test/fixtures/battle-stage.html?${query}`);
  await page.waitForFunction(() => window.ready);
  return { page, context, errors };
}
const running = (page, sel) => page.evaluate((s) => document.querySelector(s).getAnimations().filter((a) => a.animationName?.startsWith('bs-') && a.playState === 'running').map((a) => a.animationName), sel);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('every battle event plays an animation on the wild creature and is over on time', { skip, timeout: 60000 }, async () => {
  const { page, context, errors } = await open('wild=glowmoth&wstage=2&hearts=10');
  for (const event of EVENTS) {
    await page.evaluate(() => document.querySelector('#buttons button:last-child').click());
    if (event === 'cheer' || event === 'oops') await page.evaluate(() => window.stage.set({ heartsLeft: 0, won: true, prize: 'crickets' }));
    const cue = CUES[event];
    await page.evaluate((e) => window.playEvent(e), event);
    const wild = await running(page, '.bs-wild .bs-mover');
    assert.equal(wild.length, 1, `${event}: wild animation`);
    assert.ok([cue.wild.anim].flat().map((a) => `bs-${a}`).includes(wild[0]), `${event}: ${wild[0]}`);
    if (cue.player) assert.deepEqual(await running(page, '.bs-player .bs-mover'), [`bs-${cue.player.anim}`], `${event}: player animation`);
    assert.equal(await page.getAttribute('.bs-wild .bs-mover', 'style'), `--bs-ms: ${cue.ms}ms;`, `${event}: length comes from the cue table`);
    assert.match(await page.getAttribute('.bs-wild .bs-creature svg', 'class'), new RegExp(`pose-${cue.wild.pose}`), `${event}: pose while playing`);
    await wait(cue.ms + 120);
    assert.deepEqual(await running(page, '.bs-wild .bs-mover'), [], `${event}: finished within ${cue.ms + 120} ms`);
    assert.equal(await page.getAttribute('.bs-wild .bs-mover', 'data-anim'), null, `${event}: cleaned up`);
    assert.equal(await page.locator('.bs-fx > *').count(), 0, `${event}: decorations removed`);
    assert.equal(await page.locator('.bs-ghost').count(), 0);
  }
  assert.deepEqual(errors, []);
  await context.close();
});

test('every battle event really moves: the picture changes during each animation', { skip, timeout: 60000 }, async () => {
  const { page, context, errors } = await open('wild=stormwyrm&wstage=3&player=thistlefox&pstage=2&hearts=10');
  for (const event of EVENTS) {
    const frames = await captureEvent(page, event, [0, 150, 300]);
    assert.ok(!frames[0].equals(frames[1]) || !frames[0].equals(frames[2]), `${event}: frames at 0, 150 and 300 ms are all identical`);
    assert.ok(!frames[1].equals(frames[2]), `${event}: nothing changes between 150 and 300 ms`);
  }
  assert.deepEqual(errors, []);
  await context.close();
});

test('the endings: a new friend walks over to your side, a beaten creature stays and cheers, an escaped one is gone', { skip }, async () => {
  const { page, context, errors } = await open('wild=cloverknight&hearts=6');
  const look = () => page.evaluate(() => ({ place: document.querySelector('.battle-stage').dataset.place, flipped: !!document.querySelector('.bs-wild .c-flip'), pose: document.querySelector('.bs-wild .bs-creature svg').getAttribute('class'),
    dx: Math.round(document.querySelector('.bs-wild .bs-mover').getBoundingClientRect().left - document.querySelector('.bs-player .bs-mover').getBoundingClientRect().left), opacity: getComputedStyle(document.querySelector('.bs-wild .bs-mover')).opacity,
    banner: document.querySelector('.bs-banner').textContent, pips: document.querySelector('.bs-pips').hidden, live: document.querySelector('.bs-live').textContent }));
  const before = await look();
  assert.deepEqual([before.place, before.flipped], ['field', false]);
  await page.evaluate(() => window.playEvent('win-befriend')); await wait(1150);
  const friend = await look();
  assert.deepEqual([friend.place, friend.flipped, friend.pips], ['joined', true, true]);
  assert.match(friend.pose, /pose-cheer/);
  assert.ok(friend.dx > 40 && friend.dx < before.dx * 0.5, `stands beside your creature (${friend.dx}px away, was ${before.dx})`);
  assert.equal(friend.banner, 'Cloverknight joined you!');
  assert.match(friend.live, /wants to be your friend/);
  await page.evaluate(() => { document.querySelector('#buttons button:last-child').click(); window.playEvent('win-crickets'); }); await wait(1150);
  const won = await look();
  assert.deepEqual([won.place, won.flipped, won.banner], ['field', false, 'You won!']);
  assert.equal(won.dx, before.dx);
  await page.evaluate(() => { document.querySelector('#buttons button:last-child').click(); window.playEvent('escape'); }); await wait(1050);
  const gone = await look();
  assert.deepEqual([gone.place, gone.opacity, gone.banner], ['gone', '0', 'Cloverknight got away!']);
  assert.deepEqual(errors, []);
  await context.close();
});

test('tired and charged: few hearts left shows a worn-out wobble, a run of two shows the special charging', { skip }, async () => {
  const { page, context, errors } = await open('wild=glowmoth&hearts=10');
  const cls = () => page.getAttribute('.battle-stage', 'class');
  await page.evaluate(() => window.stage.set({ heartsLeft: 3, charge: 1 }));
  assert.doesNotMatch(await cls(), /tired|charged/);
  assert.equal(await page.locator('.bs-pip.on').count(), 1);
  await page.evaluate(() => window.stage.set({ heartsLeft: 2, charge: 2 }));
  assert.match(await cls(), /tired/); assert.match(await cls(), /charged/);
  assert.equal(await page.locator('.bs-pip.on').count(), 2);
  assert.match(await page.getAttribute('.bs-pips', 'aria-label'), /ready on the next right answer/);
  assert.deepEqual(await running(page, '.bs-wild .bs-creature'), ['bs-wobble']);
  assert.deepEqual(await running(page, '.bs-wild .bs-sweat'), ['bs-drip']);
  assert.deepEqual(await running(page, '.bs-player .bs-aura'), ['bs-aura']);
  assert.equal(await page.getAttribute('.bs-hearts', 'aria-label'), 'Glowmoth: 2 of 10 hearts');
  assert.deepEqual(errors, []);
  await context.close();
});

test('idle is alive for every species: the picture keeps changing and each moving part has its own animation', { skip, timeout: 300000 }, async () => {
  const { page, context, errors } = await open('wild=glowmoth');
  const PARTS = { wings: 'p-wings', bigwings: 'p-bigwings', batwings: 'p-batwings', stars: 'p-stars', crystals: 'p-crystals', bubbles: 'p-bubbles', lantern: 'p-lantern', bolts: 'p-bolts', antennae: 'p-antennae', flame: 'p-flame' };
  const tempos = new Set();
  for (const s of SPECIES) {
    await page.goto(`${env.server.url}test/fixtures/battle-stage.html?wild=${s.id}&wstage=3`);
    await page.waitForFunction(() => window.ready);
    const a = await page.locator('.bs-wild .bs-creature').screenshot();
    await wait(400);
    const b = await page.locator('.bs-wild .bs-creature').screenshot();
    assert.ok(!a.equals(b), `${s.id}: stands perfectly still`);
    const want = ['c-eyes', ...(s.art.tail !== 'none' ? ['c-tail'] : []), ...(s.art.ears !== 'none' ? ['c-ears'] : []), ...creatureParts(s.id, 3).filter((p) => PARTS[p]).map((p) => PARTS[p])];
    const still = await page.evaluate((classes) => classes.filter((c) => !document.querySelector(`.bs-wild .bs-creature .${c}`)?.getAnimations().some((x) => x.animationName.startsWith('bs-') && x.playState === 'running')), want);
    assert.deepEqual(still, [], `${s.id}: parts with no idle animation`);
    tempos.add(await page.evaluate(() => { const st = document.querySelector('.bs-wild .bs-creature').style; return `${st.getPropertyValue('--bs-k')}/${st.getPropertyValue('--bs-d')}`; }));
  }
  assert.ok(tempos.size >= 30, `species keep their own tempo (${tempos.size} different ones)`);
  assert.deepEqual(errors, []);
  await context.close();
});

for (const width of [375, 1024]) {
  test(`nothing is clipped at ${width}px: every species, all 3 stages, through hit, special, both dodges, attacks and the entrance`, { skip, timeout: 600000 }, async () => {
    const { page, context, errors } = await open('wild=glowmoth', { width, height: 700 });
    const bad = await page.evaluate(async ({ ids, cues }) => {
      const { createBattleStage } = await import('../../js/ui/battle-stage.js');
      const mount = document.getElementById('mount'), out = [];
      // [event, side, forced animation or null, check only the last frame]
      const cases = [['hit', 'wild', null], ['special', 'wild', null], ['dodge', 'wild', 'sidestep'], ['dodge', 'wild', 'duck'], ['taunt', 'wild', 'hopspin'], ['hit', 'player', null], ['special', 'player', null], ['dodge', 'player', null], ['enter', 'wild', null, true], ['enter', 'player', null, true]];
      for (const id of ids) for (const stageNo of [1, 2, 3]) {
        const st = createBattleStage({ player: { species: id, stage: stageNo }, wild: { species: id, stage: stageNo }, hearts: 14, reducedMotion: () => false });
        mount.replaceChildren(st.el);
        const field = st.el.querySelector('.bs-field').getBoundingClientRect();
        for (const [event, side, forced, endOnly] of cases) {
          st.set({ heartsLeft: 14 });
          st.play(event, {}, { damage: 1 });
          const mover = st.el.querySelector(`.bs-${side} .bs-mover`);
          if (forced) { mover.dataset.anim = forced; }
          const anim = mover.getAnimations().find((a) => a.animationName?.startsWith('bs-'));
          if (!anim) { out.push(`${id}-${stageNo} ${event} ${side}: no animation`); continue; }
          anim.pause();
          const body = st.el.querySelector(`.bs-${side} .bs-creature .c-pose`);
          const ms = cues[event].ms;
          for (let t = endOnly ? ms : 0; t <= ms; t += 50) {
            anim.currentTime = Math.min(t, ms - 0.01);
            const b = body.getBoundingClientRect();
            if (b.left < field.left - 0.5 || b.right > field.right + 0.5 || b.top < field.top - 0.5 || b.bottom > field.bottom + 0.5) { out.push(`${id}-${stageNo} ${event} ${side}${forced ? ` (${forced})` : ''} at ${t}ms: ${Math.round(b.left - field.left)},${Math.round(b.top - field.top)},${Math.round(field.right - b.right)},${Math.round(field.bottom - b.bottom)}`); break; }
          }
        }
        st.destroy();
      }
      return out;
    }, { ids: SPECIES.map((s) => s.id), cues: CUES });
    assert.deepEqual(bad, []);
    // the whole stage fits the page with no sideways scrolling
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    assert.deepEqual(errors, []);
    await context.close();
  });
}

test('interrupt safety: ten events in 300 ms leave the hearts, charge and pose exactly where the last one says', { skip }, async () => {
  const { page, context, errors } = await open('wild=glowmoth&hearts=12');
  await page.evaluate(() => new Promise((done) => {
    const seq = [['hit', { heartsLeft: 11, charge: 1 }, 1], ['hit', { heartsLeft: 10, charge: 2 }, 1], ['special', { heartsLeft: 8, charge: 0 }, 2], ['dodge', { charge: 0 }, 0], ['hit', { heartsLeft: 7, charge: 1 }, 1],
      ['hit', { heartsLeft: 6, charge: 2 }, 1], ['special', { heartsLeft: 4, charge: 0 }, 2], ['dodge', { charge: 0 }, 0], ['hit', { heartsLeft: 3, charge: 1 }, 1], ['hit', { heartsLeft: 2, charge: 2 }, 1]];
    seq.forEach(([e, rest, damage], i) => setTimeout(() => { window.stage.play(e, rest, { damage }); if (i === seq.length - 1) done(); }, i * 30));
  }));
  const now = await page.evaluate(() => ({ left: document.querySelector('.bs-hearts').dataset.left, full: document.querySelectorAll('.bs-heart.full').length, lost: document.querySelectorAll('.bs-heart.lost').length, pop: document.querySelectorAll('.bs-heart.pop').length,
    charge: document.querySelector('.bs-pips').dataset.charge, cls: document.querySelector('.battle-stage').className, fx: document.querySelectorAll('.bs-burst').length, live: document.querySelector('.bs-live').textContent }));
  assert.deepEqual([now.left, now.full, now.lost, now.pop, now.charge, now.fx], ['2', 2, 10, 1, '2', 1], 'right away, mid-animation');
  assert.match(now.cls, /tired/); assert.match(now.cls, /charged/);
  assert.equal(now.live, 'Hit! Glowmoth has 2 hearts left.');
  await wait(CUES.hit.ms + 150);
  const later = await page.evaluate(() => ({ anim: document.querySelector('.bs-wild .bs-mover').dataset.anim ?? null, panim: document.querySelector('.bs-player .bs-mover').dataset.anim ?? null, fx: document.querySelector('.bs-fx').childElementCount,
    wild: document.querySelector('.bs-wild .bs-creature svg').getAttribute('class'), player: document.querySelector('.bs-player .bs-creature svg').getAttribute('class'), full: document.querySelectorAll('.bs-heart.full').length, shake: document.querySelector('.bs-field').dataset.shake ?? null }));
  assert.deepEqual(later, { anim: null, panim: null, fx: 0, wild: 'creature stage-1 pose-ready', player: 'creature stage-1 pose-ready', full: 2, shake: null });
  assert.deepEqual(errors, []);
  await context.close();
});

test('pose changes keep the idle going: only the face is swapped, the wings never restart', { skip }, async () => {
  const { page, context, errors } = await open('wild=glowmoth&wstage=2&hearts=10');
  await wait(300);
  const t = await page.evaluate(() => {
    const wings = document.querySelector('.bs-wild .p-wings'); wings.__mark = 1;
    const before = wings.getAnimations()[0].currentTime;
    window.playEvent('hit');
    const same = document.querySelector('.bs-wild .p-wings');
    return { kept: same.__mark === 1, before, after: same.getAnimations()[0].currentTime, pose: document.querySelector('.bs-wild .bs-creature svg').getAttribute('class') };
  });
  assert.equal(t.kept, true); assert.ok(t.after >= t.before && t.before > 0);
  assert.match(t.pose, /pose-hurt/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('reduced motion: no battle animation runs, yet hearts, poses, endings and the spoken text still update', { skip }, async () => {
  const { page, context, errors } = await open('wild=reedwisp&wstage=3&hearts=10', { reducedMotion: 'reduce' });
  const moving = () => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  assert.equal(await moving(), 0, 'idle is still');
  for (const event of ['enter', 'hit', 'special', 'dodge']) {
    await page.evaluate((e) => window.playEvent(e), event);
    assert.equal(await moving(), 0, `${event}: nothing animates`);
    assert.equal(await page.locator('.bs-fx > *').count(), 0);
    assert.equal(await page.getAttribute('.bs-wild .bs-mover', 'data-anim'), null);
  }
  assert.equal(await page.getAttribute('.bs-hearts', 'data-left'), '7');
  assert.equal(await page.locator('.bs-heart.full').count(), 7);
  assert.match(await page.textContent('.bs-live'), /Reedwisp dodged\. Reedwisp has 7 hearts left\./);
  assert.match(await page.getAttribute('.bs-wild .bs-creature svg', 'class'), /pose-ready/);
  await page.evaluate(() => window.playEvent('win-befriend'));
  assert.equal(await moving(), 0);
  assert.equal(await page.getAttribute('.battle-stage', 'data-place'), 'joined');
  assert.equal(await page.isVisible('.bs-banner'), true);
  assert.equal(await page.textContent('.bs-banner'), 'Reedwisp joined you!');
  assert.match(await page.getAttribute('.bs-wild .bs-creature svg', 'class'), /pose-cheer/);
  assert.deepEqual(errors, []);
  await context.close();
});
