import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startServer } from '../../tools/static-server.js';
import { freshState, freshProfile } from '../../js/logic/storage-schema.js';
import { addStarter } from '../../js/logic/collection.js';

export const CHROMIUM = process.env.CHROMIUM_PATH ?? '/usr/bin/chromium';
export const hasBrowser = existsSync(CHROMIUM);
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

export async function launch() {
  const server = await startServer(ROOT);
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
  return { server, browser, async close() { await browser.close(); await server.close(); } };
}

// A seeded state: one trainer, sample list reduced to the given words.
export function seededState(words = ['Monday', 'garden', 'island']) {
  const s = freshState();
  s.wordLists.sample.words = s.wordLists.sample.words.filter((w) => words.includes(w.word));
  s.profiles.p1 = freshProfile({ name: 'Sam', avatarSpecies: 'burrowby', now: '2026-11-05T00:00:00Z' });
  addStarter(s.profiles.p1, 'burrowby', '2026-11-05T00:00:00Z');
  return s;
}

// Fake speech (records utterances) + optional pre-seeded storage; runs before app code.
export async function prepare(context, { state = null, errors = [], arena = false } = {}) {
  await context.addInitScript(({ state, arena }) => {
    window.__spoken = [];
    if (arena) window.SPELLBEASTS_ARENA = true;                                                 // the Arena is built behind a switch (js/config.js)
    if (window.SPELLBEASTS_READY_DELAY === undefined) window.SPELLBEASTS_READY_DELAY = 0;      // tests skip the get-ready pause unless they test it
    const voice = { voiceURI: 'fake', lang: 'en-US', name: 'Fake' };
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => [voice], cancel() {}, speak(u) { window.__spoken.push({ text: u.text, rate: u.rate }); } } });
    try { if (state && !localStorage.getItem('spellbeasts.v1')) localStorage.setItem('spellbeasts.v1', JSON.stringify(state)); } catch { /* about:blank etc. */ }
  }, { state, arena });
  context.on('page', (p) => { p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); });
}

// Opens the Parent area's adult gate by choosing a birth year 35 years ago (the year is never stored by the game).
export async function unlockParent(page) {
  await page.waitForSelector('#gate-year');
  const year = await page.evaluate(() => new Date().getFullYear() - 35);
  await page.selectOption('#gate-year', String(year));
  await page.click('#gate-continue');
  await page.waitForSelector('.tabs');
}

export const lastSpoken = (page) => page.evaluate(() => window.__spoken.at(-1)?.text);

// Answer every word correctly until the summary appears.
export async function playSession(page) {
  await page.click('#practice'); await page.waitForSelector('#answer');
  for (let i = 0; i < 30 && !page.url().endsWith('#/summary'); i++) {
    const w = await lastSpoken(page), n = await page.evaluate(() => window.__spoken.length);
    await page.fill('#answer', w); await page.press('#answer', 'Enter');
    await page.waitForFunction((k) => window.__spoken.length > k || location.hash === '#/summary', n);
  }
  await page.waitForSelector('.summary');
}

// ---- battles
// A level-3 trainer (the Arena is open) whose sample words were all seen yesterday and are due today.
export function battleState(words = ['garden', 'rainbow', 'whisper', 'island', 'library', 'Monday', 'February', 'thunder', 'bicycle', 'mountain', 'kitchen', 'Canada'], { level = 3, xp = 260 } = {}) {
  const s = seededState(words);
  const p = s.profiles.p1;
  p.level = level; p.xp = xp; p.map.unlockedRegions = level >= 2 ? ['r1', 'r2'] : ['r1'];
  p.wordStats.sample = Object.fromEntries(s.wordLists.sample.words.map((w) => [w.word, { box: 1, nextDue: '2026-01-01', correctDays: [], attempts: 1, firstTries: 1, firstTryCorrect: 0, lastMissed: null, lastBoxDate: '2026-01-01' }]));
  return s;
}
export const savedProfile = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('spellbeasts.v1')).profiles.p1);
// From the home screen: open the land's Arena and start a battle.
export async function startBattleFromMap(page, region = 'r1') {
  await page.click(`.arena-link[data-region=${region}]`);
  await page.waitForSelector('.arena');
  await page.click('#battle-go');
  await page.waitForSelector('.battle-stage');
  await page.waitForSelector('#answer');
}
// Types the current word (or a wrong spelling) and presses Enter. After a wrong answer it also types the correction.
export async function answer(page, right = true) {
  const w = await lastSpoken(page), n = await page.evaluate(() => window.__spoken.length);
  await page.fill('#answer', right ? w : `${w}zz`); await page.press('#answer', 'Enter');
  if (!right) { await page.waitForSelector('.correct-word'); await page.fill('#answer', w); await page.press('#answer', 'Enter'); }
  await page.waitForFunction((k) => window.__spoken.length > k || location.hash === '#/summary', n);
  return w;
}
export const hearts = async (page) => Number(await page.getAttribute('.bs-hearts', 'data-left'));
