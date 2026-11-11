// The three newest lands, reached the way a player reaches them: practising the bundled 75-word list until the level and
// mastery requirement is met (plan.md, "bigger default word list"). Each case starts a trainer one session short.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, playSession } from './helpers.js';
import { freshState, freshProfile } from '../../js/logic/storage-schema.js';
import { addStarter } from '../../js/logic/collection.js';
import { SAMPLE_WORDS } from '../../data/sample-words.js';
import { REGIONS } from '../../js/logic/species.js';
import { UNLOCKS } from '../../js/logic/world.js';
import { xpForLevel } from '../../js/logic/rewards.js';
import { eggPrice } from '../../js/logic/hatch.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

const AWAY = '2099-01-01';
const stat = (days, due) => ({ box: days.length >= 3 ? 4 : 3, nextDue: due, correctDays: days, attempts: days.length, firstTries: days.length, firstTryCorrect: days.length, lastMissed: null, lastBoxDate: days.at(-1) ?? null });

// A trainer in the land before `index`, with some words already mastered and 12 more due today with two correct days each.
// A clean session asks 10 to 12 of those, and masters every one it asks, so even the shortest one reaches the land's mastery
// number. Their XP sits just under the level the land needs.
function seed(index) {
  const need = UNLOCKS[index], words = SAMPLE_WORDS.map((w) => w.word);
  const state = freshState();
  const p = freshProfile({ name: 'Sam', avatarSpecies: 'burrowby', now: '2026-10-01T00:00:00Z' });
  addStarter(p, 'burrowby', '2026-10-01T00:00:00Z');
  p.level = need.level - 1; p.xp = xpForLevel(need.level) - 100; p.crickets = 1000;
  p.map.unlockedRegions = REGIONS.slice(0, index).map((r) => r.id);
  const base = need.mastered - 10;
  p.wordStats.sample = {};
  words.slice(0, base).forEach((w) => { p.wordStats.sample[w] = stat(['2026-09-01', '2026-09-02', '2026-09-03'], AWAY); });
  words.slice(base, base + 12).forEach((w) => { p.wordStats.sample[w] = stat(['2026-09-01', '2026-09-02'], '2026-01-01'); });
  state.profiles = { p1: p };
  return state;
}

test('the bundled list is big enough: every land asks for no more mastered words than it holds', () => {
  assert.ok(SAMPLE_WORDS.length >= Math.max(...UNLOCKS.map((u) => u.mastered)) + 12);
});

for (const index of [9, 10, 11]) {
  test(`${REGIONS[index]?.name ?? `land ${index + 1}`}: opens after a session that reaches level ${UNLOCKS[index]?.level} and ${UNLOCKS[index]?.mastered} mastered words`, { skip: skip || (REGIONS.length < 12 && 'only with 12 lands'), timeout: 120000 }, async () => {
    const land = REGIONS[index], need = UNLOCKS[index];
    const context = await env.browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1000, height: 1100 } });
    const errors = [];
    await prepare(context, { state: seed(index), errors });
    const page = await context.newPage();
    await page.goto(env.server.url);
    await page.click('.card'); await page.waitForSelector('#practice');
    assert.equal(await page.locator(`.nest-link[data-region=${land.id}]`).count(), 0, 'closed before the session');
    assert.match(await page.getAttribute(`.fog[data-region=${land.id}]`, 'aria-label'), new RegExp(`Reach level ${need.level} and ${need.mastered} words mastered`));
    await playSession(page);
    assert.match(await page.textContent('.region-unlocked'), new RegExp(`New region unlocked: ${land.name}!`));
    assert.match(await page.textContent('.results'), /Newly mastered/);
    if (await page.locator('#levelup-ok').count()) await page.click('#levelup-ok');
    await page.click('#done'); await page.waitForSelector('.world-map .token[data-settled=true]');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('spellbeasts.v1')).profiles.p1);
    assert.equal(saved.level, need.level);
    assert.ok(saved.map.unlockedRegions.includes(land.id));
    assert.equal(await page.locator(`.nest-link[data-region=${land.id}]`).count(), 1, 'open on the map');
    assert.equal(await page.locator(`.fog[data-region=${land.id}]`).count(), 0);
    await page.click(`.nest-link[data-region=${land.id}]`); await page.waitForSelector(`.nest[data-region=${land.id}]`);
    const crickets = () => page.evaluate(() => JSON.parse(localStorage.getItem('spellbeasts.v1')).profiles.p1.crickets);
    const before = await crickets();
    await page.click('#buy-egg'); await page.waitForSelector('.egg-card');
    assert.equal(before - await crickets(), eggPrice(index));
    assert.deepEqual(errors, []);
    await context.close();
  });
}
