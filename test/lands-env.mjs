// Preload for `npm run check:12`: copies SPELLBEASTS_LANDS from the environment onto globalThis, where js/config.js reads it.
if (process.env.SPELLBEASTS_LANDS) globalThis.SPELLBEASTS_LANDS = Number(process.env.SPELLBEASTS_LANDS);
