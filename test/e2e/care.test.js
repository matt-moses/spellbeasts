import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, seededState } from './helpers.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

async function open(patch = () => {}, { clock = false } = {}) {
  const st = seededState(); patch(st.profiles.p1, st);
  const context = await env.browser.newContext({ reducedMotion: 'reduce', viewport: { width: 900, height: 1000 } });
  const errors = [];
  await prepare(context, { state: st, errors });
  await context.addInitScript(() => { let a = 777; Math.random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  if (clock) await context.clock.install({ time: new Date('2026-11-05T10:00:00') });
  else await context.clock.setFixedTime(new Date('2026-11-05T10:00:00'));
  const page = await context.newPage();
  await page.goto(env.server.url);
  await page.click('.card');
  await page.waitForSelector('#practice');
  return { page, context, errors };
}
const saved = async (page) => Object.values((await page.evaluate(() => JSON.parse(localStorage.getItem('spellbeasts.v1')))).profiles)[0];
const meters = (page) => page.$$eval('.meter', (els) => Object.fromEntries(els.map((e) => [e.closest('.meter-row').dataset.meter, Number(e.getAttribute('aria-valuenow'))])));
async function openCare(page) { await page.click('#sanctuary'); await page.waitForSelector('.creature-card'); await page.click('.creature-card:first-child .care-link'); await page.waitForSelector('#care-feed'); }

test('care screen: starts at 3 of 5, berries feed (and stop at full), petting and bath fill their meters', { skip }, async () => {
  const { page, context, errors } = await open();
  assert.match(await page.textContent('#berries-pill'), /3 berries/);
  await openCare(page);
  assert.deepEqual(await meters(page), { fed: 3, clean: 3, loved: 3, fun: 3 });
  assert.equal(await page.getAttribute('.pill.mood', 'data-mood'), 'happy');

  await page.click('#care-feed');
  assert.match(await page.textContent('.care-msg'), /Yum/);
  assert.deepEqual(await meters(page), { fed: 5, clean: 3, loved: 3, fun: 3 });
  assert.match(await page.textContent('#berry-count'), /2 berries/);
  await page.click('#care-feed');                                              // already full: nothing is spent
  assert.match(await page.textContent('.care-msg'), /Too full/);
  assert.match(await page.textContent('#berry-count'), /2 berries/);

  for (let i = 0; i < 3; i++) await page.click('#care-love');
  assert.equal((await meters(page)).loved, 4);
  assert.match(await page.textContent('.care-msg'), /loved/);

  await page.click('#care-bath');
  assert.equal(await page.locator('.dirt').count(), 6);
  assert.equal(await page.locator('#care-feed').count(), 0);                   // the bath replaces the other buttons
  for (let i = 0; i < 5; i++) await page.click('#scrub');
  assert.equal(await page.locator('.dirt').count(), 1);
  await page.click('#scrub');
  await page.waitForSelector('#care-bath');
  assert.match(await page.textContent('.care-msg'), /Squeaky clean/);
  assert.equal((await meters(page)).clean, 5);

  const p = await saved(page);
  assert.deepEqual([p.berries, p.care.baths, p.care.pets, p.care.berriesFed], [2, 1, 3, 1]);
  assert.deepEqual(errors, []);
  await context.close();
});

test('a creature happy on every meter gives a one-a-day cricket gift; meters drift down overnight', { skip }, async () => {
  const { page, context } = await open((p) => {
    p.creatures[0].care = { fed: 4, clean: 5, loved: 4, fun: 3, petTicks: 0, day: '2026-11-05', sparkleDay: null };
    p.crickets = 10;
  }, { clock: true });
  await openCare(page);
  assert.equal(await page.locator('.care-msg:not([hidden])').count(), 0);        // fun is only 3: no gift yet
  await page.click('#care-play'); await page.click('#game-catch'); await page.waitForSelector('#game-start');
  await page.click('#game-start');
  await page.clock.runFor(30000);                                               // the player never moves: few berries caught
  await page.waitForSelector('#game-result');
  assert.match(await page.textContent('#game-result'), /Sparkling!.*\+3 crickets/s);
  assert.equal((await saved(page)).crickets, 13);
  await page.click('#game-back'); await page.waitForSelector('#care-feed');
  assert.deepEqual(await meters(page), { fed: 4, clean: 5, loved: 4, fun: 5 });
  assert.equal(await page.getAttribute('.pill.mood', 'data-mood'), 'sparkling');
  await page.click('#care-love');                                               // a second activity the same day: no second gift
  assert.equal((await saved(page)).crickets, 13);

  await page.clock.setSystemTime(new Date('2026-11-06T10:00:00'));
  await page.goto(`${env.server.url}#/home`);
  await page.click('#sanctuary'); await page.click('.creature-card:first-child .care-link'); await page.waitForSelector('#care-feed');
  const m = await meters(page);
  assert.deepEqual(m, { fed: 3, clean: 4, loved: 3, fun: 4 });                  // each drifted down by one
  assert.equal(await page.getAttribute('.pill.mood', 'data-mood'), 'happy');
  await context.close();
});

test('care trophies are announced: the 10th bath earns Squeaky Clean', { skip }, async () => {
  const { page, context } = await open((p) => { p.care.baths = 9; });
  await openCare(page);
  await page.click('#care-bath');
  for (let i = 0; i < 6; i++) await page.click('#scrub');
  await page.waitForSelector('#care-bath');
  assert.match(await page.textContent('.care-msg'), /New trophy: Squeaky Clean/);
  assert.ok((await saved(page)).trophies['baths-10']);
  await context.close();
});

test('Berry Catch: a player who follows the berries catches nearly all of them, and wins berries to keep', { skip, timeout: 90000 }, async () => {
  const { page, context, errors } = await open((p) => { p.berries = 0; }, { clock: true });
  await openCare(page);
  await page.click('#care-play');
  await page.click('#game-catch');
  await page.click('#game-start');
  await page.waitForSelector('.game-field');
  const box = await page.locator('.game-field').boundingBox();
  for (let i = 0; i < 400; i++) {
    await page.clock.runFor(80);
    if (await page.locator('#game-result').count()) break;
    const x = await page.evaluate(() => {
      const f = [...document.querySelectorAll('.berry[data-state=falling]')];
      return f.length ? f.sort((a, b) => Number(b.getAttribute('transform').split(' ')[1].replace(')', '')) - Number(a.getAttribute('transform').split(' ')[1].replace(')', '')))[0].dataset.x : null;
    });
    if (x != null) await page.mouse.move(box.x + (Number(x) / 100) * box.width, box.y + box.height * 0.85);
  }
  await page.waitForSelector('#game-result');
  const text = await page.textContent('#game-result');
  const caught = Number(text.match(/caught (\d+) of/)[1]);
  assert.ok(caught >= 13, `caught only ${caught}`);
  const prize = Math.floor(caught / 4);
  assert.match(text, new RegExp(`won ${prize} berr`));
  const p = await saved(page);
  assert.deepEqual([p.berries, p.care.games, p.creatures[0].care.fun], [prize, 1, 5]);
  await page.click('#game-again');                                              // and it can be played again
  await page.waitForSelector('.game-field');
  assert.deepEqual(errors, []);
  await context.close();
});

test('practice sessions and treasure stars give berries; the summary says so', { skip }, async () => {
  const { page, context } = await open((p) => { p.map.trailStep = 10; p.berries = 0; });
  await page.click('.landmark.ready');
  await page.waitForSelector('.landmark.claimed');
  assert.match(await page.textContent('.world-map .note'), /and a berry/);
  assert.equal((await saved(page)).berries, 1);
  await page.click('#practice'); await page.waitForSelector('#answer');
  for (let i = 0; i < 30 && !page.url().endsWith('#/summary'); i++) {
    const w = await page.evaluate(() => window.__spoken.at(-1).text), n = await page.evaluate(() => window.__spoken.length);
    await page.fill('#answer', w); await page.press('#answer', 'Enter');
    await page.waitForFunction((k) => window.__spoken.length > k || location.hash === '#/summary', n);
  }
  await page.waitForSelector('.summary');
  assert.match(await page.textContent('.results'), /Berries found: 2/);
  assert.equal((await saved(page)).berries, 3);
  await context.close();
});

// ---------------------------------------------------------------- drag and drop, rubbing
const centre = async (page, sel) => { const b = await page.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
async function openMotion(patch) {
  const st = seededState(); patch(st.profiles.p1, st);
  const context = await env.browser.newContext({ reducedMotion: 'no-preference', viewport: { width: 900, height: 1000 } });
  const errors = [];
  await prepare(context, { state: st, errors });
  await context.clock.setFixedTime(new Date('2026-11-05T10:00:00'));
  const page = await context.newPage();
  await page.goto(env.server.url);
  await page.click('.card'); await page.waitForSelector('#practice');
  await openCare(page);
  return { page, context, errors };
}

test('berries sit in a tray: drag one onto the creature to feed it; a drop anywhere else just returns it', { skip }, async () => {
  const { page, context, errors } = await openMotion(() => {});
  assert.equal(await page.locator('.berry-item').count(), 3);
  assert.match(await page.textContent('.tray-label'), /Drag a berry onto your creature/);
  const berry = await centre(page, '.berry-item'), target = await centre(page, '.care-creature');

  // a wrong drop: nothing is spent, the berry comes back, and the hint says where to drop it
  await page.mouse.move(berry.x, berry.y); await page.mouse.down();
  await page.mouse.move(40, 900, { steps: 6 });
  assert.equal(await page.locator('.berry-ghost').count(), 1);
  assert.equal(await page.locator('.care-stage.drop-hot').count(), 0);
  await page.mouse.up();
  await page.waitForFunction(() => !document.querySelector('.berry-ghost'));
  assert.match(await page.textContent('.care-msg'), /Drop the berry on your creature/);
  assert.equal(await page.locator('.berry-item').count(), 3);
  assert.equal((await saved(page)).berries, 3);

  // the real drop: the creature lights up while the berry is over it
  const again = await centre(page, '.berry-item');
  await page.mouse.move(again.x, again.y); await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });
  assert.equal(await page.locator('.care-stage.drop-hot').count(), 1, 'drop target is highlighted');
  await page.mouse.up();
  await page.waitForFunction(() => /Yum/.test(document.querySelector('.care-msg').textContent));
  assert.equal(await page.locator('.berry-item').count(), 2);
  assert.match(await page.textContent('#berry-count'), /2 berries/);
  assert.deepEqual(await meters(page), { fed: 5, clean: 3, loved: 3, fun: 3 });
  assert.ok(await page.locator('.meter-row[data-meter=fed] .pip.pop').count() >= 1, 'newly filled pips pop');
  assert.equal(await page.locator('.berry-ghost').count(), 0);
  const p = await saved(page);
  assert.deepEqual([p.berries, p.care.berriesFed], [2, 1]);
  assert.deepEqual(errors, []);
  await context.close();
});

test('berry tray: Enter feeds from the keyboard, a full creature refuses, empty and overflowing trays read well', { skip }, async () => {
  const a = await openMotion((p) => { p.creatures[0].care = { fed: 1, clean: 3, loved: 3, fun: 3, petTicks: 0, day: '2026-11-05', sparkleDay: null }; });
  assert.match(await a.page.getAttribute('.berry-item', 'aria-label'), /Drag it onto your creature, or press Enter/);
  await a.page.focus('.berry-item'); await a.page.keyboard.press('Enter');
  await a.page.waitForFunction(() => /Yum/.test(document.querySelector('.care-msg').textContent));
  assert.equal((await meters(a.page)).fed, 3);
  assert.equal((await saved(a.page)).berries, 2);
  await a.context.close();

  const full = await openMotion(() => {});                                       // fed is 3: one berry fits, then it is full
  await full.page.focus('.berry-item'); await full.page.keyboard.press('Enter');
  await full.page.waitForFunction(() => /Yum/.test(document.querySelector('.care-msg').textContent));
  await full.page.focus('.berry-item'); await full.page.keyboard.press('Space');
  await full.page.waitForFunction(() => /Too full/.test(document.querySelector('.care-msg').textContent));
  assert.equal((await saved(full.page)).berries, 2);
  await full.context.close();

  const none = await openMotion((p) => { p.berries = 0; });
  assert.equal(await none.page.locator('.berry-item').count(), 0);
  assert.match(await none.page.textContent('.tray-label'), /No berries left/);
  await none.context.close();

  const many = await openMotion((p) => { p.berries = 9; });
  assert.equal(await many.page.locator('.berry-item').count(), 6);
  assert.match(await many.page.textContent('.berry-tray .pill'), /\+3/);
  await many.context.close();
});

test('rubbing the creature pets it: hearts follow the pointer, every 90px is a pet, and the rub is not also a tap', { skip }, async () => {
  const { page, context, errors } = await openMotion(() => {});
  const c = await centre(page, '.care-creature');
  await page.mouse.move(c.x - 45, c.y); await page.mouse.down();
  const xs = [-15, 15, 45, 15, -15, -45, -15, 15, 45, 15, -15, -45];          // twelve 30px strokes = 360px
  let sawHearts = 0, sawBurst = 0;
  for (const dx of xs) {
    await page.mouse.move(c.x + dx, c.y);
    sawHearts = Math.max(sawHearts, await page.locator('.float-heart').count());
    sawBurst = Math.max(sawBurst, await page.locator('.love-burst').count());
  }
  await page.mouse.up();
  assert.ok(sawHearts > 0, 'hearts appeared while rubbing');
  assert.ok(sawBurst >= 1, 'a big heart pulses when the loved meter fills a notch');
  const p = await saved(page);
  assert.equal(p.care.pets, 4, 'four strokes of 90px, and the release did not add a tap');
  assert.equal((await meters(page)).loved, 4);
  assert.deepEqual(errors, []);
  await context.close();
});

test('a bath can be scrubbed by rubbing over the creature, with bubbles', { skip }, async () => {
  const { page, context } = await openMotion(() => {});
  await page.click('#care-bath');
  assert.equal(await page.locator('.dirt').count(), 6);
  const c = await centre(page, '.care-creature');
  await page.mouse.move(c.x - 45, c.y); await page.mouse.down();
  let sawBubbles = 0;
  for (let i = 0; i < 18; i++) {                                              // 18 x 30px = 540px = six scrubs
    await page.mouse.move(c.x + [-15, 15, 45, 15, -15, -45][i % 6], c.y);
    sawBubbles = Math.max(sawBubbles, await page.locator('.float-heart.bubble').count());
  }
  await page.mouse.up();
  await page.waitForSelector('#care-bath');
  assert.match(await page.textContent('.care-msg'), /Squeaky clean/);
  assert.ok(sawBubbles > 0);
  assert.equal((await meters(page)).clean, 5);
  assert.equal((await saved(page)).care.pets, 0, 'scrubbing is not petting');
  await context.close();
});
