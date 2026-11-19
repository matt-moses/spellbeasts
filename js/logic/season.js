// Seasonal theming: which holiday look the game wears on a given day.
//   thanksgiving: all of November up to and including Thanksgiving Day (the fourth Thursday of November, US).
//   christmas:    the day after Thanksgiving through the end of December.
// Pure and local-time, so it is easy to test. `override` ('thanksgiving' | 'christmas' | 'none') is for previewing and tests.
export const SEASONS = ['thanksgiving', 'christmas'];

export function thanksgivingDay(year) {
  const first = new Date(year, 10, 1).getDay();            // weekday of Nov 1 (0 = Sunday)
  return 1 + ((4 - first + 7) % 7) + 21;                   // the fourth Thursday
}

export function seasonFor(date = new Date(), override = null) {
  if (override) return SEASONS.includes(override) ? override : null;
  const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
  if (m === 11) return 'christmas';
  if (m === 10) return d <= thanksgivingDay(y) ? 'thanksgiving' : 'christmas';
  return null;
}

// Reads the preview switch (?season=christmas, or SPELLBEASTS_SEASON in tests) and sets data-season on <html>.
export function applySeason(doc = document, win = window, now = new Date()) {
  let override = null;
  try { override = new URLSearchParams(win.location.search).get('season') ?? win.SPELLBEASTS_SEASON ?? null; } catch { /* no window */ }
  const season = seasonFor(now, override);
  if (season) doc.documentElement.dataset.season = season; else delete doc.documentElement.dataset.season;
  const meta = doc.querySelector('meta[name="theme-color"]');
  if (meta && season) meta.setAttribute('content', season === 'christmas' ? '#c0392b' : '#d9822b');
  return season;
}
