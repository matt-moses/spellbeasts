import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hasBrowser, launch, prepare, seededState, playSession, lastSpoken, unlockParent } from './helpers.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

async function open(patch = () => {}, { unlocked = true, words } = {}) {
  const st = seededState(words); patch(st.profiles.p1, st);
  const context = await env.browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1100, height: 1200 } });
  const errors = [], requests = [];
  await prepare(context, { state: st, errors });
  context.on('request', (r) => requests.push(r.url()));
  const page = await context.newPage();
  await page.goto(env.server.url);
  await page.click('.card');
  await page.waitForSelector('#practice');
  await page.click('#parent-link');
  await page.waitForSelector('#gate-year');
  if (unlocked) await unlock(page);
  return { page, context, errors, requests };
}
const unlock = unlockParent;
const tab = (page, id) => page.click(`.tab[data-tab=${id}]`);
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('spellbeasts.v1')));
const LIST = 'kettle | noun | a pot for boiling water | The kettle whistled.\n|noun|no word on this line\nlantern | noun | a light you can carry\n# a comment line\n';

test('adult gate: only a grown-up birth year opens it, nothing is saved, and it locks again on leaving', { skip }, async () => {
  const { page, context } = await open(() => {}, { unlocked: false });
  const now = await page.evaluate(() => new Date().getFullYear());
  const before = await page.evaluate(() => localStorage.getItem('spellbeasts.v1'));
  // children's years and "too close to call" years are refused, with a friendly message
  for (const y of [now, now - 9, now - 14, now - 18]) {
    await page.selectOption('#gate-year', String(y)); await page.click('#gate-continue');
    assert.match(await page.textContent('#gate-msg'), /for grown-ups/, `year ${y}`);
    assert.equal(await page.locator('.tabs').count(), 0, `year ${y} must not unlock`);
    assert.equal(await page.inputValue('#gate-year'), '', 'the choice is cleared after every try');
  }
  assert.equal(await page.locator('#gate-year option').count(), 102);                 // placeholder + 101 years
  await page.selectOption('#gate-year', String(now - 19)); await page.click('#gate-continue');   // 19+ whole years: certainly 18+
  await page.waitForSelector('.tabs');
  assert.equal(await page.locator('.tab').count(), 4);

  // the year is not saved or persisted anywhere
  assert.equal(await page.evaluate(() => localStorage.getItem('spellbeasts.v1')), before);
  assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length, document.cookie]), [1, 0, ''], 'no new storage keys or cookies');
  assert.doesNotMatch(await page.evaluate(() => JSON.stringify([localStorage, sessionStorage, location.href, document.cookie])), new RegExp(String(now - 19)));

  await page.click('#parent-back');
  await page.waitForSelector('#practice');
  await page.click('#parent-link');
  await page.waitForSelector('#gate-year');                                           // locked again
  assert.equal(await page.inputValue('#gate-year'), '');
  await context.close();
});

test('import: preview shows per-line errors, replace asks first, and the new list is practiced right away', { skip }, async () => {
  const { page, context, errors, requests } = await open();
  assert.equal(await page.locator('#do-import').isDisabled(), true);
  await page.fill('#import-text', LIST);
  assert.match(await page.textContent('#valid-count'), /^2 valid words/);
  assert.match(await page.textContent('#import-preview'), /1 line with problems/);
  assert.match(await page.textContent('.errors'), /Line 2: Missing word/);
  await page.click('#do-import');
  assert.match(await page.textContent('.confirm'), /Replace all 3 words/);
  await page.click('.confirm .no');                                            // cancel changes nothing
  assert.equal((await saved(page)).wordLists.sample.words.length, 3);
  await page.click('#do-import'); await page.click('.confirm .yes');
  assert.match(await page.textContent('#parent-note'), /Imported 2 words \(1 skipped\)/);
  assert.equal(await page.locator('table.words tbody tr').count(), 2);
  const st = await saved(page);
  assert.deepEqual(st.wordLists.sample.words.map((w) => w.word), ['kettle', 'lantern']);
  assert.equal(st.wordLists.sample.words[0].sentence, 'The kettle whistled.');

  await page.click('#parent-back'); await page.click('#practice'); await page.waitForSelector('#answer');
  const heard = new Set();
  for (let i = 0; i < 10 && !page.url().endsWith('#/summary'); i++) {
    const w = await lastSpoken(page); heard.add(w);
    const n = await page.evaluate(() => window.__spoken.length);
    await page.fill('#answer', w); await page.press('#answer', 'Enter');
    await page.waitForFunction((k) => window.__spoken.length > k || location.hash === '#/summary', n);
  }
  assert.deepEqual([...heard].sort(), ['kettle', 'lantern']);
  assert.deepEqual(errors, []);
  assert.deepEqual(requests.filter((u) => !u.startsWith(env.server.url) && !u.startsWith('data:') && !u.startsWith('blob:')), [], 'no off-site requests');
  await context.close();
});

