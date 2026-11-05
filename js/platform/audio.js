// Generated sound (PRD 5): Web Audio only, no files. Context/timers injected for tests.
const SOUNDS = {
  correct: [[660, 0.12], [880, 0.18]],
  chime: [[523, 0.1], [659, 0.1], [784, 0.2]],
  hatch: [[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.25]],
  levelup: [[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.3]],
  chirp: [[1200, 0.05], [1600, 0.08]],
  gentle: [[330, 0.15]], // soft, never harsh, for a miss
  boing: [[300, 0.06], [520, 0.07], [420, 0.09]],
  whoosh: [[900, 0.05], [700, 0.05], [500, 0.05], [300, 0.08]],
  giggle: [[700, 0.05], [920, 0.05], [700, 0.05], [980, 0.07]],
  pop: [[1300, 0.04], [320, 0.06]],
  squeak: [[1500, 0.05], [1900, 0.08]],
  tune: [[523, 0.09], [659, 0.09], [784, 0.09], [659, 0.09], [523, 0.12]],
  tada: [[392, 0.08], [523, 0.08], [659, 0.08], [784, 0.2]],
};
const MUSIC = [262, 330, 392, 330, 294, 349, 440, 349];

export function createAudio({ makeContext = () => new (globalThis.AudioContext ?? globalThis.webkitAudioContext)(), setTimer = setInterval, clearTimer = clearInterval, getSettings = () => ({ sound: true, music: true }) } = {}) {
  let ctx = null, musicTimer = null, step = 0;
  const ensure = () => {
    if (!ctx) { try { ctx = makeContext(); } catch { ctx = null; } }
    if (ctx?.state === 'suspended') ctx.resume?.();
    return ctx;
  };
  function tone(freq, start, dur, type = 'sine', gain = 0.12) {
    const c = ensure(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime?.(0.0001, c.currentTime + start + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + start); o.stop(c.currentTime + start + dur);
  }
  const api = {
    play(name) {
      if (!getSettings().sound || !SOUNDS[name]) return false;
      let t = 0;
      for (const [f, d] of SOUNDS[name]) { tone(f, t, d); t += d; }
      return true;
    },
    startMusic() {
      if (musicTimer || !getSettings().sound || !getSettings().music) return false;
      musicTimer = setTimer(() => {
        const s = getSettings();
        if (!s.sound || !s.music) return api.stopMusic();
        tone(MUSIC[step++ % MUSIC.length], 0, 0.4, 'triangle', 0.04);
      }, 500);
      return true;
    },
    stopMusic() { if (musicTimer) { clearTimer(musicTimer); musicTimer = null; } },
    get musicPlaying() { return !!musicTimer; },
    sounds: Object.keys(SOUNDS),
  };
  return api;
}
