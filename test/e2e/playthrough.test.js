// A whole-game playthrough through the real UI, checked against an INDEPENDENT model of the PRD rules.
// ~2 weeks of simulated days (with skipped days), misses, capitalization slips, eggs, feeding, evolving, chests.
// Nothing here imports game logic: the oracle below re-derives every number from the PRD.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare } from './helpers.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

// ---------------------------------------------------------------- the oracle (PRD rules, re-derived)
const SAMPLE = ['garden', 'rainbow', 'whisper', 'island', 'library', 'Monday', 'February', 'thunder', 'bicycle', 'mountain', 'kitchen', 'Canada', 'pencil', 'window', 'journey'];
const PRICE = [20, 30, 40, 50, 60, 75, 90, 105, 125];
const UNLOCK = [[1, 0], [2, 0], [4, 5], [6, 15], [8, 25], [10, 40], [12, 44], [14, 47], [16, 50]];
const TRAIL_END = [30, 32, 34, 36, 38, 40, 42, 44, 46].reduce((a, n) => [...a, (a.at(-1) ?? 0) + n], []);   // each land's stretch of trail is longer
const RARE = new Set(['Glowmoth', 'Mossgolem', 'Stormwyrm', 'Starcub', 'Inkwell', 'Skycalf', 'Gemdrake', 'Sandwyrm', 'Solphoenix']);
const BOX_DAYS = [0, 2, 4, 7, 14];                                   // box 1..5 -> days until due
const TROPHY_NAMES = { 'first-hatch': 'First Hatch', 'capital-idea': 'Capital Idea', comeback: 'Comeback', 'perfect-flight': 'Perfect Flight', 'busy-bee': 'Busy Bee', 'sessions-25': 'Practice Pro', 'sessions-50': 'Super Bee', 'perfect-5': 'Flawless Five', 'streak-10': 'Streak of 10', 'streak-20': 'Unstoppable', 'first-try-100': 'Sharp Speller', 'first-try-500': 'Word Wizard', 'mastered-10': '10 Mastered', 'mastered-25': '25 Mastered', 'mastered-50': '50 Mastered', 'word-master': 'Word Master', 'day-streak-3': '3-Day Streak', 'day-streak-7': '7-Day Streak', 'day-streak-14': 'Fortnight Fan', 'day-streak-30': 'Month of Magic', 'level-5': 'Rising Star', 'level-10': 'Trainer Pro', 'level-15': 'Legend', 'explorer-3': 'Trailblazer', 'explorer-6': 'Adventurer', 'explorer-9': 'World Traveler', 'walk-50': 'Long Walk', 'walk-150': 'Marathon Walker', 'stars-5': 'Treasure Hunter', 'stars-20': 'Star Collector', collector: 'Collector', 'collector-20': 'Big Collector', 'collector-all': 'Complete Collection', 'rare-find': 'Rare Find', 'hearts-5': 'Best Friends', 'fully-evolved': 'Fully Evolved', 'growing-family': 'Growing Family' };
const addDays = (d, n) => { const t = new Date(`${d}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const dayDiff = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
const mondayOf = (d) => addDays(d, -((new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7));
const levelOf = (xp) => { let n = 1, need = 0; for (;;) { need += 50 * (n + 1); if (xp < need) return n; n++; } };

function newOracle() {
  return { crickets: 0, xp: 0, trail: 0, unlocked: new Set([0]), stats: {}, eggs: [], claimed: new Set(), starter: { stage: 1, fed: 0 }, creatures: 1, species: new Set(['Burrowby']),
    hatched: 0, hearts: 0, perfect: 0, sessionsDone: 0, sessionDays: new Set(), streak: { cur: 0, last: null, rest: null }, trophies: new Set(), cases: 0, chestOpens: 0, evolves: 0, levelUps: 0 };
}
const level = (o) => levelOf(o.xp);
const mastered = (o) => Object.values(o.stats).filter((s) => s.days.size >= 3).length;
const gate = (o) => TRAIL_END[Math.max(...o.unlocked)];
function refreshUnlocks(o) {
  const newly = [];
  UNLOCK.forEach(([lv, m], i) => { if (!o.unlocked.has(i) && level(o) >= lv && mastered(o) >= m) { o.unlocked.add(i); newly.push(i); } });
  return newly;
}
// Applies one submitted answer. Returns what the UI should have shown for it.
function applyAnswer(o, s, { word, correct, first, day }) {
  const st = (o.stats[word] ??= { box: 1, next: null, days: new Set(), attempts: 0, ft: 0, ftc: 0, lastMissed: null, lastBoxDate: null });
  const wasMastered = st.days.size >= 3;
  st.attempts++;
  if (first) { st.ft++; if (correct) st.ftc++; }
  if (!correct) st.lastMissed = day;
  if (st.lastBoxDate !== day) {                                       // only the first attempt of a day moves the box
    st.lastBoxDate = day;
    if (correct) { st.box = Math.min(5, st.box + 1); st.days.add(day); } else st.box = 1;
    if (st.days.size >= 3) st.box = Math.max(st.box, 4);
    st.next = addDays(day, BOX_DAYS[st.box - 1]);
  }
  const newlyMastered = !wasMastered && st.days.size >= 3;
  let crickets = 0, xp = 0;
  if (correct) {
    s.run++; s.bestRun = Math.max(s.bestRun, s.run);
    crickets = (first ? 3 : 1) + (s.run % 5 === 0 ? 2 : 0);
    xp = (first ? 10 : 5) + (newlyMastered ? 25 : 0);
    if (!first && s.missedBefore.has(word)) s.comeback = true;
  } else { s.run = 0; s.missedBefore.add(word); s.misses++; }
  const before = level(o);
  o.crickets += crickets; o.xp += xp; s.crickets += crickets; s.xp += xp;
  if (level(o) > before) { s.leveled = true; o.levelUps++; }
  for (const i of refreshUnlocks(o)) s.unlocked.push(i);              // unlock first, then step (so the unlocking answer can already step)
  if (correct) {
    const egg = o.eggs.find((e) => e.progress < e.needed);            // every correct answer warms the first unfinished egg
    if (egg) egg.progress++;
    if (first && o.trail < gate(o)) { o.trail++; s.steps++; }
    if (first) s.ftCorrect++; else s.retryCorrect++;
    if (/^[A-Z]/.test(word)) s.capital = true;
  }
  return { crickets, newlyMastered, newlyMasteredWord: newlyMastered ? word : null };
}
// Every trophy the PRD-level rules say should be held right now. `f` carries this-session facts.
function satisfied(o, f = {}) {
  const ids = new Set(), add = (ok, id) => { if (ok) ids.add(id); };
  const lv = level(o), m = mastered(o), ftTotal = Object.values(o.stats).reduce((n, st) => n + st.ftc, 0);
  add(o.hatched >= 1, 'first-hatch'); add(f.capital, 'capital-idea'); add(f.comeback, 'comeback'); add(f.perfect, 'perfect-flight');
  [[5, 'busy-bee'], [25, 'sessions-25'], [50, 'sessions-50']].forEach(([n, id]) => add(o.sessionsDone >= n, id));
  add(o.perfect >= 5, 'perfect-5'); add((f.bestRun ?? 0) >= 10, 'streak-10'); add((f.bestRun ?? 0) >= 20, 'streak-20');
  add(ftTotal >= 100, 'first-try-100'); add(ftTotal >= 500, 'first-try-500');
  [[10, 'mastered-10'], [25, 'mastered-25'], [50, 'mastered-50']].forEach(([n, id]) => add(m >= n, id));
  add(f.inSession && SAMPLE.length >= 10 && m >= SAMPLE.length, 'word-master');   // only checked while practising
  [[3, 'day-streak-3'], [7, 'day-streak-7'], [14, 'day-streak-14'], [30, 'day-streak-30']].forEach(([n, id]) => add(o.streak.cur >= n, id));
  [[5, 'level-5'], [10, 'level-10'], [15, 'level-15']].forEach(([n, id]) => add(lv >= n, id));
  [[3, 'explorer-3'], [6, 'explorer-6'], [9, 'explorer-9']].forEach(([n, id]) => add(o.unlocked.size >= n, id));
  add(o.trail >= 50, 'walk-50'); add(o.trail >= 150, 'walk-150'); add(o.claimed.size >= 5, 'stars-5'); add(o.claimed.size >= 20, 'stars-20');
  add(o.creatures >= 10, 'collector'); add(o.creatures >= 20, 'collector-20'); add(o.species.size >= 27, 'collector-all');
  add([...o.species].some((n) => RARE.has(n)), 'rare-find'); add(o.hearts >= 5, 'hearts-5');
  add(o.starter.stage >= 3, 'fully-evolved'); add((o.starter.stage >= 2 ? 1 : 0) >= 3, 'growing-family');
  return ids;
}
const earnNow = (o, f) => { const fresh = [...satisfied(o, f)].filter((id) => !o.trophies.has(id)); fresh.forEach((id) => o.trophies.add(id)); return fresh; };
function streakAfter(st, day) {
  if (st.last === day) return st;
  const missed = st.last ? dayDiff(st.last, day) - 1 : null;
  if (missed === null) return { cur: 1, last: day, rest: st.rest };
  if (missed === 0) return { cur: st.cur + 1, last: day, rest: st.rest };
  if (missed === 1 && st.rest !== mondayOf(addDays(day, -1))) return { cur: st.cur + 1, last: day, rest: mondayOf(addDays(day, -1)) };
  return { cur: 1, last: day, rest: st.rest };
}
const dueWords = (o, day) => SAMPLE.filter((w) => o.stats[w]?.attempts > 0 && o.stats[w].next <= day);
const newWords = (o) => SAMPLE.filter((w) => !o.stats[w]);
const canEvolve = (o) => (o.starter.stage === 1 ? o.starter.fed >= 30 && level(o) >= 3 : o.starter.stage === 2 ? o.starter.fed >= 60 && mastered(o) >= 10 : false);

// ---------------------------------------------------------------- the player's behaviour (deterministic)
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
function plan(word, dayIdx, appearance) {
  const h = hash(word);
  if (word === 'Monday' && dayIdx === 0 && appearance === 1) return 'case';
  if (appearance === 1) {
    if ((h + dayIdx) % 4 === 0) return /^[A-Z]/.test(word) && dayIdx % 2 === 0 ? 'case' : 'typo';
    if ((h + dayIdx) % 5 === 1) return 'trim';
    return 'ok';
  }
  return (h + dayIdx + appearance) % 7 === 0 ? 'typo' : 'ok';
}
const typedFor = (kind, word) => ({ ok: word, trim: `  ${word}  `, typo: word.length > 3 ? word.slice(0, -1) : `${word}x`, case: word.toLowerCase() })[kind];

// Calendar: Thu 11-05 .. Wed 11-18. Days 3, 7, 9, 10 are skipped (rest day used, then a 2-day gap resets the streak).
const START = '2026-11-05';
const PLAY_DAYS = [0, 1, 2, 4, 5, 6, 8, 11, 12, 13];

test('whole game: two weeks of play checked against an independent model, with zero errors', { skip, timeout: 280000 }, async () => {
  const o = newOracle();
  const context = await env.browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1000, height: 1200 } });
  const errors = [], requests = [];
  await prepare(context, { errors });
  await context.addInitScript(() => { let a = 20261105; Math.random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  context.on('request', (r) => requests.push(r.url()));
  const page = await context.newPage();
  const setDay = (idx) => context.clock.setFixedTime(new Date(`${addDays(START, idx)}T10:00:00`));
  await setDay(0);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('spellbeasts.v1')));
  const me = async () => Object.values((await saved()).profiles)[0];
  const BAD = /\b(null|undefined|NaN)\b/;
  const noJunk = async (where) => assert.doesNotMatch(await page.innerText('body'), BAD, `${where}: stray text`);
  const digits = (text, re) => { const m = text.match(re); assert.ok(m, `could not read ${re} in "${text}"`); return Number(m[1]); };

  // compare everything the oracle knows against what was actually saved
  async function compare(label) {
    const p = await me();
    assert.equal(p.crickets, o.crickets, `${label}: crickets`);
    assert.equal(p.xp, o.xp, `${label}: xp`);
    assert.equal(p.level, level(o), `${label}: level`);
    assert.equal(p.map.trailStep, o.trail, `${label}: trail step`);
    assert.deepEqual([...p.map.unlockedRegions].sort(), [...o.unlocked].map((i) => `r${i + 1}`).sort(), `${label}: unlocked regions`);
    const ws = p.wordStats.sample ?? {};
    assert.deepEqual(Object.keys(ws).sort(), Object.keys(o.stats).sort(), `${label}: words seen`);
    for (const [w, s] of Object.entries(o.stats)) {
      const g = ws[w];
      assert.deepEqual([g.box, g.nextDue, g.attempts, g.correctDays.length, g.firstTries, g.firstTryCorrect, g.lastMissed],
        [s.box, s.next, s.attempts, s.days.size, s.ft, s.ftc, s.lastMissed], `${label}: stats for ${w}`);
    }
    assert.deepEqual(p.eggs.map((e) => [e.progress, e.needed]), o.eggs.map((e) => [e.progress, e.needed]), `${label}: eggs`);
    assert.deepEqual(Object.keys(p.trophies).sort(), [...o.trophies].sort(), `${label}: trophies`);
    assert.deepEqual([p.creatures[0].stage, p.creatures[0].fed], [o.starter.stage, o.starter.fed], `${label}: starter`);
    assert.equal(p.creatures.length, o.creatures, `${label}: creature count`);
    assert.equal(p.sessions.length, o.sessionsDone, `${label}: sessions`);
    assert.equal(p.eggsHatched ?? 0, o.hatched, `${label}: eggs hatched`);
  }

  // ---- create the trainer through the real form
  await page.goto(env.server.url);
  await page.fill('input[name=name]', 'Riley');
  await page.check('input[value=burrowby]');
  await page.click('button[type=submit]');
  await page.waitForSelector('#practice');
  await compare('new trainer');

  let sawCaseNote = 0, sessionNo = 0, streakResets = 0;
  const log = [];

  for (const dayIdx of PLAY_DAYS) {
    const day = addDays(START, dayIdx);
    await setDay(dayIdx);
    await page.goto(`${env.server.url}#/home`);
    await page.waitForSelector('#practice');
    await page.waitForSelector('.world-map .token[data-settled=true]');
    await noJunk(`home ${day}`);

    // ---- home screen numbers
    const homeStats = await page.textContent('.home .stats');
    assert.match(homeStats, new RegExp(`Level ${level(o)}(?!\\d)`), `home ${day}: level`);
    assert.match(homeStats, new RegExp(`${o.crickets} crickets`), `home ${day}: crickets`);
    const due = dueWords(o, day).length, fresh = newWords(o).length;
    assert.equal((await page.textContent('.due')).trim(), `${due} word${due === 1 ? '' : 's'} due today · ${fresh} new word${fresh === 1 ? '' : 's'} to learn`, `home ${day}: due line`);
    assert.equal(Number(await page.getAttribute('.token', 'data-step')), o.trail, `home ${day}: token position`);
    assert.equal(await page.locator('.nest-link').count(), o.unlocked.size, `home ${day}: open nests`);
    assert.equal(await page.locator('.fog[data-locked=true]').count(), 9 - o.unlocked.size, `home ${day}: fogged regions`);
    assert.equal(await page.locator('.hungry').count(), o.sessionDays.has(day) ? 0 : 1, `home ${day}: hungry reminder`);

    // ---- treasure stars (every 10 steps, once each)
    const reached = Math.floor(o.trail / 10), unclaimed = [...Array(reached).keys()].map((i) => (i + 1) * 10).filter((s) => !o.claimed.has(s));
    assert.equal(await page.locator('.landmark.ready').count(), unclaimed.length, `home ${day}: ready stars`);
    for (const step of unclaimed) {
      const before = (await me()).crickets;
      await page.click(`.landmark[data-landmark=L${step}]`);
      await page.waitForSelector(`.landmark.claimed[data-landmark=L${step}]`);
      const gained = (await me()).crickets - before;
      assert.ok(gained >= 5 && gained <= 15, `chest paid ${gained}`);
      o.crickets += gained; o.claimed.add(step); o.chestOpens++;
      const chestTrophies = earnNow(o, {});
      const note = await page.textContent('.world-map .note');
      for (const id of chestTrophies) assert.match(note, new RegExp(TROPHY_NAMES[id]), `${day}: chest note should announce ${id}`);
      if (!chestTrophies.length) assert.doesNotMatch(note, /New trophy/, `${day}: unexpected trophy announcement`);
      if (/warmer/.test(await page.textContent('.world-map .note'))) {
        const egg = o.eggs.find((e) => e.progress < e.needed);
        assert.ok(egg, 'egg boost reported but no egg was warming');
        egg.progress = Math.min(egg.needed, egg.progress + 3);
      }
    }
    await compare(`after chests ${day}`);

    // ---- up to three practice sessions
    for (let n = 0; n < 3; n++) {
      const hadMaterial = dueWords(o, day).length + newWords(o).length > 0;
      const beforeSnapshot = { due: dueWords(o, day), fresh: newWords(o), seenNotDue: SAMPLE.filter((w) => o.stats[w] && !dueWords(o, day).includes(w)) };
      await page.goto(`${env.server.url}#/home`);
      await page.waitForSelector('#practice');
      await page.click('#practice');
      const started = await page.locator('#answer').waitFor({ timeout: 2000 }).then(() => true, () => false);
      assert.equal(started, hadMaterial, `${day}: a session starts exactly when something is due or new`);
      if (!started) break;

      sessionNo++;
      const s = { run: 0, bestRun: 0, missedBefore: new Set(), misses: 0, crickets: 0, xp: 0, steps: 0, ftCorrect: 0, retryCorrect: 0, unlocked: [], leveled: false, capital: false, comeback: false, newlyMastered: [] };
      const firstOfDay = !o.sessionDays.has(day);
      const levelBefore = level(o);
      const seq = [], counts = {};
      for (let guard = 0; guard < 80 && !page.url().endsWith('#/summary'); guard++) {
        const word = await page.evaluate(() => window.__spoken.at(-1).text);
        assert.ok(SAMPLE.includes(word), `spoke an unknown word: ${word}`);
        counts[word] = (counts[word] ?? 0) + 1;
        const appearance = counts[word];
        assert.ok(appearance <= 4, `${word} appeared ${appearance} times`);
        const kind = plan(word, dayIdx, appearance);
        const correct = kind === 'ok' || kind === 'trim';
        seq.push({ word, correct, appearance });
        const spokenBefore = await page.evaluate(() => window.__spoken.length);
        assert.equal((await page.innerText('body')).includes(word), false, `"${word}" visible before answering`);

        await page.fill('#answer', typedFor(kind, word));
        await page.press('#answer', 'Enter');
        const r = applyAnswer(o, s, { word, correct, first: appearance === 1, day });
        {
          const mine = await me();                                         // saved after every turn: exact per-answer check
          const ends = page.url().endsWith('#/summary');                   // the last answer also pays the session bonus
          assert.equal(mine.crickets, o.crickets + (ends ? 5 + (firstOfDay ? 5 : 0) : 0), `${day} ${word} (${kind}): crickets after this answer`);
          assert.equal(mine.xp, o.xp + (ends ? 15 : 0), `${day} ${word} (${kind}): xp after this answer`);
        }
        if (correct) {
          if (r.newlyMastered) s.newlyMastered.push(word);
          const toast = await page.evaluate(() => document.querySelector('.toast')?.textContent ?? '');
          if (/\+\d/.test(toast) && !page.url().endsWith('#/summary')) assert.equal(digits(toast, /\+(\d+)/), r.crickets, `${day} ${word}: toast reward`);
        } else {
          await page.waitForSelector('.correct-word');
          assert.equal(await page.textContent('.correct-word'), word, `${day}: shown spelling`);
          assert.equal(await page.locator('.case-note').count(), kind === 'case' ? 1 : 0, `${day} ${word}: capitalization note`);
          if (kind === 'case') { sawCaseNote++; o.cases++; }
          assert.equal(await page.evaluate(() => window.__spoken.length), spokenBefore, 'no new word until the correct copy is typed');
          await page.fill('#answer', typedFor('typo', word)); await page.press('#answer', 'Enter');   // wrong copy: must stay put
          assert.equal(await page.locator('.correct-word').count(), 1, 'a wrong copy does not continue');
          await page.fill('#answer', word); await page.press('#answer', 'Enter');
        }
        await page.waitForFunction((k) => window.__spoken.length > k || location.hash === '#/summary', spokenBefore);
      }
      assert.ok(page.url().endsWith('#/summary'), `${day}: session ended`);
      await page.waitForSelector('.summary');

      // ---- session shape (PRD 8.1 / 8.3)
      const distinct = Object.keys(counts);
      assert.ok(distinct.length <= 12, `${day}: ${distinct.length} distinct words`);
      const brandNew = distinct.filter((w) => beforeSnapshot.fresh.includes(w));
      assert.ok(brandNew.length <= 3, `${day}: ${brandNew.length} new words`);
      const material = beforeSnapshot.due.length + Math.min(3, beforeSnapshot.fresh.length) + beforeSnapshot.seenNotDue.length;
      assert.ok(distinct.length >= Math.min(10, material), `${day}: session too short (${distinct.length} of ${material} available)`);
      if (beforeSnapshot.due.length <= 10) for (const w of beforeSnapshot.due) assert.ok(distinct.includes(w), `${day}: due word ${w} was left out`);
      const D = distinct.length;
      seq.forEach((turn, t) => {
        if (turn.appearance === 1 && distinct.includes(turn.word)) assert.ok(brandNew.includes(turn.word) || o.stats[turn.word], 'word has stats');
        const next = seq.findIndex((x, i) => i > t && x.word === turn.word);
        if (!turn.correct && turn.appearance < 4 && next !== -1) {
          assert.ok(next - t >= 1 && next - t <= 3, `${day} ${turn.word}: miss at ${t} came back at ${next}`);
          if (t <= D - 3) assert.equal(next - t, 3, `${day} ${turn.word}: a miss returns 3 turns later`);
        }
        if (turn.correct && turn.appearance > 1 && seq.filter((x, i) => i < t && x.word === turn.word && !x.correct).length && turn.appearance < 4 && next !== -1) {
          const wasMissAtPrev = seq.slice(0, t).reverse().find((x) => x.word === turn.word)?.correct === false;
          if (wasMissAtPrev) { assert.ok(next - t >= 1, `${day} ${turn.word}: confirm at ${next - t}`); if (t <= D - 7) assert.ok(next - t >= 7, `${day} ${turn.word}: confirm came back after ${next - t} turns, sooner than 7`); }   // 'about 7': later misses may slot in ahead of it
        }
        if (t < seq.length - 3) assert.notEqual(turn.word, seq[t + 1].word, `${day}: ${turn.word} twice in a row`);
      });

      // ---- finish the session in the model, then check the summary page
      const sessionBonus = 5 + (firstOfDay ? 5 : 0);
      o.crickets += sessionBonus; o.xp += 15; s.crickets += sessionBonus; s.xp += 15;
      const lvlAfter = level(o);
      if (lvlAfter > levelBefore) { s.leveled = true; o.levelUps++; }
      for (const i of refreshUnlocks(o)) s.unlocked.push(i);
      { const prev = o.streak.cur; o.streak = streakAfter(o.streak, day); if (o.streak.cur < prev) streakResets++; }
      o.sessionDays.add(day); o.sessionsDone++; if (s.misses === 0) o.perfect++;
      const newTrophies = earnNow(o, { inSession: true, capital: s.capital, comeback: s.comeback, perfect: s.misses === 0, bestRun: s.bestRun });

      const res = await page.textContent('.results');
      assert.equal(digits(res, /first try: (\d+) of/), s.ftCorrect, `${day}: first-try count`);
      assert.equal(digits(res, /first try: \d+ of (\d+)/), D, `${day}: words in session`);
      assert.equal(digits(res, /on a retry: (\d+)/), s.retryCorrect, `${day}: retry count`);
      assert.equal(/more: none/.test(res) ? 0 : digits(res, /more: (\d+)/), s.missedBefore.size, `${day}: words to practise`);
      assert.equal(/Steps along the trail/.test(res) ? digits(res, /trail: (\d+)/) : 0, s.steps, `${day}: steps`);
      assert.equal(digits(res, /Crickets earned:\s*(\d+)/), s.crickets, `${day}: crickets earned`);
      assert.equal(digits(res, /XP earned: (\d+)/), s.xp, `${day}: XP earned`);
      assert.equal(/Newly mastered/.test(res) ? digits(res, /mastered: (\d+)/) : 0, s.newlyMastered.length, `${day}: newly mastered`);
      const summaryText = await page.textContent('.summary');
      assert.equal(digits(summaryText, /(\d+) days? in a row/), o.streak.cur, `${day}: streak`);
      const names = await page.$$eval('.new-trophies .trophy-card strong', (e) => e.map((x) => x.textContent));
      assert.deepEqual(names.sort(), [...newTrophies].map((t) => TROPHY_NAMES[t]).sort(), `${day}: trophies on summary`);
      const regionMsg = (await page.locator('.region-unlocked').count()) ? await page.textContent('.region-unlocked') : '';
      assert.equal((regionMsg.match(/Misty Marsh|Ember Peaks|Moonlit Highlands|Coral Reef|Cloudspire|Crystal Caves|Sunset Dunes|Starfall Isles/g) ?? []).length, s.unlocked.length, `${day}: unlock message`);
      assert.equal((await page.locator('#levelup-ok').count()) === 1, s.leveled, `${day}: level-up celebration`);
      if (s.leveled) assert.match(await page.textContent('.levelup-overlay h2'), new RegExp(`Level ${lvlAfter}!`));
      await noJunk(`summary ${day}`);
      await compare(`session ${sessionNo} (${day})`);
      log.push(`${day}: ${D} words, ${s.misses} misses, +${s.crickets} crickets, level ${lvlAfter}`);
      if (s.leveled) await page.click('#levelup-ok');
      await page.click('#done');
    }

    // ---- shopping: buy and hatch eggs in the nests
    const open = [...o.unlocked].sort();
    const idx = open[dayIdx % open.length];
    if (o.eggs.length < 2 && o.crickets >= PRICE[idx]) {
      await page.goto(`${env.server.url}#/nest/r${idx + 1}`);
      await page.waitForSelector('#buy-egg');
      assert.equal(await page.locator('#buy-egg').isDisabled(), false);
      await page.click('#buy-egg');
      await page.waitForSelector(`.egg-card`);
      o.crickets -= PRICE[idx]; o.eggs.push({ idx, needed: 10 + 2 * idx, progress: 0 });
      assert.equal(await page.locator('.egg-card').count(), o.eggs.length);
      await compare(`bought egg ${day}`);
    } else if (o.crickets < PRICE[idx]) {
      await page.goto(`${env.server.url}#/nest/r${idx + 1}`);
      await page.waitForSelector('#buy-egg');
      assert.equal(await page.locator('#buy-egg').isDisabled(), true, `${day}: egg button should be disabled with ${o.crickets} crickets`);
    }
    for (let guard = 0; guard < 3; guard++) {
      const ready = o.eggs.findIndex((e) => e.progress >= e.needed);
      if (ready < 0) break;
      const egg = o.eggs[ready];
      await page.goto(`${env.server.url}#/nest/r${egg.idx + 1}`);
      await page.waitForSelector('.egg-card.ready');
      assert.equal(await page.locator('.egg-card.ready').count(), o.eggs.filter((e) => e.progress >= e.needed).length);
      await page.click('.egg-card.ready .hatch');
      await page.waitForSelector('.reveal');
      const headline = await page.textContent('.reveal h2');
      const name = headline.replace(/^(Another|A new friend:) /, '').replace(/!$/, '');
      const dup = /^Another/.test(headline);
      assert.equal(dup, o.species.has(name), `${day}: duplicate flag for ${name}`);
      o.eggs.splice(ready, 1); o.hatched++;
      if (dup) o.crickets += Math.floor(PRICE[egg.idx] / 2); else { o.species.add(name); o.creatures++; }
      if (dup) o.hearts++;
      for (const t of earnNow(o, {})) assert.match(await page.textContent('.reveal'), new RegExp(TROPHY_NAMES[t]), `${day}: hatch should announce ${t}`);
      await noJunk(`hatch ${day}`);
      await compare(`hatched ${name} (${day})`);
    }

    // ---- sanctuary: feed the starter, check the evolve button against the rules, evolve
    await page.goto(`${env.server.url}#/sanctuary`);
    await page.waitForSelector('.creature-card');
    for (let i = 0; i < 3; i++) {
      const need = { 1: 30, 2: 60 }[o.starter.stage];
      if (!need || o.crickets < 10 || o.starter.fed >= need) break;
      await page.click('.creature-card:first-child .feed');
      const spend = Math.min(10, need - o.starter.fed, o.crickets);
      o.crickets -= spend; o.starter.fed += spend;
    }
    await compare(`fed ${day}`);
    const evolveShown = (await page.locator('.creature-card:first-child .evolve').count()) === 1;
    assert.equal(evolveShown, canEvolve(o), `${day}: evolve button vs rules (stage ${o.starter.stage}, fed ${o.starter.fed}, level ${level(o)}, mastered ${mastered(o)})`);
    if (evolveShown) {
      await page.click('.creature-card:first-child .evolve');
      await page.waitForSelector('.reveal');
      o.starter.stage++; o.starter.fed = 0; o.evolves++;
      for (const t of earnNow(o, {})) assert.match(await page.textContent('.reveal'), new RegExp(TROPHY_NAMES[t]), `${day}: evolve should announce ${t}`);
      await compare(`evolved ${day}`);
    }
    await noJunk(`sanctuary ${day}`);
  }

  // ---------------------------------------------------------------- end-of-game audit
  await page.goto(`${env.server.url}#/trophies`);
  await page.waitForSelector('.trophy-case');
  const earnedNames = await page.$$eval('.trophy-card.earned strong', (e) => e.map((x) => x.textContent));
  assert.deepEqual(earnedNames.sort(), [...o.trophies].map((t) => TROPHY_NAMES[t]).sort(), 'trophy case matches');
  await page.goto(`${env.server.url}#/book`);
  await page.waitForSelector('.book');
  assert.match(await page.textContent('.book p'), new RegExp(`${o.species.size} of 27 discovered`));

  await page.goto(`${env.server.url}#/parent`);
  await page.waitForSelector('#gate-answer');
  const [a, b] = (await page.textContent('#gate-q')).split(' × ').map(Number);
  await page.fill('#gate-answer', String(a * b)); await page.press('#gate-answer', 'Enter');
  await page.click('.tab[data-tab=stats]');
  for (const w of Object.keys(o.stats)) {
    const row = await page.$$eval(`.stats-table tr[data-word=${w}] td`, (c) => c.map((x) => x.textContent));
    const s = o.stats[w];
    assert.deepEqual([row[1], row[2], row[3], row[4], row[5]], [String(s.attempts), `${Math.round((100 * s.ftc) / s.ft)}%`, String(s.box), s.next, s.days.size >= 3 ? 'Yes' : 'No'], `parent stats for ${w}`);
  }
  assert.match(await page.textContent('.summary-line'), new RegExp(`${mastered(o)} of 15 words mastered`));
  assert.equal(await page.locator('.history li').count(), o.sessionsDone);

  // export -> reload -> state identical and the game still opens
  await page.click('.tab[data-tab=backup]');
  const before = await saved();
  await page.reload();
  assert.deepEqual(await saved(), before, 'state survives a reload');
  await page.goto(`${env.server.url}#/`);
  await page.waitForSelector('.card');
  await page.click('.card'); await page.waitForSelector('#practice');
  await compare('after reload');

  // ---- coverage guard: the run must actually have exercised the interesting parts
  assert.ok(sessionNo >= 11, `only ${sessionNo} sessions`);
  assert.ok(sawCaseNote >= 2, 'capitalization rule was never exercised');
  assert.ok(o.levelUps >= 3, `only ${o.levelUps} level-ups`);
  assert.ok(mastered(o) >= 3, `only ${mastered(o)} words mastered`);
  assert.ok(o.unlocked.size >= 2, 'no region ever unlocked');
  assert.ok(o.hatched >= 1, 'no egg ever hatched');
  assert.ok(o.chestOpens >= 1, 'no treasure star was ever opened');
  assert.ok(o.trophies.size >= 5, `only ${o.trophies.size} trophies`);
  assert.ok(streakResets >= 1, 'a streak reset was never exercised');
  assert.ok(o.streak.rest !== null, 'the weekly rest day was never exercised');

  assert.deepEqual(errors, [], 'console / page errors');
  assert.deepEqual(requests.filter((u) => !u.startsWith(env.server.url) && !u.startsWith('data:') && !u.startsWith('blob:')), [], 'no off-site requests');
  console.log(`playthrough: ${sessionNo} sessions over ${PLAY_DAYS.length} days | level ${level(o)} | ${mastered(o)} mastered | ${o.unlocked.size} regions | ${o.hatched} hatched, ${o.evolves} evolved | ${o.chestOpens} stars | ${o.trophies.size} trophies | streak ${o.streak.cur}`);
  await context.close();
});
