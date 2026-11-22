import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, seededState } from './helpers.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

async function open(mastered) {
  const st = seededState(); const p = st.profiles.p1;
  p.wordStats[p.activeListId] = Object.fromEntries(Array.from({ length: mastered }, (_, i) => [`m${i}`, { correctDays: ['a', 'b', 'c'] }]));
  const context = await env.browser.newContext({ reducedMotion: 'reduce', viewport: { width: 900, height: 1000 } });
  const errors = [];
  await prepare(context, { state: st, errors });
  await context.clock.install({ time: new Date('2026-11-05T10:00:00') });
  const page = await context.newPage();
  await page.goto(env.server.url);
  await page.click('.card'); await page.waitForSelector('#practice');
  return { page, context, errors };
}
const saved = async (page) => Object.values((await page.evaluate(() => JSON.parse(localStorage.getItem('spellbeasts.v1')))).profiles)[0];

test('no chest tile until five words are mastered, and Home says how many are left', { skip }, async () => {
  const { page, context } = await open(3);
  assert.equal(await page.locator('#chest-tile').count(), 0);
  assert.match(await page.textContent('#chest-progress'), /2 more mastered words/);
  await context.close();
});

test('a waiting chest opens to a reward for the pets, uses up the chest, and can be left for later', { skip }, async () => {
  const { page, context, errors } = await open(10);
  assert.match(await page.textContent('#chest-tile'), /\(2\)/);
  const before = await saved(page);
  await page.click('#chest-tile'); await page.waitForSelector('#chest-open');
  await page.click('#chest-open'); await page.waitForSelector('#chest-reward');
  const kind = await page.getAttribute('#chest-reward', 'data-kind');
  assert.ok(['crickets', 'berries', 'treat', 'egg'].includes(kind), kind);
  const after_ = await saved(page);
  assert.equal(after_.chestsOpened, 1);
  if (kind === 'crickets') assert.ok(after_.crickets > before.crickets);
  if (kind === 'berries') assert.ok(after_.berries > before.berries);
  if (kind === 'egg') assert.equal(after_.eggs.length, before.eggs.length + 1);
  await page.click('#chest-next'); await page.waitForSelector('#chest-open');
  await page.click('#chest-later'); await page.waitForSelector('#practice');
  assert.equal(await page.locator('#chest-tile').count(), 1, 'one chest is still waiting');
  assert.deepEqual(errors, []);
  await context.close();
});
