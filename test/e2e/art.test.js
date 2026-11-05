import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch } from './helpers.js';
import { SPECIES } from '../../js/logic/species.js';
import { creatureSvg } from '../../js/assets/creatures.js';

const skip = hasBrowser ? false : 'no Chromium found';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

test('all 81 creature SVGs are well-formed XML, self-contained and actually draw something', { skip }, async () => {
  const svgs = SPECIES.flatMap((s) => [1, 2, 3].map((st) => ({ id: `${s.id}-${st}`, svg: creatureSvg(s.id, st) })));
  assert.equal(svgs.length, 81);
  for (const { id, svg } of svgs) {                       // cheap static rules
    assert.match(svg, /viewBox="0 0 100 100"/, id);
    assert.doesNotMatch(svg, /<image|<script|href=|url\(|http/i, id);
  }
  const page = await env.browser.newPage();
  const bad = await page.evaluate((items) => items.flatMap(({ id, svg }) => {
    const doc = new DOMParser().parseFromString(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '), 'image/svg+xml');
    return doc.querySelector('parsererror') ? [`${id}: invalid XML`] : [];
  }), svgs);
  assert.deepEqual(bad, []);
  await page.setContent(`<div id="g">${svgs.map((x) => x.svg).join('')}</div>`);
  const sizes = await page.evaluate(() => [...document.querySelectorAll('#g svg')].map((s) => { const b = s.querySelector('.idle').getBBox(); return [b.width, b.height]; }));
  assert.equal(sizes.length, 81);
  for (const [w, h] of sizes) assert.ok(w > 30 && h > 30, `tiny drawing ${w}x${h}`);
  await page.close();
});

test('stages differ: every species changes between stage 1, 2 and 3', { skip }, () => {
  for (const s of SPECIES) {
    const [a, b, c] = [1, 2, 3].map((st) => creatureSvg(s.id, st));
    assert.notEqual(a, b, s.id); assert.notEqual(b, c, s.id);
  }
});
