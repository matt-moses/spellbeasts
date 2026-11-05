import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, seededState } from './helpers.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

async function open(mastered) {
  const st = seededState();
  const days = ['2026-11-01', '2026-11-02', '2026-11-03'];
  st.profiles.p1.wordStats.sample = Object.fromEntries(mastered.map((w) => [w, { box: 4, nextDue: null, correctDays: days, attempts: 3, firstTries: 3, firstTryCorrect: 3, lastMissed: null, lastBoxDate: null }]));
  const context = await env.browser.newContext({ reducedMotion: 'reduce' });
  const errors = [];
  await prepare(context, { state: st, errors });
  const page = await context.newPage();
  await page.goto(env.server.url);
  await page.click('.card'); await page.waitForSelector('#practice');
  return { page, context, errors };
}

test('My words lists mastered words and speaks one on tap', { skip }, async () => {
  const { page, context, errors } = await open(['garden', 'island']);
  assert.match(await page.textContent('#words-link'), /My words \(2\)/);
  await page.click('#words-link');
  await page.waitForSelector('.word-grid');
  assert.deepEqual(await page.$$eval('.word-grid button', (b) => b.map((x) => x.textContent)), ['garden', 'island']);
  assert.match(await page.textContent('#words-count'), /2 of 3/);
  await page.click('.word-grid button');
  assert.ok((await page.evaluate(() => window.__spoken)).some((u) => u.text === 'garden'));
  assert.deepEqual(errors, []);
  await context.close();
});

test('My words shows a friendly message when nothing is mastered yet', { skip }, async () => {
  const { page, context } = await open([]);
  await page.click('#words-link');
  assert.match(await page.textContent('#words-empty'), /No mastered words yet/);
  await context.close();
});
