import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, playSession } from './helpers.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

test('after one visit the game installs for offline: reload with no network and still play, saving progress', { skip }, async () => {
  const context = await env.browser.newContext({ reducedMotion: 'reduce', viewport: { width: 900, height: 1000 } });
  const errors = [];
  await prepare(context, { state: null, errors });
  const page = await context.newPage();
  await page.goto(env.server.url);
  await page.waitForSelector('.add-trainer');
  // wait for the service worker to take control and the cache to fill
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 });
  const cached = await page.evaluate(async () => (await caches.keys()).length && (await (await caches.open((await caches.keys())[0])).keys()).length);
  assert.ok(cached > 50, `only ${cached} files cached`);

  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('.add-trainer');                                   // the page itself loaded with no network
  assert.match(await page.textContent('#version-stamp'), /^Version \d{4}\./);
  await page.fill('input[name=name]', 'Offline Ollie'); await page.click('button[type=submit]');
  await page.waitForSelector('#practice');
  await playSession(page);                                                      // a full practice session, offline
  assert.match(await page.textContent('.results'), /first try/);
  await page.click('#done'); await page.waitForSelector('#practice');
  for (const route of ['sanctuary', 'book', 'trophies', 'settings']) { await page.goto(`${env.server.url}#/${route}`); await page.waitForSelector('.screen'); }
  const p = Object.values((await page.evaluate(() => JSON.parse(localStorage.getItem('spellbeasts.v1')))).profiles)[0];
  assert.equal(p.sessions.length, 1);                                           // saved while offline
  await context.setOffline(false);
  assert.deepEqual(errors.filter((e) => !/Failed to load resource|version\.json|net::ERR/i.test(e)), []);
  await context.close();
});

test('the manifest and icons are served, and a service worker is registered with the app scope', { skip }, async () => {
  const context = await env.browser.newContext();
  await prepare(context, { state: null });
  const page = await context.newPage();
  await page.goto(env.server.url);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 });
  const href = await page.getAttribute('link[rel=manifest]', 'href');
  const m = await (await page.request.get(new URL(href, env.server.url).href)).json();
  for (const i of m.icons) assert.equal((await page.request.get(new URL(i.src, env.server.url).href)).status(), 200, i.src);
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).scope);
  assert.equal(scope, env.server.url);
  await context.close();
});
