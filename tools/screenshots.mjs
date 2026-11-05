// Regenerates the README screenshots from a seeded profile: `npm run screenshots` (needs Chromium; dev-only).
import { launch, prepare, seededState } from '../test/e2e/helpers.js';
import { SAMPLE_WORDS } from '../data/sample-words.js';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));
const st = seededState(SAMPLE_WORDS.map((w) => w.word));
const p = st.profiles.p1;
p.name = 'Riley';
p.level = 9; p.xp = 2350; p.crickets = 84; p.berries = 6;
p.streak = { current: 6, best: 9, lastPlayDate: '2026-11-04', restUsedWeek: null };
p.map.unlockedRegions = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'];
p.map.trailStep = 228;
p.map.claimedLandmarks = Array.from({ length: 21 }, (_, i) => `L${(i + 1) * 10}`);
p.eggs.push({ id: 'e1', regionId: 'r7', progress: 8, needed: 22 });
const mk = (species, stage, fed = 0, hearts = 0) => ({ id: `c-${species}`, species, stage, fed, hearts, hatchedAt: '2026-10-20T00:00:00Z' });
p.creatures.push(mk('moonowl', 2, 20, 2), mk('stormwyrm', 3), mk('frostbun', 1), mk('thistlefox', 2, 10), mk('inkwell', 1), mk('cloudray', 3), mk('gemdrake', 1), mk('pebblepup', 2, 5, 1), mk('puddlenite', 1), mk('dunefox', 2));
p.creatures[0].stage = 2;
p.creatures[0].care = { fed: 5, clean: 4, loved: 5, fun: 4, petTicks: 0, day: '2026-11-05', sparkleDay: null };
p.sessions = Array.from({ length: 28 }, (_, i) => ({ date: `2026-10-${String(8 + i).padStart(2, '0')}`, mode: 'practice', words: 11, correctFirstTry: 9, misses: i % 3 }));
p.trophies = Object.fromEntries(['first-hatch', 'capital-idea', 'comeback', 'perfect-flight', 'busy-bee', 'sessions-25', 'streak-10', 'mastered-10', 'day-streak-3', 'day-streak-7', 'level-5', 'explorer-3', 'explorer-6', 'walk-50', 'walk-150', 'stars-5', 'stars-20', 'collector', 'rare-find', 'hearts-5', 'fully-evolved'].map((id) => [id, '2026-10-30']));
p.wordStats.sample = Object.fromEntries(SAMPLE_WORDS.map((w, i) => [w.word, { box: 2 + (i % 4), nextDue: '2026-11-0' + (4 + (i % 3)), correctDays: i < 8 ? ['2026-10-20', '2026-10-27', '2026-11-03'] : ['2026-11-03'], attempts: 4 + i, firstTries: 4, firstTryCorrect: 3, lastMissed: i % 4 ? null : '2026-11-01', lastBoxDate: '2026-11-03' }]));

const env = await launch();
const ctx = await env.browser.newContext({ viewport: { width: 900, height: 1000 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
await prepare(ctx, { state: st });
await ctx.clock.setFixedTime(new Date('2026-11-05T10:00:00'));
const page = await ctx.newPage();
const shot = (name, opts = {}) => page.screenshot({ path: `${OUT}${name}.png`, ...opts });
const go = (route) => page.goto(`${env.server.url}#/${route}`);

await page.goto(env.server.url);
await page.click('.card'); await page.waitForSelector('.token[data-settled=true]');
await page.waitForTimeout(400);
await shot('home', { fullPage: true });

await page.locator('.map-frame').scrollIntoViewIfNeeded();
await page.evaluate(() => { const s = document.querySelector('.map-scroll'); s.scrollLeft = s.scrollWidth * 0.62; });
await page.waitForTimeout(300);
await page.locator('.map-frame').screenshot({ path: `${OUT}map-new-lands.png` });

await page.click('#practice'); await page.waitForSelector('#answer');
await page.click('#say-def');
await page.fill('#answer', 'whispr');
await shot('practice', { fullPage: true });
await page.press('#answer', 'Enter'); await page.waitForSelector('.correct-word');
await shot('practice-miss', { fullPage: true });

await go('sanctuary'); await page.waitForSelector('.creature-card');
await shot('sanctuary', { fullPage: true });
await page.click('.creature-card:first-child .care-link'); await page.waitForSelector('#care-feed');
await page.waitForTimeout(200);
await shot('care', { fullPage: true });
await page.click('#care-play'); await page.click('#game-start'); await page.waitForTimeout(3200);
await shot('berry-catch', { fullPage: true });

await go('book'); await page.waitForSelector('.book');
await shot('creature-book', { fullPage: true });
await go('trophies'); await page.waitForSelector('.trophy-case');
await shot('trophies', { fullPage: true });
await env.close();
console.log(`wrote screenshots to ${OUT}`);
