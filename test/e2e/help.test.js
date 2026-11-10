import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, seededState } from './helpers.js';
import { FAQ, ARENA_FAQ } from '../../js/ui/help-content.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

const GROUPS = [...FAQ, ARENA_FAQ];                                    // the Arena is on, so its questions show too
const TOTAL = GROUPS.flatMap((g) => g.items).length;
async function open(withProfile = true) {
  const context = await env.browser.newContext({ reducedMotion: 'reduce', viewport: { width: 900, height: 1000 } });
  const errors = [];
  await prepare(context, { state: withProfile ? seededState() : null, errors });
  const page = await context.newPage();
  await page.goto(env.server.url);
  return { page, context, errors };
}

test('the picker has a help button; the dialog lists every question, opens answers, and Esc closes it', { skip }, async () => {
  const { page, context, errors } = await open(false);
  assert.equal(await page.getAttribute('#help-btn', 'aria-label'), 'Help');
  await page.click('#help-btn');
  await page.waitForSelector('#help-dialog');
  assert.equal(await page.getAttribute('#help-dialog', 'role'), 'dialog');
  assert.equal(await page.getAttribute('#help-dialog', 'aria-modal'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'help-close');
  assert.equal(await page.locator('details.faq').count(), TOTAL);
  assert.equal(await page.locator('.faq-group h3').count(), GROUPS.length);
  assert.equal(await page.locator('details.faq[open]').count(), 0);
  await page.click('details.faq:has-text("Do capital letters matter") summary');
  assert.match(await page.textContent('details.faq[open] p'), /Monday/);
  assert.doesNotMatch(await page.innerText('#help-dialog'), /\b(null|undefined|NaN)\b/);
  await page.keyboard.press('Escape');
  await page.waitForSelector('#help-dialog', { state: 'detached' });
  assert.equal(await page.evaluate(() => document.activeElement.id), 'help-btn');   // focus goes back where it was
  assert.deepEqual(errors, []);
  await context.close();
});

test('home: opens from the ? button and closes from Close or a click outside', { skip }, async () => {
  const { page, context } = await open();
  await page.click('.card'); await page.waitForSelector('#practice');
  await page.click('#help-btn'); await page.waitForSelector('#help-dialog');
  await page.click('#help-close');
  await page.waitForSelector('#help-dialog', { state: 'detached' });
  await page.click('#help-btn'); await page.waitForSelector('#help-dialog');
  await page.mouse.click(5, 5);                                                   // the dim area outside the card
  await page.waitForSelector('#help-dialog', { state: 'detached' });
  await context.close();
});

test('keyboard focus stays inside the dialog while it is open', { skip }, async () => {
  const { page, context } = await open();
  await page.click('.card'); await page.waitForSelector('#practice');
  await page.click('#help-btn'); await page.waitForSelector('#help-dialog');
  for (let i = 0; i < TOTAL + 6; i++) {
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('#help-dialog')), true, `Tab ${i + 1} left the dialog`);
  }
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => !!document.activeElement.closest('#help-dialog')), true);
  await context.close();
});

test('practice: help is there, and opening and closing it keeps the typed answer and the session', { skip }, async () => {
  const { page, context, errors } = await open();
  await page.click('.card'); await page.click('#practice'); await page.waitForSelector('#answer');
  const spoken = await page.evaluate(() => window.__spoken.length);
  await page.fill('#answer', 'abc');
  await page.click('#help-btn'); await page.waitForSelector('#help-dialog');
  await page.click('#help-close');
  await page.waitForSelector('#help-dialog', { state: 'detached' });
  assert.equal(await page.inputValue('#answer'), 'abc');
  assert.equal(await page.evaluate(() => window.__spoken.length), spoken, 'the word was not skipped or re-spoken');
  assert.ok(page.url().endsWith('#/practice'));
  assert.deepEqual(errors, []);
  await context.close();
});

test('help button appears on the other screens too, and navigating away closes an open dialog', { skip }, async () => {
  const { page, context } = await open();
  await page.click('.card'); await page.waitForSelector('#practice');
  for (const route of ['sanctuary', 'book', 'trophies', 'nest/r1']) {
    await page.goto(`${env.server.url}#/${route}`); await page.waitForSelector('.screen');
    assert.equal(await page.locator('#help-btn').count(), 1, `help on ${route}`);
  }
  await page.click('#help-btn'); await page.waitForSelector('#help-dialog');
  await page.goto(`${env.server.url}#/home`);
  await page.waitForSelector('#help-dialog', { state: 'detached' });
  await context.close();
});
