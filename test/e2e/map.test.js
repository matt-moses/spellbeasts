import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, seededState, playSession } from './helpers.js';
import { REGIONS } from '../../js/logic/species.js';
import { TOTAL_STEPS, REGION_END, LANDMARKS } from '../../js/logic/world.js';

const N = REGIONS.length;                      // 9 shipped, 12 with npm run check:12
const ALL = REGIONS.map((r) => r.id);

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

async function open(patch = () => {}, { reducedMotion = 'reduce' } = {}) {
  const st = seededState(); patch(st.profiles.p1, st);
  const context = await env.browser.newContext({ reducedMotion, viewport: { width: 1000, height: 1100 } });
  const errors = [];
  await prepare(context, { state: st, errors });
  const page = await context.newPage();
  await page.goto(env.server.url);
  await page.click('.card');
  await page.waitForSelector('.world-map .token[data-settled=true]');
  return { page, context, errors };
}
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('spellbeasts.v1')).profiles.p1);

test('the map is the home screen: every land, later ones fogged with what they need', { skip }, async () => {
  const { page, context, errors } = await open();
  assert.equal(await page.locator('svg.map .layer-regions > g').count(), N);
  assert.equal(await page.locator('.fog[data-locked=true]').count(), N - 1);
  assert.equal(await page.locator('.nest-link').count(), 1);
  assert.match(await page.getAttribute('.fog[data-region=r2]', 'aria-label'), /Reach level 2\b/);
  assert.match(await page.getAttribute('.fog[data-region=r3]', 'aria-label'), /Reach level 4\b(?! and)/);
  assert.match(await page.getAttribute('.fog[data-region=r6]', 'aria-label'), /Reach level 10 and 40 words mastered/);
  assert.match(await page.getAttribute('.fog[data-region=r4]', 'aria-label'), /level 6 and 15 words mastered/);
  const sign = await page.$$eval('.fog[data-region=r4] tspan', (t) => t.map((x) => x.textContent).join(' '));
  assert.match(sign, /Reach level 6 and 15 words mastered/);   // the visible sign says it too
  assert.deepEqual(errors, []);
  await context.close();
});

test('regions open when level (and mastery) are met; the pin is keyboard-operable', { skip }, async () => {
  const { page, context } = await open((p) => { p.level = 2; p.map.unlockedRegions = ['r1', 'r2']; });
  assert.equal(await page.locator('.fog[data-locked=true]').count(), N - 2);
  assert.equal(await page.locator('.nest-link').count(), 2);
  await page.focus('.nest-link[data-region=r2]');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.nest[data-region=r2]');
  await context.close();
  const lvl4 = await open((p) => { p.level = 6; p.map.unlockedRegions = ['r1', 'r2', 'r3']; });   // level 6 but no mastery: still closed
  assert.equal(await lvl4.page.locator('.fog[data-region=r4]').count(), 1);
  await lvl4.context.close();
});

test('first-try correct answers move the token; it waits at the gate of a locked region', { skip }, async () => {
  const a = await open((p) => { p.map.trailStep = 5; });
  assert.equal(await a.page.getAttribute('.token', 'data-step'), '5');
  await playSession(a.page);
  assert.match(await a.page.textContent('.results'), /Steps along the trail: 3/);
  await a.page.click('#done');
  await a.page.waitForSelector('.token[data-settled=true]');
  assert.equal(await a.page.getAttribute('.token', 'data-step'), '8');
  assert.equal((await saved(a.page)).map.trailStep, 8);
  await a.context.close();

  const b = await open((p) => { p.map.trailStep = 29; });                     // the gate is at step 30 (region 2 is locked)
  await playSession(b.page);
  assert.match(await b.page.textContent('.results'), /Steps along the trail: 1(?!\d)/);
  await b.page.click('#done');
  await b.page.waitForSelector('.token[data-settled=true]');
  assert.equal(await b.page.getAttribute('.token', 'data-step'), '30');
  assert.equal((await saved(b.page)).map.trailStep, 30);
  await b.context.close();
});

