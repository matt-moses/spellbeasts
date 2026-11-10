import test from 'node:test';
import assert from 'node:assert/strict';
import { startBattle, battleTurn, wildHearts, cleanRunDamage, pickWild, prizeFor, arenaOpen, battleBonus, heartTier, battleBlock,
  ARENA_LEVEL, NEST_BEFRIEND_CHANCE, ARENA_CHANCE_NEW, ARENA_CHANCE_OWNED, WILD_STAGE_WEIGHTS } from '../../js/logic/battle.js';
import { startSession } from '../../js/logic/session.js';
import { freshState, freshProfile, migrate } from '../../js/logic/storage-schema.js';
import { addStarter } from '../../js/logic/collection.js';
import { parseBackup } from '../../js/logic/parent.js';
import { arenaSpeciesOf, speciesInRegion, REGIONS, ARENA_SPECIES } from '../../js/logic/species.js';
import { rng } from '../helpers.js';

const TODAY = '2026-11-05';
const dueStat = () => ({ box: 1, nextDue: '2026-11-04', correctDays: [], attempts: 1, firstTries: 1, firstTryCorrect: 0, lastMissed: '2026-11-04', lastBoxDate: '2026-11-04' });
// A level-3 trainer with a starter and 12 words due today.
function trainer({ words = 12, level = 3 } = {}) {
  const state = freshState();
  const profile = freshProfile({ name: 'T', avatarSpecies: 'burrowby', now: '2026-11-01T00:00:00Z' });
  addStarter(profile, 'burrowby', '2026-11-01T00:00:00Z');
  profile.level = level; profile.xp = level >= 3 ? 250 : 0;
  const list = state.wordLists.sample;
  profile.wordStats.sample = Object.fromEntries(list.words.slice(0, words).map((w) => [w.word, dueStat()]));
  return { profile, list };
}
const begin = (t, opts = {}) => { const r = startBattle({ profile: t.profile, list: t.list, today: TODAY, regionId: 'r1', rng: rng(opts.seed ?? 1), ...opts }); assert.equal(r.ok, true); return r.battle; };
// Plays a battle to the end. `answer(word, turnIndex)` returns true to spell it right.
function play(b, answer = () => true) {
  const turns = [];
  let i = 0;
  for (let w = b.next(); w; w = b.next()) {
    const ok = answer(w.word, i++);
    const r = b.submit(ok ? w.word : `${w.word}x`);
    turns.push(r);
    if (!r.correct) assert.equal(b.submitCorrection(w.word), true);
  }
  return { turns, result: b.finish() };
}

test('the Arena opens at level 3 and only in open lands', () => {
  assert.equal(ARENA_LEVEL, 3);
  const t = trainer({ level: 2 });
  assert.equal(arenaOpen(t.profile), false);
  assert.deepEqual(startBattle({ ...t, today: TODAY, regionId: 'r1' }), { ok: false, reason: 'level' });
  t.profile.level = 3;
  assert.equal(arenaOpen(t.profile), true);
  assert.equal(battleBlock(t.profile, 'r1'), null);
  assert.equal(startBattle({ ...t, today: TODAY, regionId: 'r2' }).reason, 'locked');
  assert.equal(startBattle({ ...t, today: TODAY, regionId: 'nope' }).reason, 'locked');
  t.profile.creatures = [];
  assert.equal(startBattle({ ...t, today: TODAY, regionId: 'r1' }).reason, 'creature');
});

