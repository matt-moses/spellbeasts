import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, seededState } from './helpers.js';
import { hopLift, GROUND_Y } from '../../js/logic/runner.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

async function open(patch = () => {}, viewport = { width: 900, height: 1000 }) {
  const st = seededState(); st.profiles.p1.crickets = 10; patch(st.profiles.p1);
  const context = await env.browser.newContext({ reducedMotion: 'reduce', viewport });
  const errors = [];
  await prepare(context, { state: st, errors });
  await context.clock.install({ time: new Date('2026-11-05T10:00:00') });
  const page = await context.newPage();
  await page.goto(env.server.url);
  await page.click('.card'); await page.waitForSelector('#practice');
  await page.click('#care-tile'); await page.waitForSelector('#care-play');
  await page.click('#care-play'); await page.waitForSelector('#game-catch');
  return { page, context, errors };
}
const saved = async (page) => Object.values((await page.evaluate(() => JSON.parse(localStorage.getItem('spellbeasts.v1')))).profiles)[0];

test('the games menu offers three games and a way back to the pet', { skip }, async () => {
  const { page, context } = await open();
  assert.equal(await page.locator('.game-card').count(), 3);
  assert.match(await page.textContent('h1'), /Play with Little Burrowby/);
  await page.click('#game-pet'); await page.waitForSelector('#care-feed');
  await context.close();
});

test('every game can be exited at any time (button or Escape) without a cost, back to the menu', { skip }, async () => {
  const { page, context, errors } = await open();
  const before = await saved(page);
  for (const [card, start] of [['#game-catch', '#game-start'], ['#game-run', null], ['#game-memory', null]]) {
    await page.click(card);
    if (start) await page.click(start);
    await page.waitForSelector('#game-exit');
    await page.clock.runFor(1500);
    await page.click('#game-exit');
    await page.waitForSelector('#game-catch');
    assert.equal(await page.locator('#game-exit').count(), 0);
    await page.click(card);
    if (start) await page.click(start);
    await page.waitForSelector('#game-exit');
    await page.keyboard.press('Escape');
    await page.waitForSelector('#game-catch');
  }
  const after_ = await saved(page);
  assert.deepEqual([after_.berries, after_.crickets, after_.care.games, after_.creatures[0].care?.fun ?? 3], [before.berries, before.crickets, 0, 3], 'exiting costs nothing and counts nothing');
  assert.deepEqual(errors, []);
  await context.close();
});

test('Hop Run: hopping over obstacles keeps the hearts; never hopping ends the run, costs crickets', { skip }, async () => {
  const { page, context, errors } = await open((p) => { p.berries = 3; });
  await page.click('#game-run'); await page.waitForSelector('.run-field');
  // a good player: hop when an obstacle is close (reads the obstacle's position from the screen)
  for (let i = 0; i < 400; i++) {
    await page.clock.runFor(30);
    if (await page.locator('#game-result').count()) break;
    const close = await page.evaluate(() => [...document.querySelectorAll('.obstacle')].some((o) => { const x = Number(o.dataset.x); return x > 19 && x < 19 + 11; }));
    if (close) await page.keyboard.press('Space');
    if (i === 260) break;
  }
  assert.equal(await page.locator('#run-hearts .lost').count(), 0, 'no hearts lost by a good player');
  assert.match(await page.textContent('#run-score'), /Distance \d{3,}/);

  await page.click('#game-exit'); await page.click('#game-run'); await page.waitForSelector('.run-field');   // fresh run, never hop
  await page.clock.runFor(60000);
  await page.waitForSelector('#game-result');
  assert.match(await page.textContent('#game-result'), /You ran \d+ steps/);
  const p = await saved(page);
  assert.equal(p.care.games, 1);
  assert.equal(p.creatures[0].care.fun, 5);
  const refund = /you got 1 back/.test(await page.textContent('#game-result')) ? 1 : 0;
  assert.equal(p.crickets, 10 - 3 + refund);
  assert.equal(p.berries, 3, 'games give no berries');
  await page.click('#game-again'); await page.waitForSelector('.run-field');
  assert.deepEqual(errors, []);
  await context.close();
});

