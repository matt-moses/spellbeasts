import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, seededState } from './helpers.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

async function open(patch = () => {}) {
  const st = seededState(); st.profiles.p1.crickets = 10; patch(st.profiles.p1);
  const context = await env.browser.newContext({ reducedMotion: 'reduce', viewport: { width: 900, height: 1000 } });
  const errors = [];
  await prepare(context, { state: st, errors });
  await context.clock.install({ time: new Date('2026-11-05T10:00:00') });
  const page = await context.newPage();
  await page.goto(env.server.url);
  await page.click('.card'); await page.waitForSelector('#practice');
  await page.click('#care-tile'); await page.waitForSelector('#care-play');
  await page.click('#care-play'); await page.waitForSelector('#game-catch');
  return { page, context, errors };
}
const saved = async (page) => Object.values((await page.evaluate(() => JSON.parse(localStorage.getItem('spellbeasts.v1')))).profiles)[0];

test('the games menu offers three games and a way back to the pet', { skip }, async () => {
  const { page, context } = await open();
  assert.equal(await page.locator('.game-card').count(), 3);
  assert.match(await page.textContent('h1'), /Play with Little Burrowby/);
  await page.click('#game-pet'); await page.waitForSelector('#care-feed');
  await context.close();
});

test('every game can be exited at any time (button or Escape) without a cost, back to the menu', { skip }, async () => {
  const { page, context, errors } = await open();
  const before = await saved(page);
  for (const [card, start] of [['#game-catch', '#game-start'], ['#game-run', null], ['#game-memory', null]]) {
    await page.click(card);
    if (start) await page.click(start);
    await page.waitForSelector('#game-exit');
    await page.clock.runFor(1500);
    await page.click('#game-exit');
    await page.waitForSelector('#game-catch');
    assert.equal(await page.locator('#game-exit').count(), 0);
    await page.click(card);
    if (start) await page.click(start);
    await page.waitForSelector('#game-exit');
    await page.keyboard.press('Escape');
    await page.waitForSelector('#game-catch');
  }
  const after_ = await saved(page);
  assert.deepEqual([after_.berries, after_.crickets, after_.care.games, after_.creatures[0].care?.fun ?? 3], [before.berries, before.crickets, 0, 3], 'exiting costs nothing and counts nothing');
  assert.deepEqual(errors, []);
  await context.close();
});

test('Hop Run: hopping over obstacles keeps the hearts; never hopping ends the run, costs crickets', { skip }, async () => {
  const { page, context, errors } = await open((p) => { p.berries = 3; });
  await page.click('#game-run'); await page.waitForSelector('.run-field');
  // a good player: hop when an obstacle is close (reads the obstacle's position from the screen)
  for (let i = 0; i < 400; i++) {
    await page.clock.runFor(30);
    if (await page.locator('#game-result').count()) break;
    const close = await page.evaluate(() => [...document.querySelectorAll('.obstacle')].some((o) => { const x = Number(o.dataset.x); return x > 19 && x < 19 + 11; }));
    if (close) await page.keyboard.press('Space');
    if (i === 260) break;
  }
  assert.equal(await page.locator('#run-hearts .lost').count(), 0, 'no hearts lost by a good player');
  assert.match(await page.textContent('#run-score'), /Distance \d{3,}/);

  await page.click('#game-exit'); await page.click('#game-run'); await page.waitForSelector('.run-field');   // fresh run, never hop
  await page.clock.runFor(60000);
  await page.waitForSelector('#game-result');
  assert.match(await page.textContent('#game-result'), /You ran \d+ steps/);
  const p = await saved(page);
  assert.equal(p.care.games, 1);
  assert.equal(p.creatures[0].care.fun, 5);
  const refund = /you got 1 back/.test(await page.textContent('#game-result')) ? 1 : 0;
  assert.equal(p.crickets, 10 - 3 + refund);
  assert.equal(p.berries, 3, 'games give no berries');
  await page.click('#game-again'); await page.waitForSelector('.run-field');
  assert.deepEqual(errors, []);
  await context.close();
});

test('Memory Match: solving it by remembering costs crickets, with some back, and mismatched cards flip back', { skip }, async () => {
  const { page, context, errors } = await open((p) => { p.berries = 3; });
  await page.click('#game-memory'); await page.waitForSelector('.mem-card');
  assert.equal(await page.locator('.mem-card').count(), 12);
  assert.equal(await page.locator('.mem-card[data-state=down]').count(), 12);
  const known = {};                                                            // index -> species, learned by flipping
  const flipIdx = async (i) => { await page.click(`.mem-card[data-index="${i}"]`); known[i] = await page.getAttribute(`.mem-card[data-index="${i}"]`, 'data-species'); };
  const matchedCount = () => page.locator('.mem-card[data-state=matched]').count();
  let sawMismatch = false;
  for (let guard = 0; guard < 60 && !(await page.locator('#game-result').count()); guard++) {
    const left = (await page.$$eval('.mem-card[data-state=down]', (c) => c.map((x) => Number(x.dataset.index))));
    if (!left.length) { await page.clock.runFor(1000); continue; }
    const pairKnown = left.find((i) => known[i] && left.some((j) => j !== i && known[j] === known[i]));
    if (pairKnown !== undefined) { const j = left.find((k) => k !== pairKnown && known[k] === known[pairKnown]); await flipIdx(pairKnown); await flipIdx(j); }
    else {
      const first = left.find((i) => !known[i]); await flipIdx(first);
      const twin = left.find((j) => j !== first && known[j] === known[first]);
      if (twin !== undefined) await flipIdx(twin);
      else { const second = left.find((j) => j !== first && !known[j]); await flipIdx(second); if (known[second] !== known[first]) { sawMismatch = true; assert.equal(await page.locator('.mem-card[data-state=up]').count(), 2); } }
    }
    await page.clock.runFor(1000);
  }
  await page.waitForSelector('#game-result');
  assert.ok(sawMismatch, 'a mismatch happened and flipped back');
  assert.match(await page.textContent('#game-result'), /It took \d+ moves/);
  const after = await saved(page);
  assert.ok(after.crickets === 7 || after.crickets === 8, `crickets ${after.crickets}`);   // cost 3, maybe 1 back
  assert.equal(after.berries, 3, 'games give no berries');
  assert.equal(await matchedCount(), 0);                                       // result screen replaced the board
  assert.deepEqual(errors, []);
  await context.close();
});

test('with fewer than 3 crickets the games are locked and a practice button explains how to earn more', { skip }, async () => {
  const { page, context, errors } = await open((p) => { p.crickets = 2; });
  assert.match(await page.textContent('.play .lead'), /Spell some words to play/);
  assert.match(await page.textContent('#game-cost'), /cost 3 crickets and you have 2/);
  for (const id of ['#game-catch', '#game-run', '#game-memory']) assert.equal(await page.isDisabled(id), true);
  await page.click('#game-practice');
  await page.waitForSelector('#practice');                                       // lands in a normal practice session
  assert.deepEqual(errors, []);
  await context.close();
});

test('after a game the player cannot afford another, the result offers practice instead of Play again', { skip }, async () => {
  const { page, context } = await open((p) => { p.crickets = 3; });
  await page.click('#game-run'); await page.waitForSelector('.run-field');
  await page.clock.runFor(60000);
  await page.waitForSelector('#game-result');
  const refund = /you got 1 back/.test(await page.textContent('#game-result'));
  assert.equal(await page.locator('#game-again').count(), refund ? 1 : 0);
  assert.equal(await page.locator('#game-practice').count(), refund ? 0 : 1);
  await context.close();
});
