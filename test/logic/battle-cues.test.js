import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CUES, EVENTS, ANIMS, FX, MAX_CUE_MS, BANNER_MS, TAUNT_GAP_MS, TIRED_AT, stageEvent, restView, announce } from '../../js/logic/battle-cues.js';
import { POSES } from '../../js/assets/creatures.js';
import { createAudio } from '../../js/platform/audio.js';

const CSS = readFileSync(new URL('../../css/main.css', import.meta.url), 'utf8');
// @keyframes name -> body text
const keyframes = Object.fromEntries([...CSS.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)].map((m) => [m[1], m[2]]));

test('every battle event has a cue, and no cue is longer than one second', () => {
  assert.deepEqual(EVENTS.sort(), ['cheer', 'dodge', 'enter', 'escape', 'hit', 'oops', 'special', 'taunt', 'win-befriend', 'win-crickets']);
  assert.equal(MAX_CUE_MS, 1000);
  for (const [name, c] of Object.entries(CUES)) {
    assert.ok(c.ms > 0 && c.ms <= MAX_CUE_MS, `${name} lasts ${c.ms} ms`);
    assert.ok(c.wild && [c.wild.anim].flat().length >= 1, `${name}: the wild creature always reacts`);
    for (const side of [c.player, c.wild]) if (side) assert.ok(POSES.includes(side.pose), `${name}: pose ${side.pose}`);
    assert.ok(Array.isArray(c.fx));
  }
  assert.ok(CUES.enter.ms <= 1000);
  assert.ok(CUES.hit.ms <= 500, 'the everyday hit is quick');
  assert.ok(BANNER_MS <= 2000 && TAUNT_GAP_MS[0] >= 6000 && TAUNT_GAP_MS[1] <= 10000);
  assert.ok([CUES.dodge.wild.anim].flat().length >= 2, 'more than one way to dodge');
  assert.ok([CUES.taunt.wild.anim].flat().length >= 4, 'a set of taunts');
});
test('every battle sound exists', () => {
  const sounds = createAudio({ makeContext: () => null }).sounds;
  for (const [name, c] of Object.entries(CUES)) if (c.sound) assert.ok(sounds.includes(c.sound), `${name}: sound ${c.sound}`);
});

