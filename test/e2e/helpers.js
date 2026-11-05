import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startServer } from '../../tools/static-server.js';
import { freshState, freshProfile } from '../../js/logic/storage-schema.js';

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
  s.profiles.p1 = freshProfile({ name: 'Sam', avatarSpecies: 'starter-1', now: '2026-11-05T00:00:00Z' });
  return s;
}

// Fake speech (records utterances) + optional pre-seeded storage; runs before app code.
export async function prepare(context, { state = null, errors = [] } = {}) {
  await context.addInitScript(({ state }) => {
    window.__spoken = [];
    const voice = { voiceURI: 'fake', lang: 'en-US', name: 'Fake' };
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => [voice], cancel() {}, speak(u) { window.__spoken.push({ text: u.text, rate: u.rate }); } } });
    try { if (state && !localStorage.getItem('spellbeasts.v1')) localStorage.setItem('spellbeasts.v1', JSON.stringify(state)); } catch { /* about:blank etc. */ }
  }, { state });
  context.on('page', (p) => { p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); });
}

export const lastSpoken = (page) => page.evaluate(() => window.__spoken.at(-1)?.text);
