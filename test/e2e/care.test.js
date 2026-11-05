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
  await page.click('#care-play'); await page.waitForSelector('#game-start');
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