test('a landmark chest pays 5-15 crickets once, even after a reload', { skip }, async () => {
  const { page, context, errors } = await open((p) => { p.map.trailStep = 10; });
  assert.equal(await page.locator('.landmark.ready').count(), 1);
  assert.equal(await page.locator('.landmark.far').count(), LANDMARKS.length - 1);   // all the other stars are still ahead
  const before = (await saved(page)).crickets;
  await page.click('.landmark.ready');
  await page.waitForSelector('.landmark.claimed');
  const gained = (await saved(page)).crickets - before;
  assert.ok(gained >= 5 && gained <= 15, `gained ${gained}`);
  assert.match(await page.textContent('.world-map .note'), /Treasure!/);
  assert.equal(await page.locator('.landmark.ready').count(), 0);
  assert.match(await page.textContent('.stats'), new RegExp(`${gained} crickets`));
  await page.reload();
  await page.click('.card');
  await page.waitForSelector('.world-map .token[data-settled=true]');
  assert.equal(await page.locator('.landmark.ready').count(), 0);
  assert.equal(await page.locator('.landmark.claimed').count(), 1);
  assert.equal((await saved(page)).crickets - before, gained);
  assert.deepEqual(errors, []);
  await context.close();
});

test('the token animates to its new spot when motion is allowed', { skip }, async () => {
  const { page, context } = await open((p) => { p.map.trailStep = 5; }, { reducedMotion: 'no-preference' });
  await playSession(page);
  await page.click('#done');
  await page.waitForSelector('.world-map');
  await page.waitForFunction(() => document.querySelector('.token').dataset.settled === 'true', null, { timeout: 4000 });
  assert.equal(await page.getAttribute('.token', 'data-step'), '8');
  assert.ok(await page.getAttribute('.token', 'transform'));
  await context.close();
});

test('reaching the level for a new region says so on the summary', { skip }, async () => {
  const { page, context } = await open((p) => { p.xp = 95; });
  await playSession(page);
  assert.match(await page.textContent('.region-unlocked'), /Misty Marsh/);
  await page.click('#levelup-ok');
  await page.click('#done');
  await page.waitForSelector('.world-map');
  assert.equal(await page.locator('.nest-link').count(), 2);
  assert.equal(await page.locator('.fog[data-locked=true]').count(), N - 2);
  await context.close();
});

const unlockAll = (n = N, step = 0) => (p) => { p.level = 30; p.map.unlockedRegions = ALL.slice(0, n); p.map.trailStep = step; };

test('the newest lands are fogged with their own rules and open with them (twelve lands only)', { skip: skip || (N < 12 && 'only with 12 lands') }, async () => {
  const { page, context, errors } = await open();
  const say = (id) => page.getAttribute(`.fog[data-region=${id}]`, 'aria-label');
  assert.match(await say('r10'), /Harvest Hollow is locked\. Reach level 18 and 53 words mastered/);
  assert.match(await say('r11'), /Lantern Harbor is locked\. Reach level 20 and 56 words mastered/);
  assert.match(await say('r12'), /Wishing Ruins is locked\. Reach level 22 and 60 words mastered/);
  assert.match(await page.$$eval('.fog[data-region=r12] tspan', (t) => t.map((x) => x.textContent).join(' ')), /Reach level 22 and 60 words mastered/);
  assert.deepEqual(errors, []);
  await context.close();
  const open12 = await open(unlockAll());
  for (const id of ['r10', 'r11', 'r12']) assert.equal(await open12.page.locator(`.nest-link[data-region=${id}]`).count(), 1, id);
  await open12.page.focus('.nest-link[data-region=r12]'); await open12.page.keyboard.press('Enter');
  await open12.page.waitForSelector('.nest[data-region=r12]');
  await open12.context.close();
});

