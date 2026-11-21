// Confetti when a word is mastered for the first time (and only then).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, seededState, lastSpoken } from './helpers.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

async function answerOnly(correctDays, reducedMotion) {
  const st = seededState(['garden']);
  st.profiles.p1.wordStats.sample = { garden: { box: 3, nextDue: '2026-01-01', correctDays, attempts: correctDays.length, firstTries: correctDays.length, firstTryCorrect: correctDays.length, lastMissed: null, lastBoxDate: '2026-01-01' } };
  const context = await env.browser.newContext({ reducedMotion });
  const errors = [];
  await prepare(context, { state: st, errors });
  const page = await context.newPage();
  await page.goto(env.server.url);
  await page.click('.card'); await page.click('#practice'); await page.waitForSelector('#answer');
  await page.fill('#answer', await lastSpoken(page)); await page.press('#answer', 'Enter');
  await page.waitForTimeout(200);
  const n = await page.locator('.confetti i').count();
  await context.close();
  assert.deepEqual(errors, []);
  return n;
}

test('the answer that masters a word throws confetti', { skip }, async () => {
  assert.ok(await answerOnly(['2026-11-01', '2026-11-02'], 'no-preference') > 20);
});
test('an ordinary correct answer does not', { skip }, async () => {
  assert.equal(await answerOnly(['2026-11-01'], 'no-preference'), 0);
});
test('reduced motion: no confetti', { skip }, async () => {
  assert.equal(await answerOnly(['2026-11-01', '2026-11-02'], 'reduce'), 0);
});
