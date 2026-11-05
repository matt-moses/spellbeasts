import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hasBrowser, launch, prepare } from './helpers.js';
import { isNewer } from '../../js/ui/update.js';
import { BUILD_VERSION } from '../../js/logic/build.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

test('version.json and the built-in version always match (the pre-commit hook keeps them in step)', () => {
  assert.equal(JSON.parse(readFileSync(new URL('../../version.json', import.meta.url))).version, BUILD_VERSION);
  assert.match(BUILD_VERSION, /^\d{4}\.\d{4}\.\d{4}$/);
});
test('isNewer only reports a real, different version', () => {
  assert.equal(isNewer('2', '1'), true);
  for (const v of ['1', '', null, undefined, 5]) assert.equal(isNewer(v, '1'), false, String(v));
});
test('the page shows its version, and offers a reload only when the site has a newer one', { skip }, async () => {
  const same = await env.browser.newContext(); await prepare(same, { state: null });
  const a = await same.newPage(); await a.goto(env.server.url);
  assert.equal(await a.textContent('#version-stamp'), `Version ${BUILD_VERSION}`);
  await a.waitForTimeout(500);
  assert.equal(await a.locator('#update-bar').count(), 0);
  await same.close();

  const newer = await env.browser.newContext(); await prepare(newer, { state: null });
  await newer.route('**/version.json*', (r) => r.fulfill({ contentType: 'application/json', body: '{"version":"9999.0101.0000"}' }));
  const b = await newer.newPage(); await b.goto(env.server.url);
  await b.waitForSelector('#update-bar');
  assert.match(await b.textContent('#update-bar'), /new version/i);
  await newer.close();
});
