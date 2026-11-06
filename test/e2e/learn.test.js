import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, seededState } from './helpers.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

async function open() {
  const context = await env.browser.newContext({ reducedMotion: 'reduce', viewport: { width: 420, height: 900 } });
  const errors = [];
  await prepare(context, { state: seededState(), errors });
  const page = await context.newPage();
  await page.goto(env.server.url);
  await page.click('.card'); await page.waitForSelector('#practice');
  return { page, context, errors };
}

test('Spell Master: tile, tagline, lessons, tap-to-hear and a quiz that explains each answer', { skip }, async () => {
  const { page, context, errors } = await open();
  assert.match(await page.textContent('#learn-link'), /Spell Master/);
  await page.click('#learn-link');
  await page.waitForSelector('.lessons');
  assert.match(await page.textContent('.master-says'), /A magician never reveals his secrets! But this Spell Master does!/);
  assert.ok((await page.$$('.lesson-card')).length >= 10);
  assert.ok(await page.$('.master svg.spell-master'), 'the owl is drawn');

  await page.click('#lesson-silent-e');
  await page.waitForSelector('.group');
  assert.equal(await page.textContent('h1'), 'The silent e');
  assert.equal(await page.$$eval('.group', (g) => g.length), 2);
  await page.click('.group .example');
  assert.ok((await page.evaluate(() => window.__spoken)).some((u) => u.text === 'hoping'));
  assert.match(await page.textContent('.group .example'), /hope.*\+.*ing.*=.*hoping.*not hopeing/s);

  await page.click('#start-quiz'); await page.waitForSelector('.choice');
  const first = await page.$$eval('.choice', (b) => b.map((x) => x.textContent));
  assert.deepEqual([...first].sort(), ['hopeing', 'hoping']);
  await page.click('.choice[data-word="hopeing"]'); // a wrong pick is explained, never punished
  assert.match(await page.textContent('.quiz-out'), /Not quite\. hoping\./);
  assert.equal(await page.$$eval('.choice', (b) => b.every((x) => x.disabled)), true);
  for (let i = 0; i < 4; i++) {
    if (i) await page.click('.choice[data-word]:not([disabled])').catch(() => {});
    await page.click('#quiz-next').catch(() => {});
  }
  await page.waitForSelector('#quiz-score');
  assert.match(await page.textContent('#quiz-score'), /of 4 secrets/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('Spell Master: lessons chain with Next, and an unknown lesson falls back to the list', { skip }, async () => {
  const { page, context } = await open();
  await page.goto(env.server.url + '#/learn/silent-e'); await page.waitForSelector('#next-lesson');
  await page.click('#next-lesson'); await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Double the last letter');
  await page.goto(env.server.url + '#/learn/not-a-lesson'); await page.waitForSelector('.lessons');
  await page.goto(env.server.url + '#/learn/soft-c'); await page.waitForSelector('.group');
  assert.equal(await page.$('#next-lesson'), null, 'the last lesson has no Next');
  await context.close();
});
