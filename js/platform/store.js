// localStorage wrapper (PRD 13). Storage is injected so it can be faked in tests.
import { STORAGE_KEY } from '../logic/version.js';
import { migrate, freshState } from '../logic/storage-schema.js';

export function defaultStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function createStore({ storage = defaultStorage(), key = STORAGE_KEY } = {}) {
  let persistent = !!storage;
  let warning = false;
  let state = null;

  // Probe: private windows can expose localStorage but throw on write.
  if (persistent) {
    try { storage.setItem(`${key}.probe`, '1'); storage.removeItem(`${key}.probe`); } catch { persistent = false; }
  }

  function load() {
    let raw = null;
    if (persistent) {
      try { raw = storage.getItem(key); } catch { persistent = false; }
    }
    let parsed = null, corrupt = false;
    if (raw != null) { try { parsed = JSON.parse(raw); } catch { corrupt = true; } }
    const res = corrupt ? { state: freshState(), warning: true } : migrate(parsed);
    state = res.state;
    warning = res.warning;
    return state;
  }

  function save() {
    if (!persistent || !state) return false;
    try { storage.setItem(key, JSON.stringify(state)); return true; } catch { persistent = false; return false; }
  }

  return {
    load, save,
    get state() { return state ?? load(); },
    replace(next) { state = next; return save(); },
    get persistent() { return persistent; },
    get warning() { return warning; },
    dismissWarning() { warning = false; },
  };
}