test('stylesheet: every cue animation has its keyframes and is wired to data-anim', () => {
  assert.ok(ANIMS.length >= 18);
  for (const a of ANIMS) {
    assert.ok(keyframes[`bs-${a}`], `@keyframes bs-${a}`);
    assert.match(CSS, new RegExp(`\\.bs-mover\\[data-anim="${a}"\\]\\s*\\{[^}]*animation-name:bs-${a};`), `data-anim="${a}" rule`);
  }
  for (const f of FX.filter((x) => !['heart', 'number', 'shake', 'rustle', 'hearts'].includes(x))) assert.ok(keyframes[`bs-${f}`], `@keyframes bs-${f}`);
  for (const k of ['bs-pop', 'bs-number', 'bs-shake', 'bs-rustle', 'bs-loveheart', 'bs-banner']) assert.ok(keyframes[k], k);
  assert.match(CSS, /\.bs-mover\[data-anim\]\s*\{[^}]*animation-duration:var\(--bs-ms/, 'cue length comes from --bs-ms');
});
test('stylesheet: battle animations move only transform, opacity and filter', () => {
  const battle = Object.entries(keyframes).filter(([name]) => name.startsWith('bs-'));
  assert.ok(battle.length >= 40, `${battle.length} battle keyframes`);
  for (const [name, body] of battle) {
    const props = [...body.matchAll(/\{([^{}]*)\}/g)].flatMap((m) => m[1].split(';').map((d) => d.split(':')[0].trim()).filter(Boolean));
    assert.ok(props.length > 0, name);
    for (const p of props) assert.ok(['transform', 'opacity', 'filter'].includes(p), `${name} animates ${p}`);
  }
});
test('stylesheet: the living idle covers wings, tails, flames, ears, eyes and sparkly parts', () => {
  for (const sel of ['.p-wings', '.p-bigwings', '.p-batwings', '.c-tail', '.tail-flame', '.p-flame', '.c-ears', '.c-eyes', '.p-stars', '.p-crystals', '.p-bubbles', '.p-lantern', '.p-bolts', '.p-antennae'])
    assert.match(CSS, new RegExp(`\\.bs-creature [^{]*${sel.replace('.', '\\.')}[^{]*\\{[^}]*animation:bs-`), `${sel} has an idle animation`);
  assert.match(CSS, /--bs-k/); assert.match(CSS, /--bs-d/);
});
test('stylesheet: reduced motion switches every battle animation off and hides the decorations', () => {
  const blocks = [...CSS.matchAll(/@media \(prefers-reduced-motion: reduce\)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)].map((m) => m[1]).join('\n');
  assert.match(blocks, /\*, \*::before, \*::after \{ animation:none !important;/);            // the game-wide switch
  assert.match(blocks, /\.bs-mover, \.bs-creature, \.bs-creature \*[^{]*\{ animation:none !important; \}/);
  assert.match(blocks, /\.bs-fx, \.bs-ghost \{ display:none; \}/);
});

test('stageEvent: a win picks the ending that matches the prize; everything else passes through', () => {
  assert.equal(stageEvent({ event: 'hit', justWon: false }), 'hit');
  assert.equal(stageEvent({ event: 'dodge', justWon: false }), 'dodge');
  assert.equal(stageEvent({ event: 'special', justWon: true, prize: { kind: 'befriend' } }), 'win-befriend');
  assert.equal(stageEvent({ event: 'hit', justWon: true, prize: { kind: 'crickets' } }), 'win-crickets');
  for (const e of ['hit', 'special', 'dodge', 'cheer', 'oops']) assert.ok(CUES[stageEvent({ event: e, justWon: false })]);
});
test('restView: poses, tiredness, the charge and where the wild creature stands', () => {
  assert.deepEqual(restView({ hearts: 10, heartsLeft: 10 }), { wildPose: 'ready', playerPose: 'ready', tired: false, charged: false, wildPlace: 'field', pips: 0 });
  assert.equal(TIRED_AT, 0.25);
  assert.equal(restView({ hearts: 10, heartsLeft: 3 }).tired, false);
  assert.equal(restView({ hearts: 10, heartsLeft: 2 }).tired, true);
  assert.equal(restView({ hearts: 3, heartsLeft: 1 }).tired, true);                         // tiny battles still show it on the last heart
  assert.equal(restView({ hearts: 10, heartsLeft: 0, won: true, prize: 'crickets' }).tired, false);
  assert.deepEqual([0, 1, 2].map((charge) => restView({ hearts: 10, heartsLeft: 8, charge }).charged), [false, false, true]);
  assert.deepEqual([0, 1, 2].map((charge) => restView({ hearts: 10, heartsLeft: 8, charge }).pips), [0, 1, 2]);
  const friend = restView({ hearts: 10, heartsLeft: 0, won: true, prize: 'befriend', charge: 2 });
  assert.deepEqual(friend, { wildPose: 'cheer', playerPose: 'cheer', tired: false, charged: false, wildPlace: 'joined', pips: 0 });
  assert.equal(restView({ hearts: 10, heartsLeft: 0, won: true, prize: 'crickets' }).wildPlace, 'field');
  assert.equal(restView({ hearts: 10, heartsLeft: 4, escaped: true }).wildPlace, 'gone');
});
test('announce: plain words for screen readers', () => {
  assert.equal(announce('enter', { name: 'Glowmoth', heartsLeft: 10 }), 'A wild Glowmoth appears! It has 10 hearts.');
  assert.equal(announce('hit', { name: 'Glowmoth', heartsLeft: 4, damage: 1 }), 'Hit! Glowmoth has 4 hearts left.');
  assert.equal(announce('hit', { name: 'Glowmoth', heartsLeft: 1, damage: 1 }), 'Hit! Glowmoth has 1 heart left.');
  assert.equal(announce('special', { name: 'Glowmoth', heartsLeft: 2, damage: 2 }), 'Special move! Two hearts gone. Glowmoth has 2 hearts left.');
  assert.match(announce('dodge', { name: 'Glowmoth', heartsLeft: 2 }), /dodged/);
  assert.match(announce('win-befriend', { name: 'Glowmoth' }), /friend/);
  assert.match(announce('win-crickets', { name: 'Glowmoth' }), /crickets/);
  assert.match(announce('escape', { name: 'Glowmoth' }), /keep everything/);
  assert.equal(announce('taunt', { name: 'Glowmoth' }), '');
});