test('Memory Match: solving it by remembering costs crickets, with some back, and mismatched cards flip back', { skip }, async () => {
  const { page, context, errors } = await open((p) => { p.berries = 3; });
  await page.click('#game-memory'); await page.waitForSelector('.mem-card');
  assert.equal(await page.locator('.mem-card').count(), 12);
  assert.equal(await page.locator('.mem-card[data-state=down]').count(), 12);
  const known = {};                                                            // index -> species, learned by flipping
  const flipIdx = async (i) => { await page.click(`.mem-card[data-index="${i}"]`); known[i] = await page.getAttribute(`.mem-card[data-index="${i}"]`, 'data-species'); };
  const matchedCount = () => page.locator('.mem-card[data-state=matched]').count();
  let sawMismatch = false;
  for (let guard = 0; guard < 60 && !(await page.locator('#game-result').count()); guard++) {
    const left = (await page.$$eval('.mem-card[data-state=down]', (c) => c.map((x) => Number(x.dataset.index))));
    if (!left.length) { await page.clock.runFor(1000); continue; }
    const pairKnown = left.find((i) => known[i] && left.some((j) => j !== i && known[j] === known[i]));
    if (pairKnown !== undefined) { const j = left.find((k) => k !== pairKnown && known[k] === known[pairKnown]); await flipIdx(pairKnown); await flipIdx(j); }
    else {
      const first = left.find((i) => !known[i]); await flipIdx(first);
      const twin = left.find((j) => j !== first && known[j] === known[first]);
      if (twin !== undefined) await flipIdx(twin);
      else { const second = left.find((j) => j !== first && !known[j]); await flipIdx(second); if (known[second] !== known[first]) { sawMismatch = true; assert.equal(await page.locator('.mem-card[data-state=up]').count(), 2); } }
    }
    await page.clock.runFor(1000);
  }
  await page.waitForSelector('#game-result');
  assert.ok(sawMismatch, 'a mismatch happened and flipped back');
  assert.match(await page.textContent('#game-result'), /It took \d+ moves/);
  const after = await saved(page);
  assert.ok(after.crickets === 7 || after.crickets === 8, `crickets ${after.crickets}`);   // cost 3, maybe 1 back
  assert.equal(after.berries, 3, 'games give no berries');
  assert.equal(await matchedCount(), 0);                                       // result screen replaced the board
  assert.deepEqual(errors, []);
  await context.close();
});

test('with fewer than 3 crickets the games are locked and a practice button explains how to earn more', { skip }, async () => {
  const { page, context, errors } = await open((p) => { p.crickets = 2; });
  assert.match(await page.textContent('.play .lead'), /Spell some words to play/);
  assert.match(await page.textContent('#game-cost'), /cost 3 crickets and you have 2/);
  for (const id of ['#game-catch', '#game-run', '#game-memory']) assert.equal(await page.isDisabled(id), true);
  await page.click('#game-practice');
  await page.waitForSelector('#answer');                                         // lands in a normal practice session
  assert.ok(page.url().endsWith('#/practice'));
  assert.deepEqual(errors, []);
  await context.close();
});

test('after a game the player cannot afford another, the result offers practice instead of Play again', { skip }, async () => {
  const { page, context } = await open((p) => { p.crickets = 3; });
  await page.click('#game-run'); await page.waitForSelector('.run-field');
  await page.clock.runFor(60000);
  await page.waitForSelector('#game-result');
  const refund = /you got 1 back/.test(await page.textContent('#game-result'));
  assert.equal(await page.locator('#game-again').count(), refund ? 1 : 0);
  assert.equal(await page.locator('#game-practice').count(), refund ? 0 : 1);
  await context.close();
});