test('heart maths: a hit takes 1, every third in a row takes 2, a miss takes none', () => {
  let s = { heartsLeft: 12, won: false };
  const step = (correct, streak) => { const r = battleTurn(s, { correct, streak }); s = { heartsLeft: r.heartsLeft, won: s.won || r.justWon }; return r; };
  assert.deepEqual(step(true, 1), { event: 'hit', damage: 1, heartsLeft: 11, charge: 1, justWon: false });
  assert.deepEqual(step(true, 2), { event: 'hit', damage: 1, heartsLeft: 10, charge: 2, justWon: false });
  assert.deepEqual(step(true, 3), { event: 'special', damage: 2, heartsLeft: 8, charge: 0, justWon: false });
  assert.deepEqual(step(false, 0), { event: 'dodge', damage: 0, heartsLeft: 8, charge: 0, justWon: false });
  assert.equal(step(true, 1).event, 'hit');
  assert.equal(step(true, 2).event, 'hit');
  assert.equal(step(true, 3).event, 'special');
  assert.equal(step(true, 4).event, 'hit');
  assert.equal(step(true, 5).event, 'hit');
  assert.equal(step(true, 6).event, 'special');          // run of 6 is special again, 4 and 5 were not
  assert.equal(s.heartsLeft, 0); assert.equal(s.won, true);
});
test('hearts never go below zero, and the special is clipped to what is left', () => {
  const r = battleTurn({ heartsLeft: 1, won: false }, { correct: true, streak: 3 });
  assert.deepEqual([r.event, r.damage, r.heartsLeft, r.justWon], ['special', 1, 0, true]);
});
test('after the win every answer is a victory-lap cheer (or a harmless oops) with no damage', () => {
  assert.deepEqual(battleTurn({ heartsLeft: 0, won: true }, { correct: true, streak: 3 }), { event: 'cheer', damage: 0, heartsLeft: 0, charge: 0, justWon: false });
  assert.equal(battleTurn({ heartsLeft: 0, won: true }, { correct: false, streak: 0 }).event, 'oops');
});

test('wildHearts: a clean run always wins, never too early, and later lands are tougher', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map(heartTier), [0, 0, 0, 1, 1, 1, 2, 2, 2]);
  assert.equal(wildHearts(10, 0), 10); assert.equal(wildHearts(10, 4), 11); assert.equal(wildHearts(12, 8), 14);
  for (let words = 1; words <= 12; words++) for (let land = 0; land < 9; land++) {
    const hearts = wildHearts(words, land);
    assert.ok(hearts >= 1 && cleanRunDamage(words) >= hearts, `clean run wins: ${words} words, land ${land}`);
    let n = 1; while (cleanRunDamage(n) < hearts) n++;
    if (words >= 6) assert.ok(n >= Math.ceil((2 * words) / 3), `win on answer ${n} of ${words} (land ${land}) is too early`);
    assert.ok(wildHearts(words, land) >= wildHearts(words, 0));
  }
});

test('a clean battle: hearts fall 1, 1, 2, the win lands, and the rest is a victory lap that plays every word', () => {
  const t = trainer();
  const b = begin(t, { wild: { species: 'thistlefox', stage: 1, arenaOnly: false } });
  const total = b.total;
  assert.ok(total >= 10 && total <= 12);
  assert.equal(b.hearts, total);
  const { turns, result } = play(b);
  assert.equal(turns.length, total);                                       // nothing was cut short
  assert.deepEqual(turns.slice(0, 3).map((r) => r.battle.damage), [1, 1, 2]);
  assert.deepEqual(turns.slice(0, 3).map((r) => r.battle.charge), [1, 2, 0]);
  const winAt = turns.findIndex((r) => r.battle.justWon);
  let n = 1; while (cleanRunDamage(n) < total) n++;
  assert.equal(winAt, n - 1);
  assert.ok(winAt < total - 1, 'there is a victory lap');
  for (const r of turns.slice(winAt + 1)) assert.deepEqual([r.battle.event, r.battle.damage, r.battle.heartsLeft], ['cheer', 0, 0]);
  let left = total;
  for (const r of turns) { assert.ok(r.battle.heartsLeft <= left); left = r.battle.heartsLeft; }
  assert.equal(result.battle.outcome, 'won');
  assert.equal(result.words, total);
  assert.equal(t.profile.sessions.at(-1).mode, 'battle');
  assert.equal(t.profile.battlesWon, 1);
  assert.deepEqual(t.profile.arena.wins, { r1: 1 });
  assert.equal(b.finish(), result);                                        // finishing twice pays once
  assert.equal(t.profile.battlesWon, 1);
});

test('a miss: the wild creature dodges, the run resets and the word comes back', () => {
  const t = trainer();
  const b = begin(t);
  const first = b.next();
  const r = b.submit('zzz');
  assert.deepEqual([r.correct, r.battle.event, r.battle.damage, r.battle.heartsLeft, r.requeued], [false, 'dodge', 0, b.hearts, true]);
  assert.equal(b.mode, 'correcting');
  assert.equal(b.submitCorrection(first.word), true);
  const seen = [];
  for (let w = b.next(); w; w = b.next()) { seen.push(w.word); b.submit(w.word); }
  assert.ok(seen.includes(first.word), 'the missed word returned');
  assert.equal(b.finish().battle.outcome, 'won');
});

