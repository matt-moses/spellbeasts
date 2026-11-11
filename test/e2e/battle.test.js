// Trainer Battles through the real UI (PRD 12): the Arena screen, the battle itself and its summary.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, battleState, seededState, savedProfile, startBattleFromMap, answer, hearts, lastSpoken } from './helpers.js';
import { SPECIES, REGIONS, arenaSpeciesOf } from '../../js/logic/species.js';
import { wildHearts } from '../../js/logic/battle.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

// random: Math.random is pinned so the wild creature is known. 0.1 -> the land's arena-only creature (it joins you);
// 0.5 -> the common egg species, Burrowby, which the trainer already owns (so the prize is crickets).
async function open({ state = battleState(), random = 0.1, arena = true, reducedMotion = 'no-preference', width = 900 } = {}) {
  const context = await env.browser.newContext({ reducedMotion, viewport: { width, height: 1000 } });
  const errors = [];
  await prepare(context, { state, errors, arena });
  if (random != null) await context.addInitScript((v) => { Math.random = () => v; }, random);
  const page = await context.newPage();
  await page.goto(env.server.url);
  await page.click('.card'); await page.waitForSelector('#practice');
  return { page, context, errors };
}
const toast = (page) => page.textContent('.toast');
const wildAnim = (page) => page.evaluate(() => document.querySelector('.bs-wild .bs-mover').getAnimations().filter((a) => a.animationName?.startsWith('bs-') && a.playState === 'running').map((a) => a.animationName));

