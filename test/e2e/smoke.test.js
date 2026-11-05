import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasBrowser, launch, prepare, seededState, lastSpoken } from './helpers.js';

const skip = hasBrowser ? false : 'no Chromium found (set CHROMIUM_PATH)';
let env;
before(async () => { if (hasBrowser) env = await launch(); });
after(async () => { await env?.close(); });

async function newPage(opts) {
  const context = await env.browser.newContext();
  const errors = [];
  await prepare(context, { ...opts, errors });
  const page = await context.newPage();
  return { page, context, errors };
}

test('empty browser shows the trainer picker; a trainer can be created and reaches home', { skip }, async () => {
  const { page, context, errors } = await newPage();
  await page.goto(env.server.url);
  assert.match(await page.textContent('h1'), /Spellbeasts/);
  assert.equal(await page.locator('.card').count(), 0);
  await page.fill('input[name=name]', 'Alex');
  await page.click('button[type=submit]');
  await page.waitForSelector('#practice');
  assert.match(await page.textContent('h1'), /Hi, Alex/);
  assert.match(await page.textContent('.due'), /15 new words/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('a full session: word hidden until submit, strict capitalization, correction, requeue, summary', { skip }, async () => {
  const { page, context, errors } = await newPage({ state: seededState() });
  await page.goto(env.server.url);
  await page.click('.card');
  await page.click('#practice');
  await page.waitForSelector('#answer');

  const input = page.locator('#answer');
  for (const attr of ['spellcheck', 'autocomplete', 'autocapitalize', 'autocorrect']) {
    assert.ok(['false', 'off'].includes(await input.getAttribute(attr)), attr);
  }

  let sawCaseNote = false, mondayMissed = false, turns = 0;
  while (!page.url().endsWith('#/summary') && turns++ < 20) {
    const word = await lastSpoken(page);
    assert.ok(word, 'a word was spoken');
    // The word must not be anywhere in the page before the answer is submitted.
    assert.equal((await page.content()).includes(`>${word}<`), false);
    assert.equal((await page.innerText('body')).includes(word), false, `"${word}" leaked into the page`);

    if (word === 'Monday' && !mondayMissed) {
      mondayMissed = true;
      await input.fill('monday'); await input.press('Enter');
      await page.waitForSelector('.correct-word');
      assert.equal(await page.textContent('.correct-word'), 'Monday');
      sawCaseNote = (await page.locator('.case-note').count()) === 1;
      assert.match(await page.textContent('.almost'), /Almost/);
      const spokenBefore = await page.evaluate(() => window.__spoken.length);
      await input.fill('Mondey'); await input.press('Enter');       // wrong copy: stays in correction
      assert.equal(await page.locator('.correct-word').count(), 1);
      assert.equal(await page.evaluate(() => window.__spoken.length), spokenBefore);
      await input.fill('Monday'); await input.press('Enter');       // right copy: continue
    } else {
      await input.fill(word); await input.press('Enter');
    }
    await page.waitForFunction((n) => window.__spoken.length > n || location.hash === '#/summary', await page.evaluate(() => window.__spoken.length - 1));
  }
  assert.ok(sawCaseNote, 'capitalization note shown');
  await page.waitForSelector('.summary');
  const text = await page.innerText('.results');
  assert.match(text, /first try: 2 of 3/);
  assert.match(text, /on a retry: 2/);
  assert.match(text, /practice more: 1/);

  // Progress persisted: Monday dropped to box 1 and was missed today.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('spellbeasts.v1')));
  const p = saved.profiles.p1;
  assert.equal(p.wordStats.sample.Monday.box, 1);
  assert.equal(p.wordStats.sample.garden.box, 2);
  assert.equal(p.sessions.length, 1);
  assert.deepEqual(errors, []);
  await context.close();
});

test('keyboard: Space and Ctrl+R repeat the word, slow button is slower; progress survives reload', { skip }, async () => {
  const { page, context } = await newPage({ state: seededState() });
  await page.goto(env.server.url);
  await page.click('.card'); await page.click('#practice');
  await page.waitForSelector('#answer');
  const word = await lastSpoken(page);
  const count = () => page.evaluate(() => window.__spoken.length);
  const n0 = await count();
  await page.focus('#answer'); await page.keyboard.press('Space');
  assert.equal(await count(), n0 + 1);
  assert.equal(await page.inputValue('#answer'), '');
  await page.keyboard.press('Control+r');
  assert.equal(await count(), n0 + 2);
  await page.click('#say-slow');
  const slow = await page.evaluate(() => window.__spoken.at(-1));
  assert.equal(slow.text, word);
  assert.equal(slow.rate, 0.6);
  await page.click('#say-def');
  assert.match(await page.textContent('.clue'), /^Definition: /);
  assert.equal(await page.isVisible('#say-sentence'), true);

  await page.fill('#answer', word); await page.press('#answer', 'Enter');
  await page.reload();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('spellbeasts.v1')));
  assert.equal(saved.profiles.p1.crickets, 3);
  assert.equal(saved.profiles.p1.wordStats.sample[word].attempts, 1);
  assert.equal(await page.locator('.card').count(), 1);   // back at the trainer picker, nothing lost
  await context.close();
});

test('storage unavailable: game still runs and shows the not-saved banner', { skip }, async () => {
  const context = await env.browser.newContext();
  await prepare(context, { errors: [] });
  await context.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
  const page = await context.newPage();
  await page.goto(env.server.url);
  assert.match(await page.textContent('.banner'), /won't be saved/);
  await page.fill('input[name=name]', 'Kit'); await page.click('button[type=submit]');
  await page.waitForSelector('#practice');
  await context.close();
});
