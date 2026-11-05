import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BUILD_VERSION } from '../../js/logic/build.js';
import { loadAnalytics } from '../../js/platform/analytics.js';

const root = new URL('../../', import.meta.url).pathname;
const swAssets = (() => { const self = {}; new Function('self', readFileSync(join(root, 'sw-assets.js'), 'utf8'))(self); return self; })();
const walk = (dir) => readdirSync(join(root, dir)).flatMap((f) => { const rel = `${dir}/${f}`; return statSync(join(root, rel)).isDirectory() ? walk(rel) : [rel]; });

test('the offline file list is in step with the version and covers every app file', () => {
  assert.equal(swAssets.SW_VERSION, BUILD_VERSION);
  for (const a of swAssets.SW_ASSETS) assert.ok(a === './' || existsSync(join(root, a)), `listed but missing: ${a}`);
  for (const f of [...walk('js'), ...walk('css'), ...walk('data'), ...walk('icons'), 'index.html', 'manifest.webmanifest']) assert.ok(swAssets.SW_ASSETS.includes(f), `not cached for offline: ${f}`);
  assert.ok(!swAssets.SW_ASSETS.some((a) => /^(test|docs|tools|node_modules)\//.test(a)));
});
test('every module the app imports is in the offline list', () => {
  const missing = [];
  for (const f of walk('js')) {
    const src = readFileSync(join(root, f), 'utf8');
    for (const m of src.matchAll(/from\s+'(\.[^']+)'/g)) {
      const target = join(f, '..', m[1]).replace(/\\/g, '/');
      const norm = target.split('/').reduce((a, p) => (p === '..' ? a.slice(0, -1) : p === '.' ? a : [...a, p]), []).join('/');
      if (!swAssets.SW_ASSETS.includes(norm)) missing.push(`${f} -> ${norm}`);
    }
  }
  assert.deepEqual(missing, []);
});
test('the manifest is installable: name, scope, standalone, 192 and 512 icons and a maskable one that exist', () => {
  const m = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
  assert.equal(m.display, 'standalone'); assert.ok(m.name && m.short_name); assert.equal(m.start_url, './');
  const sizes = m.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
  for (const i of m.icons) assert.ok(existsSync(join(root, i.src)), i.src);
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  for (const needle of ['rel="manifest"', 'theme-color', 'apple-touch-icon']) assert.ok(html.includes(needle), needle);
});

// ---- Cloudflare Web Analytics
const fakeDoc = () => { const added = []; return { added, createElement: () => ({ dataset: {} }), head: { append: (s) => added.push(s) } }; };
const T = 'abc123';
test('analytics loads once, only on the live host, with a token, and not under Do Not Track', () => {
  const live = fakeDoc();
  assert.equal(loadAnalytics({ doc: live, hostname: 'matt-moses.github.io', token: T, dnt: null }), true);
  assert.equal(live.added.length, 1);
  assert.equal(live.added[0].src, 'https://static.cloudflareinsights.com/beacon.min.js');
  assert.deepEqual(JSON.parse(live.added[0].dataset.cfBeacon), { token: T });
  for (const [hostname, token, dnt] of [['localhost', T, null], ['127.0.0.1', T, null], ['evil.example', T, null], ['matt-moses.github.io', '', null], ['matt-moses.github.io', T, '1'], ['matt-moses.github.io', T, 'yes']]) {
    const d = fakeDoc(); assert.equal(loadAnalytics({ doc: d, hostname, token, dnt }), false, `${hostname} ${token} ${dnt}`); assert.equal(d.added.length, 0);
  }
});
test('analytics is off until a real token is configured, and never receives game data', async () => {
  const { CF_BEACON_TOKEN } = await import('../../js/config.js');
  assert.match(CF_BEACON_TOKEN, /^([0-9a-f]{32})?$/);
  const code = readFileSync(join(root, 'js/platform/analytics.js'), 'utf8').replace(/\/\/.*$/gm, '');   // code only, not comments
  assert.doesNotMatch(code, /localStorage|profile|word|store/i);
});
