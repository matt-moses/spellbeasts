import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, seededState } from './helpers.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

async function open(patch = () => {}) {
  const st = seededState(); patch(st);
  const context = await env.browser.newContext({ reducedMotion: 'reduce', viewport: { width: 900, height: 1000 } });
  const errors = [];
  await prepare(context, { state: st, errors });
  await context.addInitScript(() => {          // a richer voice list than the default fake, and record voice + rate
    const voices = [{ voiceURI: 'esp', name: 'eSpeak English', lang: 'en-US' }, { voiceURI: 'fr', name: 'Amelie', lang: 'fr-FR' },
      { voiceURI: 'aria', name: 'Microsoft Aria Online (Natural)', lang: 'en-US', localService: false }, { voiceURI: 'plain', name: 'Plain Voice', lang: 'en-GB' }];
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => voices, cancel() {}, speak(u) { window.__spoken.push({ text: u.text, rate: u.rate, voice: u.voice?.voiceURI }); } } });
  });
  const page = await context.newPage();
  await page.goto(env.server.url);
  await page.click('.card'); await page.waitForSelector('#practice');
  await page.click('#settings-link'); await page.waitForSelector('#voice-select');
  return { page, context, errors };
}
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('spellbeasts.v1')).settings);

test('voice list is English only with natural voices first; the best one is used automatically', { skip }, async () => {
  const { page, context, errors } = await open();
  const opts = await page.$$eval('#voice-select option', (o) => o.map((x) => x.textContent));
  assert.equal(opts[0], 'Automatic (best available)');
  assert.match(opts[1], /Aria Online.*★/);
  assert.equal(opts.some((t) => /Amelie/.test(t)), false);
  assert.match(opts.at(-1), /eSpeak/);
  assert.match(await page.textContent('#voice-current'), /Aria/);
  await page.click('#voice-preview');
  const last = await page.evaluate(() => window.__spoken.at(-1));
  assert.deepEqual([last.voice, /laughter/.test(last.text)], ['aria', true]);
  assert.deepEqual(errors, []);
  await context.close();
});

test('choosing a voice previews it, saves it, and practice then speaks with it', { skip }, async () => {
  const { page, context } = await open();
  await page.selectOption('#voice-select', 'plain');
  assert.equal((await page.evaluate(() => window.__spoken.at(-1))).voice, 'plain');
  assert.equal((await saved(page)).voiceURI, 'plain');
  await page.reload(); await page.waitForSelector('#voice-select');
  assert.equal(await page.inputValue('#voice-select'), 'plain');
  await page.click('button:text-is("Done")'); await page.click('.card'); await page.waitForSelector('#practice');
  await page.click('#practice'); await page.waitForSelector('#answer');
  assert.equal((await page.evaluate(() => window.__spoken.at(-1))).voice, 'plain');
  await context.close();
});

test('speed buttons save and apply; sound and music toggles save', { skip }, async () => {
  const { page, context } = await open();
  await page.click('.speed[data-rate="1.15"]');
  assert.equal(await page.getAttribute('.speed[data-rate="1.15"]', 'aria-pressed'), 'true');
  assert.equal((await page.evaluate(() => window.__spoken.at(-1))).rate, 1.15);
  assert.equal((await saved(page)).rate, 1.15);
  await page.uncheck('#sound-toggle'); await page.uncheck('#music-toggle');
  assert.deepEqual([(await saved(page)).sound, (await saved(page)).music], [false, false]);
  await context.close();
});

test('settings are reachable from the trainer picker too', { skip }, async () => {
  const context = await env.browser.newContext();
  await prepare(context, { state: null });
  const page = await context.newPage();
  await page.goto(env.server.url);
  await page.click('#settings-link');
  await page.waitForSelector('#voice-select');
  await page.click('button:text-is("Done")');
  await page.waitForSelector('.add-trainer');
  await context.close();
});

test('home has a Care & play tile that opens the practice buddy\'s care screen', { skip }, async () => {
  const { page, context } = await open();
  await page.click('button:text-is("Done")'); await page.waitForSelector('#care-tile');
  await page.click('#care-tile'); await page.waitForSelector('#care-feed');
  assert.match(await page.textContent('h1'), /Burrowby/);
  await context.close();
});
