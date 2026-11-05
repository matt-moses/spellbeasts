import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, seededState, playSession, unlockParent } from './helpers.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

const BAD = /\b(null|undefined|NaN|\[object Object\])\b/;
async function clean(page, where) {
  const text = await page.innerText('body');
  assert.doesNotMatch(text, BAD, `${where}: stray placeholder text`);
  const broken = await page.$$eval('svg', (els) => els.filter((s) => s.getBoundingClientRect().width === 0 && !s.closest('[hidden]') && !s.closest('defs')).length);
  assert.equal(broken, 0, `${where}: zero-size svg`);
}

test('no screen shows null/undefined/NaN or drops a graphic, in any state', { skip }, async () => {
  const st = seededState(['Monday', 'garden', 'island', 'window']);
  const p = st.profiles.p1;
  p.crickets = 60; p.level = 4; p.xp = 460; p.map.unlockedRegions = ['r1', 'r2']; p.map.trailStep = 12;
  p.eggs.push({ id: 'e1', regionId: 'r1', progress: 10, needed: 10 }, { id: 'e2', regionId: 'r2', progress: 3, needed: 12 });
  p.creatures.push({ id: 'c2', species: 'moonowl', stage: 2, fed: 20, hearts: 2, hatchedAt: 'x' }, { id: 'c3', species: 'stormwyrm', stage: 3, fed: 0, hearts: 0, hatchedAt: 'x' });
  const context = await env.browser.newContext({ reducedMotion: 'reduce', viewport: { width: 900, height: 1000 } });
  const errors = [];
  await prepare(context, { state: st, errors });
  const page = await context.newPage();
  await page.goto(env.server.url);
  await clean(page, 'picker');
  await page.click('.card'); await page.waitForSelector('#practice');
  await clean(page, 'home');

  await page.click('#practice'); await page.waitForSelector('#answer');
  await clean(page, 'practice');
  await page.click('#say-def'); await clean(page, 'practice+definition');
  await page.fill('#answer', 'zzz'); await page.press('#answer', 'Enter'); await page.waitForSelector('.correct-word');
  await clean(page, 'practice after a miss');
  await page.goto(env.server.url + '#/home'); await page.waitForSelector('#practice');
  await playSession(page);
  await clean(page, 'summary');
  if (await page.locator('#levelup-ok').count()) await page.click('#levelup-ok');
  await page.click('#done'); await page.waitForSelector('#practice');

  const cid = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('spellbeasts.v1')).profiles)[0].creatures[0].id);
  for (const route of ['trophies', 'sanctuary', 'book', 'nest/r1', 'nest/r2', `care/${cid}`, `play/${cid}`]) {
    await page.goto(`${env.server.url}#/${route}`); await page.waitForSelector('.screen');
    await clean(page, route);
  }
  await page.goto(`${env.server.url}#/nest/r1`); await page.waitForSelector('.hatch');
  await page.click('.hatch'); await page.waitForSelector('.reveal'); await clean(page, 'hatch reveal');

  await page.goto(`${env.server.url}#/parent`); await page.waitForSelector('#gate-year');
  await clean(page, 'parent gate');
  await unlockParent(page);
  for (const t of ['words', 'stats', 'trainers', 'backup']) { await page.click(`.tab[data-tab=${t}]`); await clean(page, `parent ${t}`); }
  assert.deepEqual(errors, []);
  await context.close();
});
