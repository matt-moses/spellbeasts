import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, seededState, playSession } from './helpers.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

async function open(patch = () => {}, { reducedMotion = 'reduce' } = {}) {
  const st = seededState(); patch(st.profiles.p1, st);
  const context = await env.browser.newContext({ reducedMotion, viewport: { width: 1000, height: 1100 } });
  const errors = [];
  await prepare(context, { state: st, errors });
  const page = await context.newPage();
  await page.goto(env.server.url);
  await page.click('.card');
  await page.waitForSelector('.world-map .token[data-settled=true]');
  return { page, context, errors };
}
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('spellbeasts.v1')).profiles.p1);

test('the map is the home screen: 6 regions, later ones fogged with what they need', { skip }, async () => {
  const { page, context, errors } = await open();
  assert.equal(await page.locator('svg.map .layer-regions > g').count(), 6);
  assert.equal(await page.locator('.fog[data-locked=true]').count(), 5);
  assert.equal(await page.locator('.nest-link').count(), 1);
  assert.match(await page.getAttribute('.fog[data-region=r2]', 'aria-label'), /Reach level 2\b/);
  assert.match(await page.getAttribute('.fog[data-region=r3]', 'aria-label'), /Reach level 4 and 5 words mastered/);
  assert.match(await page.getAttribute('.fog[data-region=r6]', 'aria-label'), /Reach level 10 and 40 words mastered/);
  assert.match(await page.getAttribute('.fog[data-region=r4]', 'aria-label'), /level 6 and 15 words mastered/);
  const sign = await page.$$eval('.fog[data-region=r4] tspan', (t) => t.map((x) => x.textContent).join(' '));
  assert.match(sign, /Reach level 6 and 15 words mastered/);   // the visible sign says it too
  assert.deepEqual(errors, []);
  await context.close();
});

test('regions open when level (and mastery) are met; the pin is keyboard-operable', { skip }, async () => {
  const { page, context } = await open((p) => { p.level = 2; p.map.unlockedRegions = ['r1', 'r2']; });
  assert.equal(await page.locator('.fog[data-locked=true]').count(), 4);
  assert.equal(await page.locator('.nest-link').count(), 2);
  await page.focus('.nest-link[data-region=r2]');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.nest[data-region=r2]');
  await context.close();
  const lvl4 = await open((p) => { p.level = 4; p.map.unlockedRegions = ['r1', 'r2']; });   // level 4 but no mastery: still closed
  assert.equal(await lvl4.page.locator('.fog[data-region=r3]').count(), 1);
  await lvl4.context.close();
});

test('first-try correct answers move the token; it waits at the gate of a locked region', { skip }, async () => {
  const a = await open((p) => { p.map.trailStep = 5; });
  assert.equal(await a.page.getAttribute('.token', 'data-step'), '5');
  await playSession(a.page);
  assert.match(await a.page.textContent('.results'), /Steps along the trail: 3/);
  await a.page.click('#done');
  await a.page.waitForSelector('.token[data-settled=true]');
  assert.equal(await a.page.getAttribute('.token', 'data-step'), '8');
  assert.equal((await saved(a.page)).map.trailStep, 8);
  await a.context.close();

  const b = await open((p) => { p.map.trailStep = 29; });                     // the gate is at step 30 (region 2 is locked)
  await playSession(b.page);
  assert.match(await b.page.textContent('.results'), /Steps along the trail: 1(?!\d)/);
  await b.page.click('#done');
  await b.page.waitForSelector('.token[data-settled=true]');
  assert.equal(await b.page.getAttribute('.token', 'data-step'), '30');
  assert.equal((await saved(b.page)).map.trailStep, 30);
  await b.context.close();
});

test('a landmark chest pays 5-15 crickets once, even after a reload', { skip }, async () => {
  const { page, context, errors } = await open((p) => { p.map.trailStep = 10; });
  assert.equal(await page.locator('.landmark.ready').count(), 1);
  assert.equal(await page.locator('.landmark.far').count(), 17);              // the rest are still ahead
  const before = (await saved(page)).crickets;
  await page.click('.landmark.ready');
  await page.waitForSelector('.landmark.claimed');
  const gained = (await saved(page)).crickets - before;
  assert.ok(gained >= 5 && gained <= 15, `gained ${gained}`);
  assert.match(await page.textContent('.world-map .note'), /Treasure!/);
  assert.equal(await page.locator('.landmark.ready').count(), 0);
  assert.match(await page.textContent('.stats'), new RegExp(`${gained} crickets`));
  await page.reload();
  await page.click('.card');
  await page.waitForSelector('.world-map .token[data-settled=true]');
  assert.equal(await page.locator('.landmark.ready').count(), 0);
  assert.equal(await page.locator('.landmark.claimed').count(), 1);
  assert.equal((await saved(page)).crickets - before, gained);
  assert.deepEqual(errors, []);
  await context.close();
});

test('the token animates to its new spot when motion is allowed', { skip }, async () => {
  const { page, context } = await open((p) => { p.map.trailStep = 5; }, { reducedMotion: 'no-preference' });
  await playSession(page);
  await page.click('#done');
  await page.waitForSelector('.world-map');
  await page.waitForFunction(() => document.querySelector('.token').dataset.settled === 'true', null, { timeout: 4000 });
  assert.equal(await page.getAttribute('.token', 'data-step'), '8');
  assert.ok(await page.getAttribute('.token', 'transform'));
  await context.close();
});

test('reaching the level for a new region says so on the summary', { skip }, async () => {
  const { page, context } = await open((p) => { p.xp = 95; });
  await playSession(page);
  assert.match(await page.textContent('.region-unlocked'), /Misty Marsh/);
  await page.click('#levelup-ok');
  await page.click('#done');
  await page.waitForSelector('.world-map');
  assert.equal(await page.locator('.nest-link').count(), 2);
  assert.equal(await page.locator('.fog[data-locked=true]').count(), 4);
  await context.close();
});