test('add mode skips words already present; a new list can be created and chosen per trainer', { skip }, async () => {
  const { page, context } = await open();
  await page.fill('#import-text', 'garden|noun|dup\nkettle|noun|a pot');
  await page.check('input[value=add]');
  assert.match(await page.textContent('#import-preview'), /1 valid word/);
  assert.match(await page.textContent('.errors'), /Duplicate word "garden"/);
  await page.click('#do-import');                                              // add: no confirmation needed
  await page.waitForSelector('#parent-note');
  assert.equal((await saved(page)).wordLists.sample.words.length, 4);

  await page.fill('#import-text', 'moss|noun|soft green plant\nferret|noun|a small animal');
  await page.check('input[value=new]');
  await page.fill('#new-list-name', ' Two Bee ');
  await page.click('#do-import');
  await page.waitForSelector('#parent-note');
  assert.match(await page.textContent('#list-select option:checked'), /Two Bee \(2\)/);
  await tab(page, 'trainers');
  await page.selectOption('.active-list', { label: 'Two Bee' });
  const st = await saved(page);
  assert.equal(st.wordLists[st.profiles.p1.activeListId].name, 'Two Bee');
  await context.close();
});

test('edit, delete and rename persist across a reload; editing validates', { skip }, async () => {
  const { page, context } = await open();
  await page.click('tr[data-word=garden] .edit');
  await page.fill('tr[data-word=garden] input[name=definition]', 'A place to grow flowers.');
  await page.fill('tr[data-word=garden] input[name=word]', 'island');          // duplicate
  await page.click('tr[data-word=garden] .save');
  assert.match(await page.textContent('tr[data-word=garden] .err'), /already in the list/);
  await page.fill('tr[data-word=garden] input[name=word]', 'garden');
  await page.click('tr[data-word=garden] .save');
  assert.match(await page.textContent('tr[data-word=garden] td:nth-child(3)'), /A place to grow flowers/);
  await page.click('tr[data-word=island] .confirm-wrap button');
  await page.click('tr[data-word=island] .confirm .yes');
  await page.waitForSelector('tr[data-word=island]', { state: 'detached' });
  await page.fill('#list-name', 'My list'); await page.click('#rename-list');
  await page.waitForSelector('#parent-note');
  await page.reload();
  const st = await saved(page);
  assert.deepEqual(st.wordLists.sample.words.map((w) => w.word), ['garden', 'Monday']);
  assert.equal(st.wordLists.sample.name, 'My list');
  assert.equal(st.wordLists.sample.words[0].definition, 'A place to grow flowers.');
  await context.close();
});

test('stats: per-word numbers, sortable columns, most-missed ranking, session history', { skip }, async () => {
  const { page, context } = await open((p) => {
    const mk = (box, due, ft, ok, att, last) => ({ box, nextDue: due, correctDays: [], attempts: att, firstTries: ft, firstTryCorrect: ok, lastMissed: last, lastBoxDate: '2026-11-01' });
    p.wordStats.sample = { Monday: mk(1, '2026-11-05', 4, 1, 6, '2026-11-04'), garden: mk(3, '2026-11-09', 3, 3, 3, null), island: mk(1, '2026-11-05', 2, 1, 3, '2026-11-03') };
    p.sessions.push({ date: '2026-11-04', mode: 'practice', words: 3, correctFirstTry: 1, misses: 2 });
  }, { words: ['Monday', 'garden', 'island', 'window'] });
  await tab(page, 'stats');
  const cell = (w, n) => page.textContent(`.stats-table tr[data-word=${w}] td:nth-child(${n})`);
  assert.deepEqual([await cell('Monday', 2), await cell('Monday', 3), await cell('Monday', 4), await cell('Monday', 5), await cell('Monday', 6), await cell('Monday', 7)], ['6', '25%', '1', '2026-11-05', 'No', '2026-11-04']);
  assert.deepEqual([await cell('window', 2), await cell('window', 3), await cell('window', 4), await cell('window', 5)], ['0', '–', '–', 'new']);
  assert.deepEqual(await page.$$eval('.most-missed li', (l) => l.map((x) => x.textContent.split(' — ')[0])), ['Monday', 'island']);
  assert.match(await page.textContent('.most-missed li'), /missed 3 times/);
  assert.match(await page.textContent('.history li'), /2026-11-04 · practice · 3 words · 1 right first try · 2 misses/);

  const order = () => page.$$eval('.stats-table tbody tr', (r) => r.map((x) => x.dataset.word));
  await page.click('.sort[data-key=accuracy]');
  assert.deepEqual(await order(), ['Monday', 'island', 'garden', 'window']);     // ascending, empty last
  assert.equal(await page.getAttribute('th:has(.sort[data-key=accuracy])', 'aria-sort'), 'ascending');
  await page.click('.sort[data-key=accuracy]');
  assert.deepEqual(await order(), ['garden', 'island', 'Monday', 'window']);     // descending, empty still last
  assert.equal(await page.getAttribute('th:has(.sort[data-key=accuracy])', 'aria-sort'), 'descending');
  await context.close();
});

