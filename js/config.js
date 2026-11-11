// Site settings. The Cloudflare Web Analytics token is public (it ends up in the page either way).
// Empty turns analytics off.
// The beacon only ever loads on SITE_HOST, never in local dev or tests.
export const SITE_HOST = 'matt-moses.github.io';
export const CF_BEACON_TOKEN = '4abecfdb6db542939406baeb59862c62'; // gitleaks:allow (public token)
export const CF_BEACON_URL = 'https://static.cloudflareinsights.com/beacon.min.js';

// Spell Master (spelling-rule lessons, js/ui/learn.js). Built and tested but switched off for now: see TODO.md.
// Turning it on shows the home tile and the #/learn screens (and un-skips test/e2e/learn.test.js).
export const SPELL_MASTER_ENABLED = false;

// Trainer Battles (the Arena, js/logic/battle.js). Setting this to false hides every flag, screen, creature and help
// question that belongs to it. Tests force it either way with globalThis.SPELLBEASTS_ARENA = true / false.
export const ARENA_ENABLED = true;
export const arenaOn = () => globalThis.SPELLBEASTS_ARENA ?? ARENA_ENABLED;

// How many lands are live (js/logic/species.js, world.js). The data holds 12 and all 12 are live; the count stays a switch so
// the game can be run (and the test suite checked) with the original 9. Tests force a count with globalThis.SPELLBEASTS_LANDS.
// Only 9 or 12 are supported: the map is drawn for one of those two shapes (js/ui/map.js).
export const LAND_COUNT = 12;
export const landCount = () => globalThis.SPELLBEASTS_LANDS ?? LAND_COUNT;
