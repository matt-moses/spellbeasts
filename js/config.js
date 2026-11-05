// Site settings. The Cloudflare Web Analytics token is public (it ends up in the page either way).
// It is the same site as brow-guess: both apps live on matt-moses.github.io, so one Cloudflare site covers both and
// the dashboard separates them by path (/spellbeasts/ vs /brow-guess/). Empty turns analytics off.
// The beacon only ever loads on SITE_HOST, never in local dev or tests.
export const SITE_HOST = 'matt-moses.github.io';
export const CF_BEACON_TOKEN = '4abecfdb6db542939406baeb59862c62'; // gitleaks:allow (public token)
export const CF_BEACON_URL = 'https://static.cloudflareinsights.com/beacon.min.js';
