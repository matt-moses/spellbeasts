// Web Speech wrapper (PRD 5, 14). synth/Utterance are injected for tests.
export const SLOW_RATE = 0.6;
export const DEFAULT_RATE = 0.9;

export function pickVoice(voices, voiceURI) {
  if (!voices?.length) return null;
  if (voiceURI) { const m = voices.find((v) => v.voiceURI === voiceURI); if (m) return m; }
  return rankVoices(voices)[0] ?? voices[0];
}

// Voices that usually sound the most natural come first. Names vary by system, so this is a heuristic:
// neural/online/premium/enhanced voices beat plain ones, and robotic-sounding legacy voices go last.
const NATURAL = /(natural|neural|online|premium|enhanced|siri|google|samantha|ava|allison|zoe|aria|jenny|guy|libby|sonia|daniel)/i;
const ROBOTIC = /(espeak|compact|fred|zarvox|trinoids|whisper|bad news|bells|boing|cellos|organ|bubbles|junior|ralph|albert|bahh|deranged|good news|hysterical|superstar|wobble)/i;
export function voiceScore(v) {
  let n = 0;
  if (/^en[-_]us$/i.test(v.lang)) n += 30; else if (/^en[-_]/i.test(v.lang)) n += 20;
  if (NATURAL.test(v.name ?? '')) n += 25;
  if (/(natural|neural|online)/i.test(v.name ?? '')) n += 15;
  if (ROBOTIC.test(v.name ?? '')) n -= 40;
  if (v.localService === false) n += 5;     // cloud-backed voices are usually smoother
  return n;
}
// English voices only, best first (stable for ties). Returns [] if there are none.
export function rankVoices(voices = []) {
  return voices.map((v, i) => [v, i]).filter(([v]) => /^en[-_]/i.test(v.lang))
    .sort(([a, i], [b, j]) => voiceScore(b) - voiceScore(a) || i - j).map(([v]) => v);
}
export function voiceLabel(v) {
  const tags = [];
  if (/(natural|neural|online)/i.test(v.name ?? '')) tags.push('natural');
  return `${v.name} (${v.lang})${tags.length ? ' ★' : ''}`;
}
export const PREVIEW_TEXT = 'Hello! Can you spell the word laughter?';
export const RATES = [0.6, 0.75, 0.9, 1.0, 1.15];

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
