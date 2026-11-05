// Web Speech wrapper (PRD 5, 14). synth/Utterance are injected for tests.
export const SLOW_RATE = 0.6;
export const DEFAULT_RATE = 0.9;

export function pickVoice(voices, voiceURI) {
  if (!voices?.length) return null;
  if (voiceURI) { const m = voices.find((v) => v.voiceURI === voiceURI); if (m) return m; }
  return voices.find((v) => v.lang === 'en-US') ?? voices.find((v) => /^en[-_]/i.test(v.lang)) ?? voices[0];
}

export function rateFor(slow, rate = DEFAULT_RATE) {
  return slow ? Math.min(SLOW_RATE, rate) : rate;
}

export function createSpeaker({ synth = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance, getSettings = () => ({}) } = {}) {
  const available = !!(synth && Utterance);
  const voices = () => (available ? synth.getVoices() : []);
  return {
    get available() { return available && voices().length > 0; },
    voices,
    // Message to show when no voice is available.
    get helpMessage() {
      return this.available ? null : 'No speech voice was found. In your browser or system settings, install or enable an English text-to-speech voice, then reload.';
    },
    speak(text, { slow = false } = {}) {
      if (!available || !text) return false;
      const s = getSettings();
      synth.cancel();
      const u = new Utterance(text);
      const v = pickVoice(voices(), s.voiceURI);
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
      u.rate = rateFor(slow, s.rate ?? DEFAULT_RATE);
      synth.speak(u);
      return true;
    },
    cancel() { if (available) synth.cancel(); },
    // Voices often load late; call cb when the list changes.
    onVoicesChanged(cb) { if (available && 'onvoiceschanged' in synth) synth.onvoiceschanged = cb; },
  };
}
