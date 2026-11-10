// What the battle stage shows for each battle event (PRD 12). Pure data and pure functions: js/ui/battle-stage.js
// plays these, css/main.css draws them (@keyframes bs-<anim>), and the tests read this one table for timings.
// Nothing here may take longer than MAX_CUE_MS, and nothing ever waits for an animation to finish.
export const MAX_CUE_MS = 1000;
export const BANNER_MS = 1800;                      // the "A wild ... appears!" banner lingers; it is decoration only
export const TAUNT_GAP_MS = [6000, 10000];          // a waiting wild creature shows off every 6-10 seconds
export const TIRED_AT = 0.25;                       // at a quarter of its hearts or fewer it looks worn out

// Each side: { anim (one name, or several to pick from at random), pose shown while it plays }.
// fx: short-lived decorations. ms: the length of the whole cue.
export const CUES = {
  enter: { ms: 900, player: { anim: 'hop-in', pose: 'ready' }, wild: { anim: 'enter', pose: 'ready' }, fx: ['rustle', 'dust'], sound: 'boing' },
  hit: { ms: 450, player: { anim: 'lunge', pose: 'attack' }, wild: { anim: 'hit', pose: 'hurt' }, fx: ['burst', 'number', 'heart'], sound: 'hit' },
  special: { ms: 800, player: { anim: 'leap', pose: 'attack' }, wild: { anim: 'tumble', pose: 'hurt' }, fx: ['bigburst', 'number', 'heart', 'shake'], sound: 'special' },
  dodge: { ms: 600, player: { anim: 'whiff', pose: 'hurt' }, wild: { anim: ['sidestep', 'duck'], pose: 'dodge' }, fx: ['ghost', 'whoosh'], sound: 'dodge' },
  'win-befriend': { ms: 1000, player: { anim: 'leap', pose: 'cheer' }, wild: { anim: 'befriend', pose: 'smitten' }, fx: ['bigburst', 'number', 'heart', 'hearts', 'confetti'], sound: 'befriend' },
  'win-crickets': { ms: 1000, player: { anim: 'leap', pose: 'cheer' }, wild: { anim: 'swoon', pose: 'dizzy' }, fx: ['bigburst', 'number', 'heart', 'pouch', 'confetti'], sound: 'win' },
  cheer: { ms: 500, player: { anim: 'cheer', pose: 'cheer' }, wild: { anim: 'cheer', pose: 'cheer' }, fx: ['sparkle'], sound: null },
  oops: { ms: 400, player: { anim: 'whiff', pose: 'hurt' }, wild: { anim: 'nod', pose: 'cheer' }, fx: [], sound: null },
  escape: { ms: 900, player: { anim: 'nod', pose: 'cheer' }, wild: { anim: 'escape', pose: 'cheer' }, fx: ['dust'], sound: 'escape' },
  taunt: { ms: 800, player: null, wild: { anim: ['peek', 'hopspin', 'wiggle', 'raspberry'], pose: 'dodge' }, fx: [], sound: null },
};
export const EVENTS = Object.keys(CUES);
const names = (side) => (side ? [side.anim].flat() : []);
// Every animation name a cue can ask for (each needs an @keyframes bs-<name> in the stylesheet).
export const ANIMS = [...new Set(Object.values(CUES).flatMap((c) => [...names(c.player), ...names(c.wild)]))];
export const FX = [...new Set(Object.values(CUES).flatMap((c) => c.fx))];

// A battle turn (from js/logic/battle.js) -> the stage event to play.
export function stageEvent(turn) {
  if (turn.justWon) return turn.prize?.kind === 'befriend' ? 'win-befriend' : 'win-crickets';
  return turn.event;
}

// How the stage looks when nothing is playing. rest = { hearts, heartsLeft, charge, won, prize, escaped }.
export function restView({ hearts, heartsLeft, charge = 0, won = false, prize = null, escaped = false }) {
  const befriended = won && prize === 'befriend';
  return {
    wildPose: won ? 'cheer' : 'ready',
    playerPose: won ? 'cheer' : 'ready',
    tired: !won && !escaped && heartsLeft > 0 && heartsLeft <= Math.max(1, Math.floor(hearts * TIRED_AT)),
    charged: !won && !escaped && charge === 2,
    wildPlace: escaped ? 'gone' : befriended ? 'joined' : 'field',
    pips: won || escaped ? 0 : charge,
  };
}

// The words a screen reader hears (and the test page shows) for an event.
export function announce(event, { name, heartsLeft = 0, damage = 0 } = {}) {
  const left = `${name} has ${heartsLeft} heart${heartsLeft === 1 ? '' : 's'} left.`;
  switch (event) {
    case 'enter': return `A wild ${name} appears! It has ${heartsLeft} hearts.`;
    case 'hit': return `Hit! ${left}`;
    case 'special': return `Special move! ${damage === 1 ? 'One heart' : 'Two hearts'} gone. ${left}`;
    case 'dodge': return `${name} dodged. ${left}`;
    case 'win-befriend': return `You won! ${name} wants to be your friend.`;
    case 'win-crickets': return `You won! ${name} gives you a bag of crickets.`;
    case 'escape': return `${name} waves goodbye and hops away. You keep everything you earned.`;
    default: return '';
  }
}