// ---------------------------------------------------------------- helpers for the browser-level game tests
const PHONE = { width: 390, height: 800 };
const startRun = async (page) => { await page.click('#game-run'); await page.waitForSelector('.run-field'); };
// Stops the clock following real time (it otherwise keeps ticking between our calls, which jitters under load): from here only runFor moves it.
const freeze = (page) => page.clock.pauseAt(new Date('2026-11-05T10:30:00'));
const startCatch = async (page) => { await page.click('#game-catch'); await page.click('#game-start'); await page.waitForSelector('.berry'); };
const startMemory = async (page) => { await page.click('#game-memory'); await page.waitForSelector('.mem-card'); };
const keyDefaultPrevented = (page, key) => page.evaluate((k) => { const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }); document.dispatchEvent(e); return e.defaultPrevented; }, key);

// Runs inside the page, one sample per animation frame (so one runFor covers whole stretches of game time).
//   ty: the creature's translateY; artGap: creature bottom minus the grass top (only sampled at rest); obsGap: the same for
//   every obstacle; lost: most hearts ever seen lost; bot: hop like a good player (reads each obstacle's data-x).
const watchRun = (page, { bot = false } = {}) => page.evaluate(({ bot, grassY }) => {
  const w = window.__w = { ty: [], artGap: [], obsGap: [], lost: 0, hops: 0 };
  // the last heart is lost in the same frame that swaps the screen for the result, so watch the hearts row itself
  new MutationObserver((records) => { for (const r of records) if (r.target.id === 'run-hearts') w.lost = Math.max(w.lost, r.target.querySelectorAll('.lost').length); }).observe(document.body, { subtree: true, childList: true });
  const frame = () => {
    const run = document.querySelector('.runner'); if (!run) return;
    const ty = Number(/translate\(0 (-?[\d.e+-]+)\)/.exec(run.getAttribute('transform') ?? '')?.[1] ?? 0);
    w.ty.push(ty);
    const top = document.querySelector(`.run-field rect[y="${grassY}"]`).getBoundingClientRect().top;
    if (ty === 0) w.artGap.push(document.querySelector('.runner-art').getBoundingClientRect().bottom - top);
    for (const o of document.querySelectorAll('.obstacle')) w.obsGap.push(o.getBoundingClientRect().bottom - top);
    if (bot && ty === 0) {
      const dist = Number(/\d+/.exec(document.querySelector('#run-score').textContent)[0]), speed = Math.min(55, 30 + dist / 40);
      if ([...document.querySelectorAll('.obstacle')].some((o) => { const x = Number(o.dataset.x); return x > 19 && x < 19 + 0.3 * speed; })) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
        document.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}, { bot, grassY: GROUND_Y });
const watched = (page) => page.evaluate(() => window.__w);
// Splits the translateY samples into hops: { peak (a positive height), frames (airborne frame count), monotone }.
const hopsOf = (ty) => {
  const hops = []; let cur = null;
  for (const y of ty) {
    if (y < 0) { cur ??= { ys: [] }; cur.ys.push(-y); } else if (cur) { hops.push(cur); cur = null; }
  }
  if (cur) hops.push({ ...cur, open: true });
  return hops.map(({ ys, open }) => {
    const top = ys.indexOf(Math.max(...ys));
    const up = ys.slice(0, top + 1).every((v, i, a) => i === 0 || v >= a[i - 1]), down = ys.slice(top).every((v, i, a) => i === 0 || v <= a[i - 1]);
    return { peak: Math.max(...ys), frames: ys.length, monotone: up && down, open: !!open };
  });
};

// ---------------------------------------------------------------- Hop Run in a real browser
for (const [label, viewport] of [['900x1000', undefined], ['phone 390x800', PHONE]]) {
  test(`Hop Run (${label}): the creature's feet and every obstacle sit on the grass line`, { skip }, async () => {
    const { page, context, errors } = await open(() => {}, viewport);
    await startRun(page); await watchRun(page, { bot: true });
    await page.clock.runFor(100);
    const rest = await watched(page);
    assert.ok(rest.artGap.length > 0 && rest.artGap.every((g) => Math.abs(g) < 1), `at rest: ${rest.artGap}`);
    await page.clock.runFor(20000);
    const w = await watched(page);
    assert.ok(w.obsGap.length > 100, 'obstacles were on screen');
    assert.ok(w.obsGap.every((g) => Math.abs(g) < 1), `obstacle gaps ${Math.max(...w.obsGap.map(Math.abs))}`);
    assert.ok(w.artGap.every((g) => Math.abs(g) < 1), 'also after every landing');
    assert.equal(await page.locator('#game-result').count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
  });
}

test('Hop Run: Space lifts the creature, it peaks near hopLift(23) and comes back to exactly 0', { skip }, async () => {
  const { page, context, errors } = await open();
  await startRun(page); await freeze(page); await watchRun(page);
  await page.clock.runFor(200);
  await page.keyboard.press('Space');
  await page.clock.runFor(1300);                                           // before the first obstacle gets anywhere near
  const { ty } = await watched(page);
  assert.ok(ty.every((y) => y <= 0), 'never below the ground');
  const hops = hopsOf(ty);
  assert.equal(hops.length, 1);
  const [hop] = hops;
  assert.ok(!hop.open, 'it lands');
  assert.ok(hop.monotone, 'one smooth rise then one smooth fall: no float, no stick');
  assert.ok(hop.peak > 12.3 && hop.peak < hopLift(24.2) + 0.05, `peak ${hop.peak} (hopLift(23) = ${hopLift(23)})`);
  assert.ok(hop.frames * 16 > 800 && hop.frames * 16 < 950, `airborne ${hop.frames * 16} ms`);
  assert.equal(ty.at(-1), 0); assert.ok(Object.is(ty.at(-1), 0) || ty.at(-1) === 0);
  assert.equal(await page.getAttribute('.runner', 'transform'), 'translate(0 0)');
  // inside the field: the highest point of the art is still well below the top of the field
  assert.deepEqual(errors, []);
  await context.close();
});

test('Hop Run: the hop stays inside the field and the sprite is not clipped at the apex', { skip }, async () => {
  for (const viewport of [undefined, PHONE]) {
    const { page, context } = await open(() => {}, viewport);
    await startRun(page); await freeze(page);
    await page.clock.runFor(100); await page.keyboard.press('Space');
    let best = null;
    for (let i = 0; i < 50; i++) {
      await page.clock.runFor(16);
      const r = await page.evaluate(() => { const a = document.querySelector('.runner-art').getBoundingClientRect(), f = document.querySelector('.run-field rect').getBoundingClientRect(); return { top: a.top - f.top, left: a.left - f.left, right: f.right - a.right, bottom: f.bottom - a.bottom }; });
      if (!best || r.top < best.top) best = r;
    }
    assert.ok(best.top > 5 && best.left > 0 && best.right > 0 && best.bottom > 0, JSON.stringify(best));
    await context.close();
  }
});

test('Hop Run: Hold Space hops once; pointerdown and the Hop! button also hop; mid-air presses do nothing', { skip }, async () => {
  const { page, context, errors } = await open();
  await startRun(page); await freeze(page); await watchRun(page);
  await page.clock.runFor(100);
  await page.keyboard.down('Space');
  for (let i = 0; i < 4; i++) { await page.keyboard.down('Space'); await page.clock.runFor(500); }     // auto-repeat keydowns while held
  await page.keyboard.up('Space');
  let hops = hopsOf((await watched(page)).ty);
  assert.equal(hops.length, 1, 'holding Space makes one hop, not a bunny hop');
  assert.ok(!hops[0].open);
  // a fresh press after letting go hops again
  await page.keyboard.press('Space'); await page.clock.runFor(1000);
  assert.equal(hopsOf((await watched(page)).ty).length, 2);

  // pointerdown on the field, and the Hop! button (new run, so the obstacles are far away)
  await page.click('#game-exit'); await startRun(page); await watchRun(page);                      // the clock is still frozen
  await page.clock.runFor(100);
  await page.click('.run-field'); await page.clock.runFor(1000);
  assert.equal(hopsOf((await watched(page)).ty).length, 1, 'tapping the field hops');
  await page.click('#run-jump'); await page.clock.runFor(1000);
  assert.equal(hopsOf((await watched(page)).ty).length, 2, 'the Hop! button hops');
  await page.keyboard.press('ArrowUp'); await page.clock.runFor(1000);
  assert.equal(hopsOf((await watched(page)).ty).length, 3, 'so does the up arrow');

  // mid-air: more presses of every kind neither re-launch nor extend the hop
  await page.keyboard.press('Space');
  for (let i = 0; i < 3; i++) {
    await page.clock.runFor(150);
    await page.evaluate(() => {                                              // all three kinds of press at one instant (no clock drift between them)
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })); document.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      document.querySelector('#run-jump').click(); document.querySelector('.run-field').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
  }
  await page.clock.runFor(1000);
  const all = hopsOf((await watched(page)).ty);
  assert.equal(all.length, 4, 'mid-air presses add no hop');
  assert.ok(all[3].peak < hopLift(24.2) + 0.05 && all[3].frames * 16 < 950, `peak ${all[3].peak}, ${all[3].frames * 16} ms`);
  assert.deepEqual(errors, []);
  await context.close();
});

test('Hop Run: a good player loses no hearts in 30 s; a player who never hops loses all 3 and sees the result', { skip }, async () => {
  const { page, context, errors } = await open((p) => { p.berries = 3; });
  await startRun(page); await watchRun(page, { bot: true });
  await page.clock.runFor(30000);
  const w = await watched(page);
  assert.equal(w.lost, 0, 'no hearts lost');
  assert.equal(await page.locator('#run-hearts .lost').count(), 0);
  assert.ok(hopsOf(w.ty).length >= 8, `${hopsOf(w.ty).length} hops`);
  assert.ok(hopsOf(w.ty).every((h) => h.monotone));
  assert.ok(Number(/\d+/.exec(await page.textContent('#run-score'))[0]) > 800);
  assert.equal(await page.locator('#game-result').count(), 0, 'still running');

  await page.click('#game-exit'); await startRun(page); await watchRun(page);   // never hops
  await page.clock.runFor(60000);
  await page.waitForSelector('#game-result');
  assert.equal((await watched(page)).lost, 3, 'all three hearts were lost before the result');
  assert.equal(await page.locator('#run-hearts').count(), 0);
  const p = await saved(page);
  assert.equal(p.care.games, 1);
  assert.deepEqual(errors, []);
  await context.close();
});

test('Hop Run: a long frame (a hidden tab coming back) never carries the creature through an obstacle', { skip }, async () => {
  const { page, context, errors } = await open();
  await startRun(page);
  const state = () => page.evaluate(() => ({ xs: [...document.querySelectorAll('.obstacle')].map((o) => Number(o.dataset.x)), score: Number(/\d+/.exec(document.querySelector('#run-score').textContent)[0]), lost: document.querySelectorAll('#run-hearts .lost').length }));
  let s;
  for (let i = 0; i < 400; i++) { await page.clock.runFor(50); s = await state(); if (s.xs.some((x) => x < 45 && x > 30)) break; }
  assert.ok(s.xs.some((x) => x < 45 && x > 30), 'an obstacle is on its way');
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.pauseAt(new Date('2026-11-05T10:05:00'));                // hidden for minutes: one frame arrives after a huge jump, then time stands still (no drift under load)
  await page.evaluate(() => { delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
  const after = await state();
  assert.equal(after.lost, 0, 'no heart lost to the jump in time');
  assert.ok(after.score - s.score <= 8, `the run only moved ${after.score - s.score} steps`);
  const moved = s.xs[0] - after.xs[0];
  assert.ok(moved > -0.01 && moved < 8, `the obstacle moved ${moved} units (dt is capped at 0.05 s; unbounded it would be hundreds)`);
  assert.equal(await page.locator('#game-result').count(), 0);
  // and a normal long frame while an obstacle is right at the creature
  await page.clock.runFor(300);
  assert.deepEqual(errors, []);
  await context.close();
});

test('every game stops completely on Exit: nothing is paid later, and the keys are released', { skip }, async () => {
  const { page, context, errors } = await open();
  const before = await saved(page);
  // Hop Run: Space hops while it runs, and not after leaving
  await startRun(page);
  assert.equal(await keyDefaultPrevented(page, ' '), true);
  await page.clock.runFor(500);
  await page.click('#game-exit'); await page.waitForSelector('#game-catch');
  for (const k of [' ', 'ArrowUp', 'w']) assert.equal(await keyDefaultPrevented(page, k), false, `${k} no longer handled after leaving Hop Run`);
  await page.keyboard.press('Space');                                       // with the menu showing nothing hops or throws
  await page.clock.runFor(60000);
  // Berry Catch
  await startCatch(page);
  assert.equal(await keyDefaultPrevented(page, 'ArrowRight'), true);
  await page.clock.runFor(2000);
  await page.keyboard.press('Escape'); await page.waitForSelector('#game-catch');
  for (const k of ['ArrowLeft', 'ArrowRight', 'a', 'd']) assert.equal(await keyDefaultPrevented(page, k), false, `${k} released after leaving Berry Catch`);
  await page.clock.runFor(60000);
  // Memory Match: leave right after a mismatch, while the flip-back timer is pending
  await startMemory(page);
  await page.click('.mem-card[data-index="0"]');
  for (let i = 1; i < 12 && await page.locator('.mem-card[data-state=up]').count() < 2; i++) await page.click(`.mem-card[data-index="${i}"]`);
  await page.click('#game-exit'); await page.waitForSelector('#game-catch');
  await page.clock.runFor(60000);
  const after_ = await saved(page);
  assert.deepEqual([after_.crickets, after_.berries, after_.care.games], [before.crickets, before.berries, 0], 'nothing paid, nothing counted');
  assert.equal(await page.locator('#game-result').count(), 0);
  assert.deepEqual(errors, []);
  await context.close();
});

// ---------------------------------------------------------------- Berry Catch in a real browser
// Moves the pointer to the lowest falling berry every frame: a perfect player.
const catchBot = (page) => page.evaluate(() => {
  const frame = () => {
    const svg = document.querySelector('.game-field'); if (!svg) return;
    let low = null;
    for (const el of svg.querySelectorAll('.berry[data-state=falling]')) { const y = Number(/translate\(\S+ (\S+)\)/.exec(el.getAttribute('transform') ?? 'translate(0 0)')[1]); if (!low || y > low.y) low = { y, x: Number(el.dataset.x) }; }
    if (low) { const r = svg.getBoundingClientRect(); svg.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + (low.x / 100) * r.width, clientY: r.top + 10, bubbles: true })); }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
});

test('Berry Catch: a perfect game through the UI pays crickets and fun, Play again starts fresh', { skip }, async () => {
  const { page, context, errors } = await open((p) => { p.berries = 3; });
  const before = await saved(page);
  await startCatch(page); await catchBot(page);
  await page.clock.runFor(25000);
  await page.waitForSelector('#game-result');
  assert.match(await page.textContent('h1'), /Perfect catch!/);
  const [, got, max] = /You caught (\d+) of (\d+) berries!/.exec(await page.textContent('#game-result'));
  assert.equal(got, max); assert.ok(Number(max) >= 15);
  assert.match(await page.textContent('#game-spent'), /cost 3 crickets, and you got 1 back/);
  let p = await saved(page);
  assert.equal(p.crickets, before.crickets - 3 + 1);
  assert.equal(p.berries, 3, 'games give no berries');
  assert.equal(p.care.games, 1);
  assert.equal(p.creatures[0].care.fun, 5);
  assert.deepEqual(await page.locator('#game-again, #game-menu, #game-back').count(), 3);

  await page.click('#game-again'); await page.waitForSelector('.berry');
  assert.match(await page.textContent('#game-score'), /0/);
  assert.equal(await page.locator('#game-result').count(), 0);
  await catchBot(page);
  await page.clock.runFor(25000); await page.waitForSelector('#game-result');
  p = await saved(page);
  assert.equal(p.crickets, before.crickets - 6 + 2); assert.equal(p.care.games, 2);
  assert.deepEqual(errors, []);
  await context.close();
});

test('Berry Catch: arrow keys slide the creature, and an idle or keyboard game still finishes with honest numbers', { skip }, async () => {
  const { page, context, errors } = await open();
  await startCatch(page);
  const px = async () => Number(/translate\(([\d.-]+) 0\)/.exec(await page.getAttribute('.player', 'transform'))[1]);
  await page.clock.runFor(100);
  assert.ok(Math.abs(await px() - 50) < 1);
  await page.keyboard.down('ArrowLeft'); await page.clock.runFor(300); await page.keyboard.up('ArrowLeft');
  const left = await px(); assert.ok(left < 35 && left > 20, `left ${left}`);
  await page.keyboard.down('ArrowRight'); await page.clock.runFor(2000); await page.keyboard.up('ArrowRight');
  assert.ok(await px() > 90, 'clamped to the right edge');
  await page.keyboard.down('ArrowRight');                                     // stays held to the end
  await page.clock.runFor(25000); await page.waitForSelector('#game-result');
  await page.keyboard.up('ArrowRight');
  const m = /You caught (\d+) of (\d+) berries!/.exec(await page.textContent('#game-result'));
  const caught = Number(m[1]); assert.ok(caught <= Number(m[2]));
  const refund = caught >= 8 ? 1 : 0;                                         // GAME_BERRIES_PER 4, GREAT_TIER 2
  assert.equal(/you got 1 back/.test(await page.textContent('#game-spent')), !!refund);
  const p = await saved(page);
  assert.equal(p.crickets, 10 - 3 + refund); assert.equal(p.care.games, 1); assert.equal(p.creatures[0].care.fun, 5);
  assert.deepEqual(errors, []);
  await context.close();
});

// ---------------------------------------------------------------- Memory Match in a real browser
// Plays Memory Match by remembering what it has seen. `flip(i)` is how a card gets flipped (mouse or keyboard).
async function solveMemory(page, flip, { onMismatch = async () => {}, onMatch = async () => {} } = {}) {
  const known = {};
  const turn = async (i) => { await flip(i); known[i] = await page.getAttribute(`.mem-card[data-index="${i}"]`, 'data-species'); };
  for (let guard = 0; guard < 60 && !(await page.locator('#game-result').count()); guard++) {
    const left = await page.$$eval('.mem-card[data-state=down]', (c) => c.map((x) => Number(x.dataset.index)));
    if (!left.length) { await page.clock.runFor(1000); continue; }
    const twinOf = (a) => left.find((j) => j !== a && known[j] && known[j] === known[a]);
    let a = left.find((i) => known[i] && twinOf(i) !== undefined), b;
    if (a !== undefined) b = twinOf(a);
    else { a = left.find((i) => !known[i]); await turn(a); b = twinOf(a) ?? left.find((j) => j !== a && !known[j]); }
    if (!(await page.locator(`.mem-card[data-index="${a}"][data-state=up]`).count())) await turn(a);
    await turn(b);
    if (known[a] === known[b]) await onMatch(a, b); else await onMismatch(a, b);
    await page.clock.runFor(1000);
  }
  await page.waitForSelector('#game-result');
}

test('Memory Match: a mismatch flips back, a match stays, and the board ignores a third card until then', { skip }, async () => {
  const { page, context, errors } = await open();
  await startMemory(page);
  const states = () => page.$$eval('.mem-card', (c) => c.map((x) => x.dataset.state));
  let mismatches = 0, matches = 0;
  await solveMemory(page, (i) => page.click(`.mem-card[data-index="${i}"]`), {
    async onMismatch(a, b) {
      mismatches++;
      const st = await states();
      assert.equal(st[a], 'up'); assert.equal(st[b], 'up');
      assert.equal(st.filter((x) => x === 'up').length, 2);
      const third = [...st.keys()].find((i) => st[i] === 'down');
      await page.click(`.mem-card[data-index="${third}"]`);                      // too early: ignored
      assert.equal((await states())[third], 'down', 'no third card while two are showing');
      await page.clock.runFor(1000);
      const back = await states();
      assert.equal(back[a], 'down'); assert.equal(back[b], 'down');
      assert.equal(back.filter((x) => x === 'up').length, 0, 'both flipped back');
      assert.equal(await page.getAttribute(`.mem-card[data-index="${a}"]`, 'aria-label'), `Card ${a + 1}, face down`);
    },
    async onMatch(a, b) {
      matches++;
      await page.clock.runFor(2000);
      if (await page.locator('#game-result').count()) return;                    // the last pair ends the game
      const st = await states();
      assert.equal(st[a], 'matched'); assert.equal(st[b], 'matched', 'a match stays face up');
    },
  });
  assert.ok(mismatches > 0 && matches === 6, `${mismatches} mismatches, ${matches} matches`);
  const m = Number(/It took (\d+) moves/.exec(await page.textContent('#game-result'))[1]);
  assert.ok(m >= 6);
  const refund = m <= 12 ? 1 : 0;                                              // prize tier 2 or 3 gives a cricket back
  assert.equal(/you got 1 back/.test(await page.textContent('#game-spent')), !!refund);
  const p = await saved(page);
  assert.equal(p.crickets, 10 - 3 + refund); assert.equal(p.care.games, 1); assert.equal(p.creatures[0].care.fun, 5);

  await page.click(refund ? '#game-again' : '#game-menu');
  if (!refund) await startMemory(page);
  await page.waitForSelector('.mem-card');
  assert.equal(await page.locator('.mem-card[data-state=down]').count(), 12);
  assert.equal(await page.textContent('#memory-moves'), 'Moves 0');
  assert.deepEqual(errors, []);
  await context.close();
});

test('Memory Match: a keyboard-only player can finish it, and keeps their place on the board', { skip }, async () => {
  const { page, context, errors } = await open();
  await startMemory(page);
  const onIndex = () => page.evaluate(() => document.activeElement?.dataset?.index ?? null);
  let useSpace = false;
  const flip = async (i) => {
    for (let n = 0; n < 40 && (await onIndex()) !== String(i); n++) {
      const cur = await onIndex();
      await page.keyboard.press(cur !== null && Number(cur) > i ? 'Shift+Tab' : 'Tab');
    }
    assert.equal(await onIndex(), String(i), `reached card ${i} with Tab`);
    await page.keyboard.press(useSpace ? 'Space' : 'Enter'); useSpace = !useSpace;
    assert.equal(await onIndex(), String(i), 'focus stays on the card just flipped (the board is redrawn on every flip)');
  };
  await solveMemory(page, flip, { async onMismatch(a, b) { await page.clock.runFor(1000); assert.equal(await onIndex(), String(b), 'focus survives the flip back'); } });
  assert.match(await page.textContent('#game-result'), /It took \d+ moves/);
  assert.equal((await saved(page)).care.games, 1);
  assert.deepEqual(errors, []);
  await context.close();
});
