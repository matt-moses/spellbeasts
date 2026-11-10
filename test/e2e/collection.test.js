import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, seededState, playSession } from './helpers.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

async function newPage(opts, { fixedRandom } = {}) {
  const context = await env.browser.newContext();
  const errors = [];
  await prepare(context, { ...opts, errors });
  if (fixedRandom != null) await context.addInitScript((v) => { Math.random = () => v; }, fixedRandom);
  return { page: await context.newPage(), context, errors };
}

test('choosing a starter puts it in the Sanctuary and the Creature book', { skip }, async () => {
  const { page, context, errors } = await newPage();
  await page.goto(env.server.url);
  assert.equal(await page.locator('.starter').count(), 3);
  await page.fill('input[name=name]', 'Alex');
  await page.check('input[value=puddlenite]');
  await page.click('button[type=submit]');
  await page.waitForSelector('#practice');
  await page.click('#sanctuary');
  await page.waitForSelector('.sanctuary');
  assert.equal(await page.locator('.creature-card').count(), 1);
  assert.equal(await page.getAttribute('.creature-card', 'data-species'), 'puddlenite');
  assert.match(await page.textContent('.buddy'), /Practice buddy/);
  assert.match(await page.textContent('.hungry'), /hungry/);
  await page.click('button:text-is("Creature book")');
  await page.waitForSelector('.book');
  assert.match(await page.textContent('.book p'), /1 of 36 discovered/);
  assert.equal(await page.locator('.book-entry.unknown').count(), 35);
  assert.deepEqual(errors, []);
  await context.close();
});

test('an egg warmed by correct answers hatches, shows up everywhere, and pays First Hatch', { skip }, async () => {
  const st = seededState();
  st.profiles.p1.crickets = 100;
  st.profiles.p1.eggs.push({ id: 'e1', regionId: 'r1', progress: 9, needed: 10 });   // one correct word from ready
  const { page, context, errors } = await newPage({ state: st }, { fixedRandom: 0.95 });   // 0.95 rolls the rare species
  await page.goto(env.server.url);
  await page.click('.card');
  await page.waitForSelector('#practice');
  assert.equal(await page.locator('.ready-egg').count(), 0);
  await playSession(page);
  await page.click('#done');
  await page.waitForSelector('.ready-egg');
  await page.click('.nest-link[data-region=r1]');
  await page.waitForSelector('.egg-card.ready');
  await page.click('.hatch');
  await page.waitForSelector('.reveal');
  assert.match(await page.textContent('.reveal h2'), /Glowmoth/);
  assert.match(await page.textContent('.reveal'), /First Hatch/);
  assert.equal(await page.locator('.egg-card').count(), 0);

  await page.click('button:text-is("Sanctuary")');
  await page.waitForSelector('.sanctuary');
  assert.equal(await page.locator('.creature-card').count(), 2);
  await page.click('button:text-is("Creature book")');
  await page.waitForSelector('.book');
  assert.match(await page.textContent('.book p'), /2 of 36 discovered/);
  assert.equal(await page.locator('.book-entry.owned[data-species=glowmoth]').count(), 1);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('spellbeasts.v1')).profiles.p1);
  assert.equal(saved.eggsHatched, 1);
  assert.equal(saved.creatures.length, 2);
  assert.ok(saved.trophies['first-hatch']);
  assert.deepEqual(errors, []);
  await context.close();
});

test('buying eggs spends crickets; locked regions are closed; feeding and evolving follow the rules', { skip }, async () => {
  const st = seededState();
  const p = st.profiles.p1; p.crickets = 50; p.level = 3;
  const { page, context, errors } = await newPage({ state: st });
  await page.goto(env.server.url);
  await page.click('.card');
  await page.waitForSelector('#practice');
  assert.equal(await page.locator('.nest-link').count(), 1);          // only the first region is open
  await page.click('.nest-link[data-region=r1]');
  await page.click('#buy-egg');
  await page.waitForSelector('.egg-card');
  assert.match(await page.textContent('.nest .stats'), /30 crickets/);  // 50 - 20
  assert.match(await page.textContent('.egg-card'), /0 of 10/);

  await page.goto(`${env.server.url}#/nest/r2`);                        // locked: bounced home
  await page.waitForSelector('#practice');

  await page.click('#sanctuary');
  await page.waitForSelector('.creature-card');
  assert.match(await page.textContent('.creature-card strong'), /Little Burrowby/);
  assert.equal(await page.locator('.evolve').count(), 0);
  for (let i = 0; i < 3; i++) await page.click('.feed');               // 3 x 10 crickets
  await page.waitForSelector('.evolve');
  assert.match(await page.textContent('.creature-card small'), /Fed 30\/30/);
  await page.click('.evolve');
  await page.waitForSelector('.reveal');
  assert.doesNotMatch(await page.textContent('.creature-card strong'), /Little/);
  assert.match(await page.textContent('.creature-card .hint'), /master 10 more words/);
  assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('spellbeasts.v1')).profiles.p1)).crickets, 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test('with the Arena on, the Creature book lists 36 creatures: each land shows its arena-only one as a silhouette with a hint', { skip }, async () => {
  const state = seededState();
  const { page, context, errors } = await newPage({ state, arena: true });
  await page.goto(env.server.url);
  await page.click('.card'); await page.waitForSelector('#practice');
  await page.evaluate(() => { location.hash = '#/book'; });
  await page.waitForSelector('.book');
  assert.match(await page.textContent('.book p'), /1 of 36 discovered/);
  assert.equal(await page.locator('.book-entry').count(), 36);
  assert.equal(await page.locator('.book-entry.arena-only').count(), 9);
  assert.equal(await page.locator('.book-entry.arena-only .silhouette').count(), 9);
  assert.match(await page.textContent('.book-entry[data-species=cloverknight]'), /\?\?\?.*Meet it in the Sunny Meadow Arena\./s);
  assert.doesNotMatch(await page.textContent('.book-entry[data-species=cloverknight]'), /Cloverknight/);
  // the Nest still offers only the three egg species
  await page.evaluate(() => { location.hash = '#/nest/r1'; });
  await page.waitForSelector('.nest');
  assert.equal(await page.locator('.nest .species-row .mini').count(), 3);
  assert.deepEqual(errors, []);
  await context.close();
});
test('with the Arena off, the book still shows 27 creatures and no arena entries', { skip }, async () => {
  const { page, context, errors } = await newPage({ state: seededState(), arena: false });
  await page.goto(env.server.url);
  await page.click('.card'); await page.waitForSelector('#practice');
  await page.evaluate(() => { location.hash = '#/book'; });
  await page.waitForSelector('.book');
  assert.equal(await page.locator('.book-entry').count(), 27);
  assert.equal(await page.locator('.book-entry.arena-only').count(), 0);
  assert.deepEqual(errors, []);
  await context.close();
});
