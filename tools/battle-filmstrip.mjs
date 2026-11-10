// Contact sheets of every battle animation, for looking at by eye.
//   node tools/battle-filmstrip.mjs <outDir> [wildSpecies,...] [--stage=2] [--width=820] [--player=burrowby]
// For each wild species it writes <outDir>/<species>.png: one row per battle event, frames at 0, 150, 300, 600 and 1000 ms.
// It drives test/fixtures/battle-stage.html with the page's animation clock paused, so frames are exact.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './static-server.js';
import { EVENTS } from '../js/logic/battle-cues.js';
import { ARENA_SPECIES } from '../js/logic/species.js';

export const FRAME_TIMES = [0, 150, 300, 600, 1000];
const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;

// Plays `event` on the fixture page and returns PNG buffers of the stage at each time in FRAME_TIMES.
// All CSS animations are paused and stepped by hand so the result does not depend on machine speed.
export async function captureEvent(page, event, times = FRAME_TIMES) {
  await page.evaluate(() => document.querySelector('#buttons button:last-child').click());      // reset
  if (event === 'cheer' || event === 'oops') await page.evaluate(() => window.stage.set({ heartsLeft: 0, won: true, prize: 'crickets' }));
  await page.evaluate((e) => {
    window.playEvent(e);
    window.__anims = document.getAnimations().filter((a) => a.animationName?.startsWith('bs-'));
    for (const a of window.__anims) { a.pause(); a.__t0 = a.currentTime ?? 0; }
  }, event);
  const frames = [];
  for (const t of times) {
    await page.evaluate((ms) => { for (const a of window.__anims) { try { a.currentTime = a.__t0 + ms; } catch { /* finished */ } } }, t);
    frames.push(await page.locator('.battle-stage').screenshot());
  }
  return frames;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outDir = process.argv[2];
  if (!outDir) { console.error('usage: node tools/battle-filmstrip.mjs <outDir> [species,...] [--stage=2] [--width=820] [--player=burrowby]'); process.exit(2); }
  const species = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3].split(',') : ARENA_SPECIES.map((s) => s.id);
  const stage = arg('stage', '2'), width = Number(arg('width', '820')), player = arg('player', 'burrowby');
  mkdirSync(outDir, { recursive: true });
  const server = await startServer(fileURLToPath(new URL('../', import.meta.url)));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width, height: 500 } });
  const sheet = await browser.newPage({ viewport: { width: 1500, height: 800 } });
  for (const id of species) {
    await page.goto(`${server.url}test/fixtures/battle-stage.html?wild=${id}&wstage=${stage}&player=${player}&pstage=${stage}&hearts=10`);
    await page.waitForFunction(() => window.ready);
    let html = '<body style="margin:8px;font:13px sans-serif;background:#fff">';
    for (const event of EVENTS) {
      const frames = await captureEvent(page, event);
      html += `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><b style="width:90px">${event}</b>${frames.map((f, i) => `<figure style="margin:0"><img style="width:270px;display:block;border:1px solid #ccc" src="data:image/png;base64,${f.toString('base64')}"><figcaption>${FRAME_TIMES[i]} ms</figcaption></figure>`).join('')}</div>`;
    }
    await sheet.setContent(html);
    const file = join(outDir, `${id}.png`);
    writeFileSync(file, await sheet.screenshot({ fullPage: true }));
    console.log(file);
  }
  await browser.close(); await server.close();
}
