// Shows the running version, and if the site has a newer one, offers a Reload button.
import { BUILD_VERSION } from '../logic/build.js';

export const isNewer = (live, running) => typeof live === 'string' && live !== '' && live !== running;

export async function checkForUpdate(fetchFn = fetch) {
  try {
    const r = await fetchFn(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const { version } = await r.json();
    return isNewer(version, BUILD_VERSION) ? version : null;
  } catch { return null; }
}

export function startUpdateWatch(onNewer) {
  let shown = false;
  const run = async () => { if (shown) return; const v = await checkForUpdate(); if (v) { shown = true; onNewer(v); } };
  run();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) run(); });
  setInterval(run, 5 * 60 * 1000);
}
