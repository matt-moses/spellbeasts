// New creatures must look like their own animals, not recolours (plan.md Phase 2). Checked on the recipes, not the pixels.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.SPELLBEASTS_LANDS = 12;
const { SPECIES } = await import('../../js/logic/species.js');
const { ART_KEYS, PART_NAMES } = await import('../../js/assets/creatures.js');

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
const NEW = new Set(['r10', 'r11', 'r12']);
const shape = (s) => `${s.art.body}/${s.art.ears}/${s.art.tail}`;      // the outline; the face alone does not make a different animal
const stagesOf = (s) => ['s1', 's2', 's3'].flatMap((k) => s.art[k] ?? []);

test('every recipe uses only parts that exist', () => {
  for (const s of SPECIES) {
    assert.ok(ART_KEYS.body.includes(s.art.body), `${s.id} body`);
    assert.ok(ART_KEYS.ears.includes(s.art.ears), `${s.id} ears`);
    assert.ok(ART_KEYS.tail.includes(s.art.tail), `${s.id} tail`);
    assert.ok(ART_KEYS.face.includes(s.art.face), `${s.id} face`);
    for (const p of stagesOf(s)) assert.ok(PART_NAMES.has(p), `${s.id} part ${p}`);
  }
});
test('a new creature never shares its outline (body, ears, tail) with a creature of a similar colour', () => {
  const clashes = [];
  for (const n of SPECIES.filter((s) => NEW.has(s.region))) for (const o of SPECIES) {
    if (o === n || (NEW.has(o.region) && o.id < n.id)) continue;
    if (shape(n) === shape(o) && dist(n.art.pal[0], o.art.pal[0]) < 100) clashes.push(`${n.id} ~ ${o.id} (${shape(n)}, colour ${Math.round(dist(n.art.pal[0], o.art.pal[0]))})`);
  }
  assert.deepEqual(clashes, []);
});
test('a new creature does not share its whole outline (body, ears, tail) with another one of the same land', () => {
  for (const r of NEW) {
    const own = SPECIES.filter((s) => s.region === r);
    const seen = own.map((s) => `${s.art.body}/${s.art.ears}/${s.art.tail}`);
    assert.equal(new Set(seen).size, own.length, r);
  }
});
test('the four creatures of a land are clearly different colours', () => {
  for (const r of NEW) {
    const own = SPECIES.filter((s) => s.region === r);
    for (let i = 0; i < own.length; i++) for (let j = i + 1; j < own.length; j++) assert.ok(dist(own[i].art.pal[0], own[j].art.pal[0]) >= 70, `${own[i].id} / ${own[j].id}`);
  }
});
test('each new creature adds something at every stage, and the rare and arena ones carry a crown or wings by stage 3', () => {
  for (const s of SPECIES.filter((x) => NEW.has(x.region))) {
    assert.ok((s.art.s2 ?? []).length >= 1 && (s.art.s3 ?? []).length >= 2, s.id);
    if (s.rarity === 'rare' || s.rarity === 'arena') assert.ok(s.art.s3.some((p) => ['crown', 'bigwings', 'wings'].includes(p)), `${s.id} stage 3`);
  }
});
