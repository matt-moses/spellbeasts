// Renders the PWA icons from the creature art: `npm run icons` (needs Chromium; dev-only).
import { chromium } from 'playwright-core';
import { creatureSvg } from '../js/assets/creatures.js';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../icons/', import.meta.url));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
async function render(file, size, pad) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const art = Math.round(size * (1 - pad * 2));
  await page.setContent(`<style>html,body{margin:0}body{width:${size}px;height:${size}px;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,#9be8ff,#4fc254 78%)}svg{width:${art}px;height:${art}px;overflow:visible}</style>${creatureSvg('burrowby', 2, { size: art })}`);
  await page.screenshot({ path: `${OUT}${file}` });
  await page.close();
}
await render('icon-192.png', 192, 0.08);
await render('icon-512.png', 512, 0.08);
await render('icon-maskable-512.png', 512, 0.22);        // extra padding: maskable icons are cropped to a circle or squircle
await render('apple-touch-icon.png', 180, 0.1);
await browser.close();
console.log('wrote icons');
