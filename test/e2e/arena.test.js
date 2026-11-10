// The Arena on the map and the whole player journey (PRD 12): unlock at level 3, flags, picking a creature.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, battleState, savedProfile, startBattleFromMap, answer, hearts, playSession, unlockParent } from './helpers.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

async function open({ state = battleState(), random = 0.1, arena = true } = {}) {
  const context = await env.browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1000, height: 1100 } });
  const errors = [];
  await prepare(context, { state, errors, arena });
  if (random != null) await context.addInitScript((v) => { Math.random = () => v; }, random);
  const page = await context.newPage();
  await page.goto(env.server.url);
  await page.click('.card'); await page.waitForSelector('.world-map .token[data-settled=true]');
  return { page, context, errors };
}
const go = (page, hash) => page.evaluate((h) => { location.hash = h; }, hash);

test('Arena flags: grey and locked below level 3, open on every open land from level 3, none in the fog', { skip }, async () => {
  const low = await open({ state: battleState(undefined, { level: 2, xp: 120 }) });
  assert.equal(await low.page.locator('.arena-link').count(), 0);
  assert.equal(await low.page.locator('.arena-pin-locked').count(), 2);                // both open lands show a locked flag
  assert.equal(await low.page.getAttribute('.arena-pin-locked[data-region=r1]', 'aria-label'), 'Sunny Meadow Arena. Opens at level 3');
  assert.equal(await low.page.getAttribute('.arena-pin-locked[data-region=r1]', 'tabindex'), null);
  await go(low.page, '#/arena/r1'); await low.page.waitForSelector('.arena.locked');
  assert.match(await low.page.textContent('.arena-locked'), /The Arena opens at level 3\. Keep practicing, you are level 2!/);
  assert.equal(await low.page.locator('#battle-go').count(), 0);
  assert.deepEqual(low.errors, []);
  await low.context.close();

  const { page, context, errors } = await open();
  assert.equal(await page.locator('.arena-pin-locked').count(), 0);
  assert.deepEqual(await page.$$eval('.arena-link', (els) => els.map((e) => [e.dataset.region, e.getAttribute('aria-label'), e.getAttribute('role'), e.getAttribute('tabindex')])),
    [['r1', 'Open Sunny Meadow Arena', 'link', '0'], ['r2', 'Open Misty Marsh Arena', 'link', '0']]);
  assert.equal(await page.locator('.fog[data-locked=true]').count(), 7);
  await go(page, '#/arena/r5');                                                        // a land still in the fog
  await page.waitForSelector('#practice');
  assert.equal(await page.locator('.arena').count(), 0);
  await page.click('.arena-link[data-region=r2]'); await page.waitForSelector('.arena');
  assert.equal(await page.textContent('.arena h1'), 'Misty Marsh Arena');
  assert.equal(await page.locator('.arena-who .silhouette').count(), 1);               // its arena-only creature is a mystery for now
  assert.match(await page.textContent('.arena-who'), /\?\?\?.*You can never lose a battle\. Battles won here: 0/s);
  await page.click('#arena-back'); await page.waitForSelector('#practice');
  assert.deepEqual(errors, []);
  await context.close();
});