test('escape: if the words run out first the creature gets away and nothing is lost', () => {
  const t = trainer(), plain = structuredClone(t.profile);
  const b = begin(t, { seed: 7 });
  const { turns, result } = play(b, () => false);                          // every word is given up after 4 tries
  assert.ok(turns.every((r) => r.battle.event === 'dodge'));
  assert.equal(result.battle.outcome, 'escaped');
  assert.equal(result.battle.prize, null);
  assert.equal(result.battle.heartsLeft, b.hearts);
  assert.equal(t.profile.battlesWon, 0);
  assert.deepEqual(t.profile.arena.wins, {});
  // identical to plain practice with the same answers
  const s = startSession({ profile: plain, list: t.list, today: TODAY, rng: rng(7) });
  for (let w = s.next(); w; w = s.next()) { s.submit(`${w.word}x`); s.submitCorrection(w.word); }
  const sum = s.finish();
  assert.equal(result.crickets, sum.crickets); assert.equal(result.xp, sum.xp);
  assert.equal(t.profile.crickets, plain.crickets); assert.equal(t.profile.xp, plain.xp);
});

test('prize: an arena-only creature always joins the first time, at stage 1', () => {
  const t = trainer();
  const b = begin(t, { wild: { species: 'cloverknight', stage: 3, arenaOnly: true } });
  const before = t.profile.crickets;
  const { result } = play(b);
  assert.deepEqual(result.battle.prize, { kind: 'befriend', species: 'cloverknight', crickets: 0 });
  const c = t.profile.creatures.find((x) => x.species === 'cloverknight');
  assert.ok(c); assert.equal(c.stage, 1); assert.equal(c.origin, 'arena'); assert.equal(result.battle.creatureId, c.id);
  assert.deepEqual(t.profile.arena.befriended, ['cloverknight']);
  assert.equal(t.profile.crickets - before, result.crickets);              // no cricket bonus on top
  // the second time it pays crickets instead and no second creature joins
  t.profile.wordStats.sample = Object.fromEntries(t.list.words.slice(0, 12).map((w) => [w.word, dueStat()]));
  const b2 = begin(t, { wild: { species: 'cloverknight', stage: 1, arenaOnly: true } });
  const mid = t.profile.crickets;
  const r2 = play(b2).result;
  assert.deepEqual(r2.battle.prize, { kind: 'crickets', species: 'cloverknight', crickets: battleBonus(0) });
  assert.equal(t.profile.crickets - mid, r2.crickets + battleBonus(0));
  assert.equal(t.profile.creatures.filter((x) => x.species === 'cloverknight').length, 1);
});
test('prize: an egg species you do not own joins 25% of the time, otherwise it pays crickets that grow by land', () => {
  assert.equal(NEST_BEFRIEND_CHANCE, 0.25);
  const r = rng(11);
  let joined = 0;
  for (let i = 0; i < 10000; i++) if (prizeFor({ species: 'glowmoth', owned: new Set(), landIndex: 0, rng: r }).kind === 'befriend') joined++;
  assert.ok(Math.abs(joined / 10000 - 0.25) < 0.02, `befriend rate ${joined / 10000}`);
  assert.deepEqual(prizeFor({ species: 'glowmoth', owned: new Set(['glowmoth']), landIndex: 0, rng: () => 0 }), { kind: 'crickets', species: 'glowmoth', crickets: 5 });
  assert.deepEqual(prizeFor({ species: 'glowmoth', owned: new Set(), landIndex: 4, rng: () => 0.25 }), { kind: 'crickets', species: 'glowmoth', crickets: 13 });
  assert.equal(prizeFor({ species: 'glowmoth', owned: new Set(), landIndex: 4, rng: () => 0.249 }).kind, 'befriend');
  assert.deepEqual([0, 4, 8].map(battleBonus), [5, 13, 21]);
  for (const s of ARENA_SPECIES) assert.equal(prizeFor({ species: s.id, owned: new Set(), landIndex: 0, rng: () => 0.99 }).kind, 'befriend');
});