test('a clean battle: hits, the special move, the win, a new friend, the victory lap and the summary', { skip, timeout: 60000 }, async () => {
  const { page, context, errors } = await open();
  await startBattleFromMap(page);
  assert.equal(await page.textContent('.bs-banner'), 'A wild Cloverknight appears!');
  assert.match(await page.textContent('.bs-live'), /A wild Cloverknight appears! It has 10 hearts\./);
  assert.equal(await page.textContent('.bs-wild .bs-name'), 'Wild Cloverknight');
  assert.equal(await page.textContent('.bs-player .bs-name'), 'Little Burrowby');
  assert.equal(await hearts(page), 10);
  assert.equal(await page.locator('.bs-heart').count(), 10);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'answer');

  await answer(page);
  assert.equal(await hearts(page), 9); assert.match(await toast(page), /^Hit!\s+\+3/);
  assert.equal(await page.getAttribute('.bs-pips', 'data-charge'), '1');
  await answer(page);
  assert.equal(await hearts(page), 8);
  assert.equal(await page.getAttribute('.bs-pips', 'data-charge'), '2');
  assert.match(await page.getAttribute('.battle-stage', 'class'), /charged/);          // the special is next, and it shows
  await answer(page);
  assert.equal(await hearts(page), 6); assert.match(await toast(page), /^Special move!/);
  assert.equal(await page.getAttribute('.bs-pips', 'data-charge'), '0');
  assert.match(await page.textContent('.bs-live'), /Special move! Two hearts gone\. Cloverknight has 6 hearts left\./);

  let answers = 3;
  while (await hearts(page) > 0) { await answer(page); answers++; }
  assert.equal(answers, 8);                                                            // 1,1,2,1,1,2,1,1
  assert.match(await toast(page), /^You won! Cloverknight joined you!/);
  assert.equal(await page.getAttribute('.battle-stage', 'data-place'), 'joined');
  assert.equal(await page.textContent('.bs-banner'), 'Cloverknight joined you!');
  let p = await savedProfile(page);
  assert.equal(p.battlesWon, 1);                                                       // saved the moment it was won
  assert.ok(p.creatures.some((c) => c.species === 'cloverknight' && c.stage === 1));
  assert.equal(p.sessions.length, 0);

  // victory lap: the last two words are still asked
  assert.equal(page.url().endsWith('#/battle/r1'), true);
  await answer(page);
  assert.match(await toast(page), /Correct!/);
  assert.equal(await hearts(page), 0);
  await answer(page);
  await page.waitForSelector('.summary');
  assert.equal(await page.textContent('.summary h1'), 'You won the battle!');
  assert.equal(await page.getAttribute('.battle-card', 'data-outcome'), 'won');
  assert.equal(await page.getAttribute('.battle-card', 'data-prize'), 'befriend');
  assert.match(await page.textContent('.battle-card'), /Battle won!.*Cloverknight is your new friend!.*Battles won: 1 of 10 for the Champion trophy/s);
  assert.match(await page.textContent('.results'), /first try: 10 of 10/);
  p = await savedProfile(page);
  assert.deepEqual(p.sessions.map((s) => [s.mode, s.words, s.misses]), [['battle', 10, 0]]);
  assert.deepEqual(p.arena.befriended, ['cloverknight']); assert.deepEqual(p.arena.wins, { r1: 1 });

  await page.click('#see-friend'); await page.waitForSelector('.book');
  assert.match(await page.textContent('.book p'), new RegExp(`2 of ${SPECIES.length} discovered`));
  assert.match(await page.textContent('.book-entry[data-species=cloverknight]'), /Cloverknight/);
  assert.equal(await page.locator('.book-entry[data-species=cloverknight] .silhouette').count(), 0);
  // it lives in the Sanctuary like any other creature, and Champion shows progress
  await page.evaluate(() => { location.hash = '#/sanctuary'; }); await page.waitForSelector('.sanctuary');
  assert.equal(await page.locator('.creature-card[data-species=cloverknight]').count(), 1);
  await page.evaluate(() => { location.hash = '#/trophies'; }); await page.waitForSelector('.trophy-case');
  assert.match(await page.textContent('[data-trophy=champion]'), /Win 10 battles \(1 of 10\)/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('a miss: the wild creature dodges, the usual gentle feedback appears, and the word comes back', { skip, timeout: 60000 }, async () => {
  const { page, context, errors } = await open({ random: 0.5 });
  await startBattleFromMap(page);
  assert.equal(await page.textContent('.bs-wild .bs-name'), 'Wild Burrowby');
  const full = await hearts(page);
  assert.equal(full, 11);                                                              // an 11-word session this time
  await answer(page);
  assert.equal(await hearts(page), full - 1);
  const missed = await lastSpoken(page);
  await page.fill('#answer', 'zzz'); await page.press('#answer', 'Enter');
  await page.waitForSelector('.correct-word');
  assert.equal(await toast(page), 'It dodged!');
  assert.ok(['bs-sidestep', 'bs-duck'].includes((await wildAnim(page))[0]));
  assert.match(await page.getAttribute('.bs-wild .bs-creature svg', 'class'), /pose-dodge/);
  assert.equal(await hearts(page), full - 1);                                          // no damage
  assert.equal(await page.getAttribute('.bs-pips', 'data-charge'), '0');               // the run is broken
  assert.match(await page.textContent('.feedback'), /Almost! Let's look at it together\./);
  assert.equal(await page.textContent('label.prompt'), 'Now type it correctly to keep going');
  assert.match(await page.textContent('.bs-live'), /Burrowby dodged\. Burrowby has 10 hearts left\./);
  await page.fill('#answer', missed); await page.press('#answer', 'Enter');
  const seen = [];
  for (let i = 0; i < 30 && !page.url().endsWith('#/summary'); i++) seen.push(await answer(page));
  assert.ok(seen.filter((w) => w === missed).length >= 2, 'the missed word came back (retry and confirm)');
  await page.waitForSelector('.summary');
  assert.equal(await page.getAttribute('.battle-card', 'data-prize'), 'crickets');
  assert.match(await page.textContent('.battle-card'), /The wild Burrowby gave you a bag of 5 crickets\./);
  assert.equal(await page.locator('#see-friend').count(), 0);
  const p = await savedProfile(page);
  assert.equal(p.creatures.length, 1); assert.equal(p.battlesWon, 1);
  assert.deepEqual(errors, []);
  await context.close();
});

test('escape: when the words run out first it waves goodbye, and every cricket and XP point is kept', { skip, timeout: 90000 }, async () => {
  const state = battleState(['Monday', 'garden', 'island']);
  state.profiles.p1.crickets = 7;
  const { page, context, errors } = await open({ state });
  await startBattleFromMap(page);
  assert.equal(await hearts(page), 3);
  // note every event the stage plays
  await page.evaluate(() => {
    window.__events = [];
    new MutationObserver(() => { const e = document.querySelector('.battle-stage')?.dataset.event; if (e && window.__events.at(-1) !== e) window.__events.push(e); }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-event'] });
  });
  // one right answer, then every word is missed until the game stops asking
  await answer(page);
  assert.equal(await hearts(page), 2);
  let t0 = 0;
  for (let i = 0; i < 30 && !page.url().endsWith('#/summary'); i++) { t0 = Date.now(); await answer(page, false); }
  await page.waitForSelector('.summary', { timeout: 2000 });
  assert.ok(Date.now() - t0 < 4000, 'the goodbye is short');
  const events = await page.evaluate(() => window.__events);
  assert.equal(events.at(-1), 'escape');                                               // it waved goodbye before the summary
  assert.ok(events.includes('hit') && events.includes('dodge'));
  assert.equal(await page.getAttribute('.battle-card', 'data-outcome'), 'escaped');
  assert.match(await page.textContent('.battle-card'), /It got away.*The wild Cloverknight got away\. You keep everything you earned!/s);
  assert.notEqual(await page.textContent('.summary h1'), 'You won the battle!');
  const p = await savedProfile(page);
  assert.equal(p.battlesWon, 0); assert.equal(p.creatures.length, 1); assert.deepEqual(p.arena.wins, {});
  assert.equal(p.crickets, 7 + 3 + 5 + 5);                                             // one first-try answer, the session and first-of-day bonuses: nothing taken away
  assert.equal(p.sessions.at(-1).mode, 'battle');
  assert.deepEqual(errors, []);
  await context.close();
});

test('typing is never blocked: the next word is asked in the same instant, and keys land while the animation plays', { skip }, async () => {
  const { page, context, errors } = await open();
  await startBattleFromMap(page);
  for (const round of [1, 2, 3]) {                                                     // hit, hit, special
    const r = await page.evaluate(() => {
      const input = document.getElementById('answer'), n = window.__spoken.length;
      input.value = window.__spoken.at(-1).text;
      input.form.requestSubmit();
      const moving = document.querySelector('.bs-wild .bs-mover').getAnimations().some((a) => a.animationName?.startsWith('bs-'));
      return { asked: window.__spoken.length - n, focused: document.activeElement === input, empty: input.value === '', disabled: input.disabled, moving, anim: document.querySelector('.bs-wild .bs-mover').dataset.anim };
    });
    assert.deepEqual(r, { asked: 1, focused: true, empty: true, disabled: false, moving: true, anim: round === 3 ? 'tumble' : 'hit' }, `answer ${round}`);
    await page.keyboard.type('ab');                                                    // mid-animation
    assert.equal(await page.inputValue('#answer'), 'ab');
    assert.equal((await wildAnim(page)).length, 1, 'the animation is still playing while typing');
    await page.fill('#answer', '');
  }
  assert.equal(await hearts(page), 6);
  assert.deepEqual(errors, []);
  await context.close();
});

test('rapid play: ten answers with no pause at all still end with the right hearts, prize and saved progress', { skip }, async () => {
  const { page, context, errors } = await open();
  await startBattleFromMap(page);
  const log = await page.evaluate(() => {
    const out = [];
    for (let i = 0; i < 10; i++) {
      const input = document.getElementById('answer');
      input.value = window.__spoken.at(-1).text;
      input.form.requestSubmit();
      out.push(Number(document.querySelector('.bs-hearts').dataset.left));
    }
    return out;
  });
  assert.deepEqual(log, [9, 8, 6, 5, 4, 2, 1, 0, 0, 0]);
  await page.waitForSelector('.summary');
  assert.equal(await page.getAttribute('.battle-card', 'data-prize'), 'befriend');
  const p = await savedProfile(page);
  assert.equal(p.battlesWon, 1); assert.equal(p.sessions.at(-1).words, 10);
  assert.equal(Object.values(p.wordStats.sample).filter((s) => s.attempts === 2).length, 10);
  assert.deepEqual(errors, []);
  await context.close();
});

test('reduced motion: the same battle with no animation reaches the same result', { skip, timeout: 60000 }, async () => {
  const { page, context, errors } = await open({ reducedMotion: 'reduce' });
  await startBattleFromMap(page);
  const still = () => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  assert.equal(await still(), 0);
  assert.equal(await page.isVisible('.bs-banner'), true);
  const left = [];
  for (let i = 0; i < 8; i++) { await answer(page); left.push(await hearts(page)); assert.equal(await still(), 0); assert.equal(await page.locator('.bs-fx > *').count(), 0); }
  assert.deepEqual(left, [9, 8, 6, 5, 4, 2, 1, 0]);
  assert.equal(await page.getAttribute('.battle-stage', 'data-place'), 'joined');
  await answer(page); await answer(page);
  await page.waitForSelector('.summary');
  assert.equal(await page.getAttribute('.battle-card', 'data-prize'), 'befriend');
  assert.equal((await savedProfile(page)).battlesWon, 1);
  assert.deepEqual(errors, []);
  await context.close();
});

test('same answers, same progress: a battle saves exactly what a practice session would, plus the prize', { skip, timeout: 90000 }, async () => {
  const plan = [true, true, false, true, true, true, false, true];                     // then all right
  const run = async (battle) => {
    const { page, context, errors } = await open({ random: 0.5 });
    if (battle) await startBattleFromMap(page); else { await page.click('#practice'); await page.waitForSelector('#answer'); }
    for (let i = 0; i < 40 && !page.url().endsWith('#/summary'); i++) await answer(page, plan[i] ?? true);
    await page.waitForSelector('.summary');
    const p = await savedProfile(page);
    assert.deepEqual(errors, []);
    await context.close();
    return p;
  };
  const b = await run(true), s = await run(false);
  for (const key of ['wordStats', 'map', 'xp', 'level', 'streak', 'eggs', 'berries', 'trophies']) assert.deepEqual(b[key], s[key], key);
  assert.equal(b.crickets, s.crickets + 5);                                            // the cricket bag for beating a Burrowby in the first land
  assert.deepEqual(b.sessions.map((x) => ({ ...x, mode: 'practice' })), s.sessions);
  assert.equal(b.sessions[0].mode, 'battle'); assert.equal(b.battlesWon, 1); assert.equal(s.battlesWon, 0);
  assert.equal(b.creatures.length, s.creatures.length);
});

test('keyboard only: from the map to the summary without touching the mouse', { skip }, async () => {
  const { page, context, errors } = await open({ state: battleState(['Monday', 'garden', 'island']) });
  await page.focus('.arena-link[data-region=r1]');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.arena');
  assert.equal(await page.getAttribute('.arena-pick.chosen', 'aria-checked'), 'true');
  await page.focus('#battle-go'); await page.keyboard.press('Enter');
  await page.waitForSelector('#answer');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'answer');
  for (let i = 0; i < 3; i++) { const n = await page.evaluate(() => window.__spoken.length); await page.keyboard.type(await lastSpoken(page)); await page.keyboard.press('Enter'); await page.waitForFunction((k) => window.__spoken.length > k || location.hash === '#/summary', n); }
  await page.waitForSelector('.summary');
  assert.equal(await page.getAttribute('.battle-card', 'data-outcome'), 'won');        // 3 hearts: 1, 1, then the special
  await page.focus('#done'); await page.keyboard.press('Enter');
  await page.waitForSelector('#practice');
  assert.deepEqual(errors, []);
  await context.close();
});

test('leaving in the middle keeps the answers so far and records no win', { skip }, async () => {
  const { page, context, errors } = await open();
  await startBattleFromMap(page);
  await answer(page); await answer(page);
  await page.click('#home-btn'); await page.waitForSelector('#practice');
  const p = await savedProfile(page);
  assert.equal(Object.values(p.wordStats.sample).filter((s) => s.attempts === 2).length, 2);
  assert.equal(p.battlesWon, 0); assert.equal(p.sessions.length, 0);
  // like practice, going back picks the same battle up again; a new one starts from the Arena
  await page.evaluate(() => { location.hash = '#/battle/r1'; });
  await page.waitForSelector('.battle-stage');
  assert.equal(await hearts(page), 8);
  await page.evaluate(() => { location.hash = '#/arena/r1'; });
  await page.waitForSelector('.arena');
  await page.click('#battle-go'); await page.waitForSelector('.battle-stage');
  assert.equal(await hearts(page), 10);
  assert.deepEqual(errors, []);
  await context.close();
});

test('battles work offline after one visit', { skip, timeout: 60000 }, async () => {
  const { page, context, errors } = await open({ state: battleState(['Monday', 'garden', 'island']), reducedMotion: 'reduce' });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 });
  await context.setOffline(true);
  await page.reload();
  await page.click('.card'); await page.waitForSelector('#practice');
  await startBattleFromMap(page);
  for (let i = 0; i < 3; i++) await answer(page);
  await page.waitForSelector('.summary');
  assert.equal(await page.getAttribute('.battle-card', 'data-outcome'), 'won');
  assert.equal((await savedProfile(page)).battlesWon, 1);
  await context.setOffline(false);
  assert.deepEqual(errors.filter((e) => !/Failed to load resource|version\.json|net::ERR/i.test(e)), []);
  await context.close();
});

test('with the Arena switched off there is no way in: no flags, no Arena or battle screens', { skip }, async () => {
  const { page, context, errors } = await open({ arena: false });
  assert.equal(await page.locator('.arena-link, .arena-pin-locked').count(), 0);
  for (const route of ['#/arena/r1', '#/battle/r1']) {
    await page.evaluate((r) => { location.hash = r; }, route);
    await page.waitForFunction(() => !document.querySelector('.arena, .battle-stage'));
    assert.equal(await page.locator('.arena, .battle-stage').count(), 0, route);
  }
  await page.click('#help-btn'); await page.waitForSelector('#help-dialog');
  assert.doesNotMatch(await page.textContent('#help-dialog'), /battle/i);
  assert.deepEqual(errors, []);
  await context.close();
});

test('a battle in each of the newest lands: its own backdrop and creature, its tougher hearts, a win that befriends the arena creature', { skip: skip || (REGIONS.length < 12 && 'only with 12 lands'), timeout: 180000 }, async () => {
  for (const [i, id] of [[9, 'r10'], [10, 'r11'], [11, 'r12']]) {
    const state = battleState(); state.profiles.p1.map.unlockedRegions = REGIONS.map((r) => r.id);
    const { page, context, errors } = await open({ state, reducedMotion: 'reduce' });
    const arena = SPECIES.find((s) => s.id === arenaSpeciesOf(id));
    await startBattleFromMap(page, id);
    assert.equal(await page.getAttribute('.battle-stage', 'data-land'), id);
    assert.equal(await page.textContent('.bs-banner'), `A wild ${arena.name} appears!`);
    assert.equal(await hearts(page), wildHearts(10, i));
    for (let k = 0; k < 12 && !page.url().endsWith('#/summary'); k++) await answer(page);     // with the toughest hearts a clean run wins on the very last word
    await page.waitForSelector('.summary');
    assert.equal(await page.getAttribute('.battle-card', 'data-prize'), 'befriend');
    const p = await savedProfile(page);
    assert.deepEqual(p.arena.befriended, [arena.id]); assert.deepEqual(p.arena.wins, { [id]: 1 });
    await page.click('#see-friend'); await page.waitForSelector('.book');
    assert.match(await page.textContent(`.book-entry[data-species=${arena.id}]`), new RegExp(arena.name));
    assert.deepEqual(errors, []);
    await context.close();
  }
});