test('stats update after real practice', { skip }, async () => {
  const { page, context } = await open();
  await page.click('#parent-back');
  await playSession(page);
  await page.click('#done'); await page.click('#parent-link'); await unlock(page);
  await tab(page, 'stats');
  assert.match(await page.textContent('.summary-line'), /0 of 3 words mastered/);
  const row = await page.$$eval('.stats-table tbody tr', (r) => r.map((x) => [...x.children].map((c) => c.textContent)));
  for (const cols of row) assert.deepEqual([cols[1], cols[2], cols[3]], ['1', '100%', '2']);
  assert.equal(await page.locator('.history li').count(), 1);
  await context.close();
});

test('trainers: rename, reset progress and delete all ask first', { skip }, async () => {
  const { page, context } = await open((p) => { p.crickets = 55; p.xp = 300; p.level = 3; });
  await tab(page, 'trainers');
  await page.fill('.tname', 'Sammy'); await page.click('.rename');
  await page.waitForSelector('#parent-note');
  assert.equal((await saved(page)).profiles.p1.name, 'Sammy');
  await page.click('.trainer .confirm-wrap:nth-of-type(1) button');
  assert.equal((await saved(page)).profiles.p1.crickets, 55);                    // nothing happened yet
  await page.click('.confirm .no');
  await page.click('.trainer .confirm-wrap:nth-of-type(1) button'); await page.click('.confirm .yes');
  await page.waitForSelector('#parent-note');
  const p = (await saved(page)).profiles.p1;
  assert.deepEqual([p.name, p.crickets, p.xp, p.level, p.creatures.length], ['Sammy', 0, 0, 1, 1]);
  await page.click('.trainer .confirm-wrap:nth-of-type(2) button'); await page.click('.confirm .yes');
  await page.waitForSelector('.trainer', { state: 'detached' });
  assert.deepEqual(Object.keys((await saved(page)).profiles), []);
  await page.click('#parent-back');
  await page.waitForSelector('.add-trainer');
  assert.equal(await page.locator('.card').count(), 0);
  await context.close();
});