test('pickWild: only that land\'s creatures, with the documented weights', () => {
  for (const region of REGIONS) {
    const arena = arenaSpeciesOf(region.id), nest = Object.values(speciesInRegion(region.id));
    for (const [owned, chance] of [[new Set(), ARENA_CHANCE_NEW], [new Set([arena]), ARENA_CHANCE_OWNED]]) {
      const r = rng(region.id.charCodeAt(1) * 31 + owned.size), count = {}, stages = [0, 0, 0];
      const N = 10000;
      for (let i = 0; i < N; i++) { const w = pickWild({ regionId: region.id, owned, rng: r }); count[w.species] = (count[w.species] ?? 0) + 1; stages[w.stage - 1]++; assert.equal(w.arenaOnly, w.species === arena); }
      assert.deepEqual(Object.keys(count).sort(), [arena, ...nest].sort(), region.id);
      assert.ok(Math.abs(count[arena] / N - chance) < 0.02, `${region.id} arena share ${count[arena] / N}`);
      for (const id of nest) assert.ok(Math.abs(count[id] / N - (1 - chance) / 3) < 0.02, `${id} share ${count[id] / N}`);
      WILD_STAGE_WEIGHTS.forEach((wt, i) => assert.ok(Math.abs(stages[i] / N - wt) < 0.02, `stage ${i + 1} share`));
    }
  }
});

test('the win is kept the moment the last heart goes, even if the victory lap is never finished', () => {
  const t = trainer();
  const b = begin(t, { wild: { species: 'cloverknight', stage: 1, arenaOnly: true } });
  let won = null;
  for (let w = b.next(); w && !won; w = b.next()) { const r = b.submit(w.word); if (r.battle.justWon) won = r; }
  assert.deepEqual(won.battle.prize, { kind: 'befriend', species: 'cloverknight', crickets: 0 });
  assert.equal(b.won, true); assert.equal(b.prize, won.battle.prize);
  assert.equal(t.profile.battlesWon, 1);                                    // already saved, before finish()
  assert.ok(t.profile.creatures.some((c) => c.species === 'cloverknight'));
  assert.deepEqual(t.profile.arena.wins, { r1: 1 });
  assert.equal(t.profile.sessions.length, 0);                              // the session itself is not over yet
});

test('Champion fires on the 10th win and only once', () => {
  const t = trainer();
  t.profile.battlesWon = 8;
  const again = () => { t.profile.wordStats.sample = Object.fromEntries(t.list.words.slice(0, 12).map((w) => [w.word, dueStat()])); return play(begin(t, { wild: { species: 'burrowby', stage: 1, arenaOnly: false } })).result; };
  assert.ok(!again().trophies.includes('champion'));
  const tenth = again();
  assert.equal(t.profile.battlesWon, 10);
  assert.ok(tenth.trophies.includes('champion'));
  assert.equal(t.profile.trophies.champion, TODAY);
  assert.ok(!again().trophies.includes('champion'));
});

test('the chosen creature fights; with none chosen the companion does', () => {
  const t = trainer();
  t.profile.creatures.push({ id: 'c2', species: 'glowmoth', stage: 2, fed: 0, hearts: 0 });
  assert.equal(begin(t).fighter.species, 'burrowby');
  const b = begin(t, { creatureId: 'c2' });
  assert.equal(b.fighter.species, 'glowmoth');
  assert.equal(t.profile.arena.lastCreature, 'c2');
  assert.deepEqual(play(b).result.battle.fighter, { species: 'glowmoth', stage: 2 });
});

test('nothing due: the battle uses the Bonus review words; no seen words means no battle', () => {
  const t = trainer({ words: 15 });
  for (const s of Object.values(t.profile.wordStats.sample)) s.nextDue = '2026-12-01';   // every word seen, none due, none new
  assert.equal(startSession({ profile: structuredClone(t.profile), list: t.list, today: TODAY, rng: rng(1) }), null);
  const b = begin(t);
  assert.ok(b.total >= 10);
  assert.equal(play(b).result.battle.outcome, 'won');
  assert.equal(t.profile.sessions.at(-1).mode, 'battle');
  const empty = trainer({ words: 0 });
  empty.list.words = [];
  assert.deepEqual(startBattle({ ...empty, today: TODAY, regionId: 'r1' }), { ok: false, reason: 'words' });
});

