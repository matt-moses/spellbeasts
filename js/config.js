// Site settings. The Cloudflare Web Analytics token is public (it ends up in the page either way).
// Empty turns analytics off.
// The beacon only ever loads on SITE_HOST, never in local dev or tests.
export const SITE_HOST = 'matt-moses.github.io';
export const CF_BEACON_TOKEN = '4abecfdb6db542939406baeb59862c62'; // gitleaks:allow (public token)
export const CF_BEACON_URL = 'https://static.cloudflareinsights.com/beacon.min.js';

// Spell Master (spelling-rule lessons, js/ui/learn.js). Built and tested but switched off for now: see TODO.md.
// Turning it on shows the home tile and the #/learn screens (and un-skips test/e2e/learn.test.js).
export const SPELL_MASTER_ENABLED = false;

// Trainer Battles (the Arena, js/logic/battle.js). Built behind this switch because every push to main goes live.
// Tests turn it on with globalThis.SPELLBEASTS_ARENA = true.
export const ARENA_ENABLED = false;
export const arenaOn = () => globalThis.SPELLBEASTS_ARENA ?? ARENA_ENABLED;