test('pick who battles: the chosen creature fights, and the choice is remembered', { skip, timeout: 60000 }, async () => {
  const state = battleState(['garden', 'rainbow', 'whisper']);
  state.profiles.p1.creatures.push({ id: 'c2', species: 'glowmoth', stage: 2, fed: 0, hearts: 0, hatchedAt: '2026-11-05T00:00:00Z' });
  const { page, context, errors } = await open({ state });
  await page.click('.arena-link[data-region=r1]'); await page.waitForSelector('.arena');
  assert.equal(await page.locator('.arena-pick').count(), 2);
  assert.equal(await page.getAttribute('.arena-pick.chosen', 'data-species'), 'burrowby');     // the practice buddy by default
  await page.click('.arena-pick[data-species=glowmoth]');
  assert.equal(await page.getAttribute('.arena-pick[data-species=glowmoth]', 'aria-checked'), 'true');
  assert.equal(await page.getAttribute('.arena-pick[data-species=burrowby]', 'aria-checked'), 'false');
  assert.match(await page.getAttribute('.arena-pick.chosen svg', 'class'), /pose-ready/);
  await page.click('#battle-go'); await page.waitForSelector('.battle-stage');
  assert.equal(await page.textContent('.bs-player .bs-name'), 'Glowmoth');
  assert.equal(await page.getAttribute('.bs-player .bs-creature svg', 'aria-label'), 'Glowmoth');
  assert.equal((await savedProfile(page)).arena.lastCreature, 'c2');
  for (let i = 0; i < 3; i++) await answer(page);
  await page.waitForSelector('.summary'); await page.click('#done'); await page.waitForSelector('#practice');
  await page.click('.arena-link[data-region=r1]'); await page.waitForSelector('.arena');
  assert.equal(await page.getAttribute('.arena-pick.chosen', 'data-species'), 'glowmoth');
  // now that Cloverknight is a friend it can be picked too, and the Arena shows it
  assert.equal(await page.locator('.arena-pick').count(), 3);
  assert.equal(await page.locator('.arena-who .silhouette').count(), 0);
  assert.match(await page.textContent('.arena-who'), /Cloverknight is already your friend.*Battles won here: 1/s);
  assert.deepEqual(errors, []);
  await context.close();
});

test('the whole journey: reach level 3 by practicing, see the Arena open, battle, befriend, feed the new friend', { skip, timeout: 120000 }, async () => {
  const state = battleState(undefined, { level: 2, xp: 200 });
  state.profiles.p1.crickets = 30;
  const { page, context, errors } = await open({ state });
  assert.equal(await page.locator('.arena-link').count(), 0);
  await playSession(page);                                                             // ten first-try answers: +115 XP -> level 3
  if (await page.locator('#levelup-ok').count()) await page.click('#levelup-ok');
  assert.match(await page.textContent('.arena-open'), /The Arena is open! Look for the Arena flags on the map/);
  await page.click('#done'); await page.waitForSelector('.world-map .token[data-settled=true]');
  assert.equal(await page.locator('.arena-link').count(), 2);
  assert.equal((await savedProfile(page)).level, 3);

  // nothing is due any more today: the battle uses the Bonus review words instead
  await startBattleFromMap(page);
  const full = await hearts(page);
  assert.ok(full >= 10);
  for (let i = 0; i < 40 && !page.url().endsWith('#/summary'); i++) await answer(page);
  await page.waitForSelector('.summary');
  assert.equal(await page.getAttribute('.battle-card', 'data-prize'), 'befriend');
  assert.equal(await page.locator('.arena-open').count(), 0);                          // the unlock message shows once, when it happens
  const p = await savedProfile(page);
  assert.deepEqual(p.sessions.map((s) => s.mode), ['practice', 'battle']);
  assert.equal(p.battlesWon, 1);
  await page.click('#done'); await page.waitForSelector('#practice');
  await page.click('#sanctuary'); await page.waitForSelector('.sanctuary');
  await page.click('.creature-card[data-species=cloverknight] .feed');
  assert.equal((await savedProfile(page)).creatures.find((c) => c.species === 'cloverknight').fed, 10);
  await go(page, '#/book'); await page.waitForSelector('.book');
  assert.match(await page.textContent('.book-entry[data-species=cloverknight]'), /Cloverknight.*arena/s);
  // grown-ups see the battle in the session history
  await go(page, '#/parent'); await unlockParent(page);
  await page.click('.tabs [data-tab=stats]');
  assert.match(await page.textContent('.history'), /· battle ·.*· practice ·/s);
  assert.deepEqual(errors, []);
  await context.close();
});