test('backup: download is warned about, restores everything exactly, and bad files are refused', { skip }, async () => {
  const { page, context } = await open((p) => { p.crickets = 42; p.trophies.x = '2026-11-05'; });
  await tab(page, 'backup');
  assert.match(await page.textContent('.warn'), /Don't post it publicly/);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export')]);
  assert.match(dl.suggestedFilename(), /^spellbeasts-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const text = await readFile(await dl.path(), 'utf8');
  const exported = JSON.parse(text);
  assert.equal(exported.profiles.p1.crickets, 42);
  assert.equal(exported.wordLists.sample.words.length, 3);
  assert.deepEqual(exported, await saved(page));

  // change things, then restore from the file
  await tab(page, 'trainers');
  await page.click('.trainer .confirm-wrap:nth-of-type(2) button'); await page.click('.confirm .yes');
  await page.waitForSelector('.trainer', { state: 'detached' });
  await tab(page, 'backup');
  await page.setInputFiles('#backup-file', { name: 'junk.json', mimeType: 'application/json', buffer: Buffer.from('{not json') });
  assert.match(await page.textContent('.err'), /not valid JSON/);
  await page.setInputFiles('#backup-file', { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  assert.match(await page.textContent('.confirm'), /REPLACE everything/);
  await page.click('#confirm-restore');
  await page.waitForSelector('#parent-note');
  assert.deepEqual(await saved(page), exported);                                 // exact round trip
  await page.reload();
  assert.deepEqual(await saved(page), exported);
  await context.close();
});

test('say-it-like: set in the editor, spoken in practice (word, slow, sentence), answer still the real spelling', { skip }, async () => {
  const { page, context, errors } = await open((p, st) => {
    st.wordLists.sample.words = [{ id: 'laughter', word: 'laughter', partOfSpeech: 'noun', definition: 'The sound of joy.', sentence: 'Laughter filled the room.' }];
  }, { words: ['laughter'] });
  await page.click('tr[data-word=laughter] .edit');
  await page.fill('tr[data-word=laughter] input[name=sayAs]', 'laffter');
  await page.click('tr[data-word=laughter] .hear');
  assert.equal(await page.evaluate(() => window.__spoken.at(-1).text), 'laffter');           // the editor can preview it
  await page.click('tr[data-word=laughter] .save');
  assert.equal(await page.textContent('tr[data-word=laughter] td.sayas'), 'laffter');
  assert.equal((await saved(page)).wordLists.sample.words[0].sayAs, 'laffter');

  await page.click('#parent-back'); await page.click('#practice'); await page.waitForSelector('#answer');
  const said = () => page.evaluate(() => window.__spoken.at(-1));
  assert.equal((await said()).text, 'laffter');                                                // spoken when asked
  await page.click('#say-slow'); assert.deepEqual([(await said()).text, (await said()).rate], ['laffter', 0.6]);
  await page.click('#say-sentence'); assert.equal((await said()).text, 'laffter filled the room.');
  assert.equal((await page.innerText('body')).toLowerCase().includes('laffter'), false, 'the respelling is not shown on screen');
  await page.fill('#answer', 'laffter'); await page.press('#answer', 'Enter');                  // typing what it SOUNDS like is wrong
  await page.waitForSelector('.correct-word');
  assert.equal(await page.textContent('.correct-word'), 'laughter');
  await page.fill('#answer', 'laughter'); await page.press('#answer', 'Enter');                 // the real spelling is what counts
  assert.deepEqual(errors, []);
  await context.close();
});

test('two trainers, two lists: assign in the Parent area, each practises only their own words with separate progress', { skip }, async () => {
  const { page, context, errors } = await open((p, st) => {
    st.wordLists.sample.words = st.wordLists.sample.words.filter((w) => ['garden', 'island', 'Monday'].includes(w.word));
    st.profiles.p2 = { ...JSON.parse(JSON.stringify(p)), name: 'Little Lou', activeListId: 'sample' };
  }, { words: ['garden', 'island', 'Monday'] });
  // build an easy list for the younger player
  await page.fill('#import-text', 'cat | noun | a pet\ndog | noun | another pet');
  await page.check('input[value=new]'); await page.fill('#new-list-name', 'Easy words');
  await page.click('#do-import'); await page.waitForSelector('#parent-note');
  assert.match(await page.textContent('#list-select option:checked'), /Easy words/);
  assert.equal(await page.locator('.who input:checked').count(), 0);
  await page.check('.who input[data-profile=p2]');
  await page.waitForSelector('#parent-note');
  assert.match(await page.textContent('#parent-note'), /Little Lou now practices “Easy words”/);
  let st = await saved(page);
  assert.deepEqual([st.profiles.p1.activeListId, st.profiles.p2.activeListId === 'sample'], ['sample', false]);

  await page.click('#parent-back'); await page.waitForSelector('#practice');
  await page.click('button:text-is("Switch trainer")'); await page.waitForSelector('.card');
  const practise = async (name) => {
    await page.click(`.card:has-text("${name}")`); await page.waitForSelector('#practice');
    const heard = new Set();
    await page.click('#practice'); await page.waitForSelector('#answer');
    for (let i = 0; i < 12 && !page.url().endsWith('#/summary'); i++) {
      const w = await page.evaluate(() => window.__spoken.at(-1).text); heard.add(w);
      const n = await page.evaluate(() => window.__spoken.length);
      await page.fill('#answer', w); await page.press('#answer', 'Enter');
      await page.waitForFunction((k) => window.__spoken.length > k || location.hash === '#/summary', n);
    }
    await page.waitForSelector('.summary'); await page.click('#done'); await page.waitForSelector('#practice');
    return [...heard].sort();
  };
  assert.deepEqual(await practise('Little Lou'), ['cat', 'dog']);
  assert.match(await page.textContent('#list-name'), /Easy words/);
  await page.click('button:text-is("Switch trainer")'); await page.waitForSelector('.card');
  assert.deepEqual(await practise('Sam'), ['Monday', 'garden', 'island']);
  assert.match(await page.textContent('#list-name'), /Sample words/);
  st = await saved(page);
  assert.deepEqual(Object.keys(st.profiles.p2.wordStats).filter((k) => k !== 'sample'), [Object.keys(st.wordLists).find((k) => k !== 'sample')]);

  // delete the easy list: Little Lou goes back to the sample list and the list is gone
  await page.click('#parent-link'); await unlock(page);
  await page.selectOption('#list-select', { label: 'Easy words (2)' });
  await page.click('.row .confirm-wrap button >> text=Delete this list'); await page.click('.confirm .yes');
  await page.waitForSelector('#parent-note');
  st = await saved(page);
  assert.deepEqual([Object.keys(st.wordLists), st.profiles.p2.activeListId], [['sample'], 'sample']);
  assert.deepEqual(errors, []);
  await context.close();
});
