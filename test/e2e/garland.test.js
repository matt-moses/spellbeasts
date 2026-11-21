// The string of leaves / lights waves when the pointer touches it, never blocks clicks, and stays still for reduced motion.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, seededState } from './helpers.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

async function open(season, reducedMotion = 'no-preference') {
  const context = await env.browser.newContext({ viewport: { width: 1000, height: 500 }, reducedMotion });
  const errors = [];
  await context.addInitScript((s) => { window.SPELLBEASTS_SEASON = s; }, season);
  await prepare(context, { state: seededState(), errors });
  const page = await context.newPage();
  await page.goto(env.server.url);
  await page.waitForSelector('.garland');
  return { page, context, errors };
}
const waving = (page) => page.evaluate(() => document.querySelector('.garland').classList.contains('wave'));

for (const [season, items] of [['thanksgiving', 25], ['christmas', 29]]) {
  test(`${season}: touching the string makes it wave, then it settles; away from it nothing happens`, { skip }, async () => {
    const { page, context, errors } = await open(season);
    assert.equal(await page.locator('.garland .g-item').count(), items);
    await page.mouse.move(500, 300);
    assert.equal(await waving(page), false);
    await page.mouse.move(300, 60, { steps: 4 });
    await page.waitForFunction(() => document.querySelector('.garland').classList.contains('wave'));
    await page.waitForFunction(() => !document.querySelector('.garland').classList.contains('wave'), null, { timeout: 6000 });
    assert.deepEqual(errors, []);
    await context.close();
  });
}
test('the garland never blocks a click on the page', { skip }, async () => {
  const { page, context } = await open('christmas');
  const hit = await page.evaluate(() => document.elementFromPoint(300, 50)?.closest('.garland'));
  assert.equal(hit, null);
  await context.close();
});
test('reduced motion: it does not wave', { skip }, async () => {
  const { page, context } = await open('thanksgiving', 'reduce');
  await page.mouse.move(300, 60, { steps: 4 }); await page.waitForTimeout(300);
  assert.equal(await waving(page), false);
  await context.close();
});
test('no season, no garland', { skip }, async () => {
  const context = await env.browser.newContext();
  await context.addInitScript(() => { window.SPELLBEASTS_SEASON = 'none'; });
  await prepare(context, { state: seededState() });
  const page = await context.newPage();
  await page.goto(env.server.url); await page.waitForSelector('.card');
  assert.equal(await page.locator('.garland').count(), 0);
  await context.close();
});