test('geometry: every land, pin, flag and fog sign sits inside the map, lands never overlap, and the end of the map can be scrolled to', { skip }, async () => {
  const { page, context, errors } = await open(unlockAll(Math.max(1, N - 1)));          // the last land stays fogged so its sign is checked too
  const g = await page.evaluate(() => {
    const svg = document.querySelector('svg.map'), vb = svg.viewBox.baseVal;
    const patches = [...document.querySelectorAll('.layer-regions > g')].map((gr) => { const e = gr.querySelector('ellipse:nth-of-type(2)'); return { id: gr.dataset.region, cx: +e.getAttribute('cx'), cy: +e.getAttribute('cy'), rx: +e.getAttribute('rx'), ry: +e.getAttribute('ry') }; });
    const box = (el) => { const b = el.getBBox(); return { id: el.dataset.region ?? el.className.baseVal, l: b.x, r: b.x + b.width, t: b.y, b: b.y + b.height }; };
    const marks = [...document.querySelectorAll('.nest-link, .arena-link, .arena-pin-locked, .fog')].map(box);
    const trail = box(document.querySelector('.trail'));
    return { W: vb.width, H: vb.height, patches, marks, trail };
  });
  assert.equal(g.patches.length, N);
  for (const p of g.patches) assert.ok(p.cx - p.rx >= 0 && p.cx + p.rx <= g.W && p.cy - p.ry >= 0 && p.cy + p.ry <= g.H, `${p.id} patch inside the map`);
  for (let i = 1; i < N; i++) assert.ok(Math.hypot(g.patches[i].cx - g.patches[i - 1].cx, g.patches[i].cy - g.patches[i - 1].cy) >= 200, `${g.patches[i].id} keeps clear of the land before it`);
  for (let i = 0; i < N; i++) for (let j = i + 2; j < N; j++) assert.ok(Math.hypot(g.patches[i].cx - g.patches[j].cx, g.patches[i].cy - g.patches[j].cy) >= 200, `${g.patches[i].id} / ${g.patches[j].id}`);
  for (const m of g.marks) assert.ok(m.l >= 0 && m.r <= g.W && m.t >= 0 && m.b <= g.H, `${m.id} inside the map`);
  assert.ok(g.trail.l >= 0 && g.trail.r <= g.W && g.trail.t >= 0 && g.trail.b <= g.H, 'the trail stays inside the map');
  // pins of different lands never overlap each other
  const pins = await page.$$eval('.nest-link', (els) => els.map((e) => { const b = e.getBBox(); return { id: e.dataset.region, l: b.x, r: b.x + b.width, t: b.y, b: b.y + b.height }; }));
  for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) {
    const a = pins[i], b = pins[j];
    assert.ok(a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t, `${a.id} and ${b.id} pins overlap`);
  }
  // scrolling all the way right brings the last land fully into view
  const end = await page.evaluate(() => {
    const sc = document.querySelector('.map-scroll'); sc.scrollLeft = sc.scrollWidth;
    const s = sc.getBoundingClientRect(), f = [...document.querySelectorAll('.fog')].at(-1)?.getBoundingClientRect() ?? document.querySelector('.layer-pins').lastElementChild.getBoundingClientRect();
    return { scrollable: sc.scrollWidth > sc.clientWidth, inView: f.left >= s.left - 1 && f.right <= s.right + 1 };
  });
  assert.equal(end.scrollable, true);
  assert.equal(end.inView, true, 'the last land is reachable by scrolling');
  assert.deepEqual(errors, []);
  await context.close();
});

test('the whole trail: the token can stand on the very last step, every star is reached, and a closed gate between lands stops it', { skip }, async () => {
  const done = await open(unlockAll(N, TOTAL_STEPS));
  assert.equal(await done.page.getAttribute('.token', 'data-step'), String(TOTAL_STEPS));
  assert.equal(await done.page.locator('.landmark').count(), LANDMARKS.length);
  assert.equal(await done.page.locator('.landmark.ready').count(), LANDMARKS.length);
  assert.equal(await done.page.locator('.landmark.far').count(), 0);
  await done.context.close();
  if (N < 12) return;
  const gate = await open(unlockAll(10, REGION_END[9] - 1));                              // lands 1-10 open, the gate to land 11 is at the end of land 10
  await playSession(gate.page);
  assert.match(await gate.page.textContent('.results'), /Steps along the trail: 1(?!\d)/);
  await gate.page.click('#done');
  await gate.page.waitForSelector('.token[data-settled=true]');
  assert.equal(await gate.page.getAttribute('.token', 'data-step'), String(REGION_END[9]));
  await gate.context.close();
});
