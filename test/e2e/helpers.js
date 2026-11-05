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
export async function prepare(context, { state = null, errors = [] } = {}) {
  await context.addInitScript(({ state }) => {
    window.__spoken = [];
    if (window.SPELLBEASTS_READY_DELAY === undefined) window.SPELLBEASTS_READY_DELAY = 0;      // tests skip the get-ready pause unless they test it
    const voice = { voiceURI: 'fake', lang: 'en-US', name: 'Fake' };
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => [voice], cancel() {}, speak(u) { window.__spoken.push({ text: u.text, rate: u.rate }); } } });
    try { if (state && !localStorage.getItem('spellbeasts.v1')) localStorage.setItem('spellbeasts.v1', JSON.stringify(state)); } catch { /* about:blank etc. */ }
  }, { state });
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