// ---- parity with plain practice
const script = (seed, accuracy) => { const r = rng(seed * 977 + 5); return () => r() < accuracy; };
function runBoth(seed, accuracy) {
  const t = trainer({ words: 9 + (seed % 7) });
  if (seed % 3 === 0) t.profile.eggs.push({ id: 'e1', regionId: 'r1', progress: 0, needed: 10 });
  const plain = structuredClone(t.profile);
  const b = begin(t, { seed });
  const a1 = script(seed, accuracy), a2 = script(seed, accuracy);
  const { turns, result } = play(b, () => a1());
  const s = startSession({ profile: plain, list: t.list, today: TODAY, rng: rng(seed) });
  const plainTurns = [];
  for (let w = s.next(); w; w = s.next()) { const ok = a2(); const r = s.submit(ok ? w.word : `${w.word}x`); plainTurns.push(r); if (!r.correct) s.submitCorrection(w.word); }
  return { t, plain, turns, plainTurns, result, sum: s.finish(), b };
}
function assertParity({ t, plain, turns, plainTurns, result, sum }, label) {
  assert.equal(turns.length, plainTurns.length, label);
  turns.forEach((r, i) => { const { battle, ...rest } = r; assert.deepEqual(rest, plainTurns[i], `${label} turn ${i}`); assert.ok(battle); });
  const p = t.profile, prize = result.battle.prize;
  for (const key of ['wordStats', 'map', 'eggs', 'streak', 'xp', 'level', 'berries', 'care', 'eggsHatched']) assert.deepEqual(p[key], plain[key], `${label}: ${key}`);
  assert.equal(p.crickets - (prize?.crickets ?? 0), plain.crickets, `${label}: crickets`);
  assert.equal(p.creatures.length - (prize?.kind === 'befriend' ? 1 : 0), plain.creatures.length, `${label}: creatures`);
  assert.deepEqual(p.sessions.map((s) => ({ ...s, mode: 'practice' })), plain.sessions, `${label}: sessions`);
  for (const key of Object.keys(sum)) if (key !== 'trophies') assert.deepEqual(result[key], sum[key], `${label}: summary.${key}`);
  for (const id of sum.trophies) assert.ok(result.trophies.includes(id), `${label}: trophy ${id}`);
}
test('parity: a battle and a practice session with the same answers leave identical word stats, rewards and progress', () => {
  for (const [seed, acc] of [[1, 1], [2, 0.8], [3, 0.5], [4, 0], [5, 0.9]]) assertParity(runBoth(seed, acc), `seed ${seed} acc ${acc}`);
});
test('fuzz: 500 random battles keep every invariant', () => {
  let won = 0;
  for (let seed = 1; seed <= 500; seed++) {
    const acc = [0.3, 0.6, 0.8, 0.95, 1][seed % 5];
    const run = runBoth(seed, acc);
    assertParity(run, `fuzz ${seed}`);
    let left = run.b.hearts, wins = 0;
    for (const r of run.turns) {
      const x = r.battle;
      assert.ok(x.heartsLeft >= 0 && x.heartsLeft <= left, `fuzz ${seed}: hearts only fall`);
      assert.ok(x.damage >= 0 && x.damage <= 2 && left - x.heartsLeft === x.damage);
      assert.ok(['hit', 'special', 'dodge', 'cheer', 'oops'].includes(x.event));
      assert.equal(r.correct, ['hit', 'special', 'cheer'].includes(x.event));
      assert.ok(x.charge >= 0 && x.charge <= 2);
      if (x.justWon) wins++;
      left = x.heartsLeft;
    }
    const out = run.result.battle.outcome;
    assert.ok(out === 'won' || out === 'escaped');
    assert.equal(wins, out === 'won' ? 1 : 0);
    assert.equal(out === 'won', left === 0);
    assert.equal(run.t.profile.battlesWon, out === 'won' ? 1 : 0);
    if (out === 'won') won++;
  }
  assert.ok(won > 350, `most battles are won (${won} of 500)`);
});

test('saved data: older profiles gain the battle fields, and a backup keeps them', () => {
  const { state } = migrate({ version: 1, settings: {}, wordLists: {}, profiles: { p1: { name: 'Sam', avatarSpecies: 'burrowby', crickets: 7 } } });
  assert.equal(state.profiles.p1.battlesWon, 0);
  assert.deepEqual(state.profiles.p1.arena, { befriended: [], wins: {}, lastCreature: null });
  assert.equal(state.profiles.p1.crickets, 7);
  const t = trainer();
  play(begin(t, { wild: { species: 'cloverknight', stage: 1, arenaOnly: true } }));
  const s = freshState(); s.profiles.p1 = t.profile;
  const back = parseBackup(JSON.stringify(s));
  const restored = (back.state ?? back).profiles.p1;
  assert.equal(restored.battlesWon, 1);
  assert.deepEqual(restored.arena.befriended, ['cloverknight']);
  assert.ok(restored.creatures.some((c) => c.species === 'cloverknight'));
});
