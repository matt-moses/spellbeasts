// Cloudflare Web Analytics: cookieless, anonymous page-view counts (page, referrer, country, device type).
// No custom events: it never sees words, answers, scores or names. Skipped on any host but the live site,
// when the browser sends Do Not Track, or when offline launches can't reach it.
import { CF_BEACON_TOKEN, CF_BEACON_URL, SITE_HOST } from '../config.js';

export function loadAnalytics({ doc = document, hostname = location.hostname, token = CF_BEACON_TOKEN, dnt = globalThis.navigator?.doNotTrack } = {}) {
  if (!token || hostname !== SITE_HOST || dnt === '1' || dnt === 'yes') return false;
  const script = doc.createElement('script');
  script.defer = true;
  script.src = CF_BEACON_URL;
  script.dataset.cfBeacon = JSON.stringify({ token });
  doc.head.append(script);
  return true;
}
