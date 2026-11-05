import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, seededState, playSession } from './helpers.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

async function open(patch = () => {}, { reducedMotion = 'no-preference', route = null } = {}) {
  const st = seededState(); patch(st.profiles.p1, st);
  const context = await env.browser.newContext({ reducedMotion, viewport: { width: 900, height: 1000 } });
  const errors = [];
  await prepare(context, { state: st, errors });
  // count every tone the game asks the browser to make
  await context.addInitScript(() => {
    window.__tones = 0;
    const node = () => ({ connect() {}, frequency: {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, start() { window.__tones++; }, stop() {} });
    window.AudioContext = class { constructor() { this.currentTime = 0; this.destination = {}; this.state = 'running'; } createOscillator() { return node(); } createGain() { return node(); } resume() {} };
  });
  const page = await context.newPage();
  await page.goto(env.server.url);
  await page.click('.card');
  await page.waitForSelector('#practice');
  if (route) { await page.goto(`${env.server.url}#/${route}`); }
  return { page, context, errors };
}
const actionOf = (page, sel) => page.getAttribute(sel, 'data-pet-action');

test('home: clicking the buddy runs through every action before repeating, never the same one twice', { skip }, async () => {
  const { page, context, errors } = await open();
  const seq = [];
  for (let i = 0; i < 39; i++) { await page.click('.hero .pet-wrap'); seq.push(await actionOf(page, '.hero .pet-wrap')); }
  for (let i = 1; i < seq.length; i++) assert.notEqual(seq[i], seq[i - 1], `repeat at ${i}`);
  for (let c = 0; c < 3; c++) assert.equal(new Set(seq.slice(c * 13, c * 13 + 13)).size, 13, `cycle ${c + 1} should use all 13 actions`);
  assert.equal(await page.getAttribute('.hero .pet-wrap', 'data-pet-count'), '39');
  assert.deepEqual(errors, []);
  await context.close();
});

test('each click makes a sound (unless sound is off), and talking actions show a speech bubble', { skip }, async () => {
  const { page, context } = await open();
  const tones = () => page.evaluate(() => window.__tones);
  let sawBubble = false;
  for (let i = 0; i < 13; i++) {
    const before = await tones();
    await page.click('.hero .pet-wrap');
    assert.ok((await tones()) > before, `click ${i + 1} (${await actionOf(page, '.hero .pet-wrap')}) was silent`);
    const a = await actionOf(page, '.hero .pet-wrap');
    if (a === 'talk' || a === 'cheer') { assert.ok((await page.locator('.pet-bubble').textContent()).length > 3); sawBubble = true; }
  }
  assert.ok(sawBubble, 'no speech bubble in a full cycle');
  const withSpeech = await page.evaluate(() => window.__spoken.length);
  assert.ok(withSpeech >= 0);
  await context.close();

  const muted = await open((p, st) => { st.settings.sound = false; });
  const before = await muted.page.evaluate(() => window.__tones);
  for (let i = 0; i < 5; i++) await muted.page.click('.hero .pet-wrap');
  assert.equal(await muted.page.evaluate(() => window.__tones), before, 'muted: no tones');
  assert.equal(await muted.page.getAttribute('.hero .pet-wrap', 'data-pet-count'), '5');   // still animates
  await muted.context.close();
});

test('it is keyboard-operable and announced as a button', { skip }, async () => {
  const { page, context } = await open();
  assert.equal(await page.getAttribute('.hero .pet-wrap', 'role'), 'button');
  assert.match(await page.getAttribute('.hero .pet-wrap', 'aria-label'), /Tap your practice buddy/);
  await page.focus('.hero .pet-wrap');
  await page.keyboard.press('Enter'); await page.keyboard.press('Space');
  assert.equal(await page.getAttribute('.hero .pet-wrap', 'data-pet-count'), '2');
  await context.close();
});

test('practice: poking the buddy keeps the answer box focused and typed text intact, and never speaks over the word', { skip }, async () => {
  const { page, context, errors } = await open();
  await page.click('#practice'); await page.waitForSelector('#answer');
  await page.fill('#answer', 'abc');
  const spoken = await page.evaluate(() => window.__spoken.length);
  for (let i = 0; i < 6; i++) await page.click('.companion');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'answer');
  assert.equal(await page.inputValue('#answer'), 'abc');
  assert.equal(await page.evaluate(() => window.__spoken.length), spoken, 'no speech from the buddy while practising');
  assert.equal(await page.getAttribute('.companion', 'data-pet-count'), '6');
  assert.equal(await page.getAttribute('.companion', 'tabindex'), null);          // stays out of the tab order
  assert.deepEqual(errors, []);
  await context.close();
});

test('sanctuary cards, the Creature book and the care screen each react independently', { skip }, async () => {
  const { page, context, errors } = await open((p) => { p.creatures.push({ id: 'c2', species: 'moonowl', stage: 2, fed: 0, hearts: 0, hatchedAt: 'x' }); });
  await page.goto(`${env.server.url}#/sanctuary`); await page.waitForSelector('.creature-card');
  await page.click('.creature-card:nth-child(1) .pet-wrap'); await page.click('.creature-card:nth-child(2) .pet-wrap'); await page.click('.creature-card:nth-child(2) .pet-wrap');
  assert.equal(await page.getAttribute('.creature-card:nth-child(1) .pet-wrap', 'data-pet-count'), '1');
  assert.equal(await page.getAttribute('.creature-card:nth-child(2) .pet-wrap', 'data-pet-count'), '2');

  await page.goto(`${env.server.url}#/book`); await page.waitForSelector('.book');
  assert.equal(await page.locator('.book-entry.owned .pet-wrap').count(), 2);
  assert.equal(await page.locator('.book-entry.unknown .pet-wrap').count(), 0);     // silhouettes stay still
  await page.click('.book-entry.owned .pet-wrap >> nth=0');
  assert.equal(await page.locator('.pet-wrap[data-pet-count]').count(), 1);

  await page.goto(`${env.server.url}#/sanctuary`); await page.waitForSelector('.creature-card');
  await page.click('.creature-card:first-child .care-link'); await page.waitForSelector('#care-feed');
  for (let i = 0; i < 3; i++) await page.click('.care-creature');                  // reacting AND being loved
  assert.equal(await page.getAttribute('.care-creature', 'data-pet-count'), '3');
  assert.equal(Number(await page.getAttribute('.meter-row[data-meter=loved] .meter', 'aria-valuenow')), 4);
  assert.deepEqual(errors, []);
  await context.close();
});

test('the results screen has a buddy to poke, and reduced motion keeps the reactions without the movement', { skip }, async () => {
  const { page, context } = await open(() => {}, { reducedMotion: 'reduce' });
  await playSession(page);
  await page.click('.summary-buddy');
  assert.equal(await page.getAttribute('.summary-buddy', 'data-pet-count'), '1');
  const classes = await page.getAttribute('.summary-buddy', 'class');
  assert.doesNotMatch(classes, /pet-(hop|spin|wiggle|flip|grow|shake|dash|dance)/);   // no motion classes
  assert.equal(await page.locator('.pet-fx').count(), 0);
  await context.close();
});
