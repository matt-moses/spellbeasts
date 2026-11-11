import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch } from './helpers.js';
import { SPECIES } from '../../js/logic/species.js';
import { creatureSvg, POSES } from '../../js/assets/creatures.js';

const skip = hasBrowser ? false : 'no Chromium found';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

test('every creature SVG (3 stages each) are well-formed XML, self-contained and actually draw something', { skip }, async () => {
  const svgs = SPECIES.flatMap((s) => [1, 2, 3].map((st) => ({ id: `${s.id}-${st}`, svg: creatureSvg(s.id, st) })));
  assert.equal(svgs.length, SPECIES.length * 3);
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
  assert.equal(sizes.length, SPECIES.length * 3);
  for (const [w, h] of sizes) assert.ok(w > 30 && h > 30, `tiny drawing ${w}x${h}`);
  await page.close();
});

test('stages differ: every species changes between stage 1, 2 and 3', { skip }, () => {
  for (const s of SPECIES) {
    const [a, b, c] = [1, 2, 3].map((st) => creatureSvg(s.id, st));
    assert.notEqual(a, b, s.id); assert.notEqual(b, c, s.id);
  }
});

const GROUPS = ['idle', 'c-glow', 'c-pose', 'c-back', 'c-tail', 'c-ears', 'c-feet', 'c-body', 'c-front', 'c-face', 'c-eyes', 'c-mouth'];
test('battle poses: every species, stage and pose (species x 3 x 7), facing both ways, is valid, fully grouped and stays in its box', { skip }, async () => {
  assert.equal(POSES.length, 7);
  const items = SPECIES.flatMap((s) => [1, 2, 3].flatMap((st) => POSES.flatMap((pose) => [false, true].map((flip) => ({ id: `${s.id}-${st}-${pose}${flip ? '-flip' : ''}`, svg: creatureSvg(s.id, st, { pose, flip, size: 100 }) })))));
  assert.equal(items.length, SPECIES.length * 3 * 7 * 2);
  for (const { id, svg } of items) {
    assert.doesNotMatch(svg, /<image|<script|href=|url\(|http/i, id);
    assert.doesNotMatch(svg, /NaN|undefined/, id);
  }
  const page = await env.browser.newPage();
  const bad = await page.evaluate(({ items, GROUPS }) => items.flatMap(({ id, svg }) => {
    const doc = new DOMParser().parseFromString(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '), 'image/svg+xml');
    if (doc.querySelector('parsererror')) return [`${id}: invalid XML`];
    return GROUPS.filter((g) => doc.getElementsByClassName(g).length !== 1).map((g) => `${id}: group ${g}`);
  }), { items, GROUPS });
  assert.deepEqual(bad, []);
  // Drawn at 100px inside a 220px cell: the whole drawing (it may overflow its own view box a little) must stay well inside the cell.
  await page.setContent(`<style>.cell{width:220px;height:220px;display:inline-flex;align-items:center;justify-content:center}</style>${items.map((x) => `<div class="cell" data-id="${x.id}">${x.svg}</div>`).join('')}`);
  const out = await page.evaluate(() => [...document.querySelectorAll('.cell')].flatMap((cell) => {
    const c = cell.getBoundingClientRect(), b = cell.querySelector('.idle').getBoundingClientRect();
    if (b.width < 30 || b.height < 30) return [`${cell.dataset.id}: tiny`];
    return b.left < c.left + 20 || b.right > c.right - 20 || b.top < c.top + 20 || b.bottom > c.bottom - 20 ? [`${cell.dataset.id}: spills ${Math.round(b.left - c.left)},${Math.round(b.top - c.top)},${Math.round(c.right - b.right)},${Math.round(c.bottom - b.bottom)}`] : [];
  }));
  assert.deepEqual(out, []);
  await page.close();
});
test('battle poses: each pose changes the drawing, and the default drawing is untouched by the pose option', { skip }, () => {
  for (const s of SPECIES) for (const st of [1, 2, 3]) {
    const plain = creatureSvg(s.id, st);
    assert.equal(creatureSvg(s.id, st, { pose: null, flip: false }), plain);
    const seen = new Set([plain]);
    for (const pose of POSES) { const svg = creatureSvg(s.id, st, { pose }); assert.ok(!seen.has(svg), `${s.id}-${st}-${pose} repeats another drawing`); seen.add(svg); assert.match(svg, new RegExp(`pose-${pose}`)); }
    assert.notEqual(creatureSvg(s.id, st, { flip: true }), plain);
  }
});