test('no unlock message and no flags when the Arena is switched off', { skip, timeout: 60000 }, async () => {
  const { page, context, errors } = await open({ state: battleState(undefined, { level: 2, xp: 200 }), arena: false });
  await playSession(page);
  if (await page.locator('#levelup-ok').count()) await page.click('#levelup-ok');
  assert.equal(await page.locator('.arena-open').count(), 0);
  await page.click('#done'); await page.waitForSelector('#practice');
  assert.equal(await page.locator('.arena-link, .arena-pin-locked').count(), 0);
  await go(page, '#/trophies'); await page.waitForSelector('.trophy-case');
  assert.match(await page.textContent('[data-trophy=champion]'), /Win 10 battles \(Arena\)/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('a trainer with no words to spell gets a friendly note instead of a battle', { skip }, async () => {
  const state = battleState();
  state.wordLists.sample.words = []; state.profiles.p1.wordStats = {};
  const { page, context, errors } = await open({ state });
  await page.click('.arena-link[data-region=r1]'); await page.waitForSelector('.arena');
  await page.click('#battle-go');
  assert.equal(await page.textContent('.arena .note'), 'Practice a few words first, then come back to battle.');
  assert.equal(await page.locator('.battle-stage').count(), 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test('help explains battles in plain words once the Arena is on', { skip }, async () => {
  const { page, context, errors } = await open();
  await page.click('#help-btn'); await page.waitForSelector('#help-dialog');
  assert.ok((await page.$$eval('.faq-group h3', (h) => h.map((x) => x.textContent))).includes('Battles'));
  assert.match(await page.textContent('#help-dialog'), /Can I lose a battle\?/);
  await page.click('#help-close');
  // and from inside a battle it opens without ending anything
  await startBattleFromMap(page);
  await answer(page);
  await page.click('#help-btn'); await page.waitForSelector('#help-dialog'); await page.click('#help-close');
  assert.equal(await hearts(page), 9);
  await answer(page);
  assert.equal(await hearts(page), 8);
  assert.deepEqual(errors, []);
  await context.close();
});

test('Arena flags never cover the trail, a treasure star or a Nest: every flag in all nine lands can be clicked, and so can every star', { skip }, async () => {
  const state = battleState(undefined, { level: 16, xp: 6800 });
  const p = state.profiles.p1;
  p.map.unlockedRegions = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9']; p.map.trailStep = 342;
  const { page, context, errors } = await open({ state });
  assert.equal(await page.locator('.arena-link').count(), 9);
  // what is really on top at the middle of each star, nest and flag?
  const blocked = await page.evaluate(() => {
    const out = [];
    const scroller = document.querySelector('.map-scroll');
    const topAt = (el) => { const r = el.getBoundingClientRect(); const c = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; scroller.scrollLeft += c.x - scroller.getBoundingClientRect().left - 300; const r2 = el.getBoundingClientRect(); return document.elementFromPoint(r2.left + r2.width / 2, r2.top + r2.height / 2); };
    for (const lm of document.querySelectorAll('.landmark')) { const top = topAt(lm); if (!lm.contains(top)) out.push(`star ${lm.dataset.landmark} is under ${top?.closest('.pin, .arena-link')?.getAttribute('class') ?? top?.tagName}`); }
    for (const pin of document.querySelectorAll('.nest-link, .arena-link')) { const top = topAt(pin); if (!pin.contains(top)) out.push(`${pin.getAttribute('aria-label')} is under ${top?.closest('.pin, .landmark')?.getAttribute('aria-label') ?? top?.tagName}`); }
    // flags keep clear of the trail itself
    const trail = document.querySelector('svg.map .trail'), len = trail.getTotalLength();
    for (const pin of document.querySelectorAll('.arena-link')) {
      const b = pin.getBBox();
      let near = Infinity;
      for (let i = 0; i <= 600; i++) { const q = trail.getPointAtLength((len * i) / 600); near = Math.min(near, Math.hypot(Math.max(b.x - q.x, 0, q.x - b.x - b.width), Math.max(b.y - q.y, 0, q.y - b.y - b.height))); }
      if (near < 17) out.push(`${pin.getAttribute('aria-label')} is ${Math.round(near)}px from the middle of the trail`);
    }
    return out;
  });
  assert.deepEqual(blocked, []);
  for (const r of ['r1', 'r5', 'r9']) {
    await page.click(`.arena-link[data-region=${r}]`); await page.waitForSelector(`.arena[data-region=${r}]`);
    await page.click('#arena-back'); await page.waitForSelector('.world-map .token[data-settled=true]');
  }
  assert.deepEqual(errors, []);
  await context.close();
});
