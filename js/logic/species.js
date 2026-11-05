// Species and regions (names are placeholders to be finalized with the player; all original).
export const REGIONS = [
  { id: 'r1', name: 'Sunny Meadow' },
  { id: 'r2', name: 'Misty Marsh' },
  { id: 'r3', name: 'Ember Peaks' },
  { id: 'r4', name: 'Moonlit Highlands' },
  { id: 'r5', name: 'Coral Reef' },
  { id: 'r6', name: 'Cloudspire' },
];

// Each region: 1 common, 1 uncommon, 1 rare. `art` drives the SVG builder (js/assets/creatures.js).
export const SPECIES = [
  { id: 'burrowby', name: 'Burrowby', region: 'r1', rarity: 'common', flavor: 'Digs tidy tunnels and hides snacks in every one.',
    art: { pal: ['#c98b52', '#8a5a2e', '#f3d9b1'], body: 'round', ears: 'round', tail: 'tuft', face: 'sleepy', s2: ['claws', 'cheeks'], s3: ['stars', 'mane'] } },
  { id: 'thistlefox', name: 'Thistlefox', region: 'r1', rarity: 'uncommon', flavor: 'Its prickly tail keeps secrets and sneaky friends safe.',
    art: { pal: ['#e9873a', '#a8472a', '#fde4c2'], body: 'tall', ears: 'point', tail: 'fluff', face: 'smirk', s2: ['spikes', 'whiskers'], s3: ['stars', 'flame'] } },
  { id: 'glowmoth', name: 'Glowmoth', region: 'r1', rarity: 'rare', flavor: 'Carries a tiny lantern and a very big sense of wonder.',
    art: { pal: ['#f2cf3a', '#b5851b', '#fff3b8'], body: 'round', ears: 'none', tail: 'none', face: 'wide', s1: ['antennae'], s2: ['wings', 'lantern'], s3: ['bigwings', 'stars'] } },

  { id: 'puddlenite', name: 'Puddlenite', region: 'r2', rarity: 'common', flavor: 'A brave little toad who guards every puddle in town.',
    art: { pal: ['#59a14f', '#2f6a35', '#d6efb4'], body: 'wide', ears: 'none', tail: 'none', face: 'wide', s1: ['eyebumps'], s2: ['helmet', 'cheeks'], s3: ['crown', 'spikes'] } },
  { id: 'marshdrake', name: 'Marshdrake', region: 'r2', rarity: 'uncommon', flavor: 'Naps on lily pads and snores in perfect rhythm.',
    art: { pal: ['#3f9c8b', '#1f5e57', '#c4efdf'], body: 'long', ears: 'fin', tail: 'curl', face: 'smirk', s2: ['horns', 'spikes'], s3: ['wings', 'stars'] } },
  { id: 'mossgolem', name: 'Mossgolem', region: 'r2', rarity: 'rare', flavor: 'Part boulder, part garden, entirely gentle.',
    art: { pal: ['#8c8f8a', '#5b6a52', '#6fbf5a'], body: 'block', ears: 'none', tail: 'none', face: 'sleepy', s1: ['leafy'], s2: ['leafy', 'crystals'], s3: ['crystals', 'stars', 'crown'] } },

  { id: 'embernewt', name: 'Embernewt', region: 'r3', rarity: 'common', flavor: 'Warm as toast, and it never minds the cold.',
    art: { pal: ['#e8573a', '#9c2e1f', '#ffd7a8'], body: 'long', ears: 'fin', tail: 'flame', face: 'wide', s2: ['spikes', 'cheeks'], s3: ['horns', 'stars'] } },
  { id: 'cinderling', name: 'Cinderling', region: 'r3', rarity: 'uncommon', flavor: 'Hatched from a sleepy volcano and still yawns sparks.',
    art: { pal: ['#5b5566', '#2e2a38', '#ff9a3c'], body: 'round', ears: 'point', tail: 'flame', face: 'smirk', s2: ['horns', 'flame'], s3: ['bigwings', 'stars'] } },
  { id: 'stormwyrm', name: 'Stormwyrm', region: 'r3', rarity: 'rare', flavor: 'Whistles before the thunder, just to be polite.',
    art: { pal: ['#5d6fd6', '#2e3a8c', '#d6dcff'], body: 'long', ears: 'fin', tail: 'curl', face: 'fierce', s1: ['horns'], s2: ['wings', 'spikes'], s3: ['bigwings', 'bolts', 'crown'] } },

  { id: 'frostbun', name: 'Frostbun', region: 'r4', rarity: 'common', flavor: 'Leaves tiny snowflake footprints wherever it hops.',
    art: { pal: ['#cfe8f7', '#7fb2d6', '#ffffff'], body: 'round', ears: 'long', tail: 'fluff', face: 'sleepy', s2: ['cheeks', 'crystals'], s3: ['crown', 'stars'] } },
  { id: 'moonowl', name: 'Moonowl', region: 'r4', rarity: 'uncommon', flavor: 'Reads bedtime stories to the stars, one page at a time.',
    art: { pal: ['#6b5aa8', '#3a2f6b', '#e4dcff'], body: 'tall', ears: 'point', tail: 'none', face: 'owl', s1: ['beak'], s2: ['wings', 'stars'], s3: ['bigwings', 'crown', 'stars'] } },
  { id: 'starcub', name: 'Starcub', region: 'r4', rarity: 'rare', flavor: 'Half kitten, half griffin, all sparkle.',
    art: { pal: ['#f0b24a', '#a8681d', '#fff0c9'], body: 'round', ears: 'point', tail: 'tuft', face: 'wide', s1: ['whiskers'], s2: ['wings', 'beak'], s3: ['bigwings', 'stars', 'crown'] } },

  { id: 'otterwisp', name: 'Otterwisp', region: 'r5', rarity: 'common', flavor: 'Practices tiny water spells and splashes everything.',
    art: { pal: ['#8a6a4f', '#5a4030', '#e8d3b8'], body: 'long', ears: 'round', tail: 'fluff', face: 'smirk', s1: ['whiskers'], s2: ['hat', 'cheeks'], s3: ['hat', 'stars', 'bubbles'] } },
  { id: 'kelpcoil', name: 'Kelpcoil', region: 'r5', rarity: 'uncommon', flavor: 'Weaves seaweed scarves for shy little fish.',
    art: { pal: ['#2f9c6a', '#17603f', '#b9f0cf'], body: 'long', ears: 'fin', tail: 'curl', face: 'wide', s2: ['spikes', 'bubbles'], s3: ['crown', 'stars', 'bubbles'] } },
  { id: 'inkwell', name: 'Inkwell', region: 'r5', rarity: 'rare', flavor: 'Scribbles love notes and riddles in glowing ink.',
    art: { pal: ['#b04fa5', '#6e2a68', '#f3c9ee'], body: 'round', ears: 'none', tail: 'none', face: 'wide', s1: ['tentacles'], s2: ['hat', 'bubbles'], s3: ['tentacles', 'stars', 'crown'] } },

  { id: 'cloudray', name: 'Cloudray', region: 'r6', rarity: 'common', flavor: 'Glides on warm breezes and collects the softest clouds.',
    art: { pal: ['#9ed0f0', '#4f90c4', '#ffffff'], body: 'wide', ears: 'fin', tail: 'curl', face: 'sleepy', s2: ['cheeks', 'bubbles'], s3: ['bigwings', 'stars'] } },
  { id: 'prismbeetle', name: 'Prismbeetle', region: 'r6', rarity: 'uncommon', flavor: 'Its shell splits sunlight into a tiny rainbow.',
    art: { pal: ['#3fb8c9', '#1b6f7c', '#d1f6fb'], body: 'round', ears: 'none', tail: 'none', face: 'wide', s1: ['shell', 'antennae'], s2: ['crystals', 'horns'], s3: ['crystals', 'stars', 'crown'] } },
  { id: 'skycalf', name: 'Skycalf', region: 'r6', rarity: 'rare', flavor: 'A baby sky whale who sings in low, sleepy hums.',
    art: { pal: ['#5a86c8', '#2c4f8c', '#d8e6fb'], body: 'wide', ears: 'fin', tail: 'curl', face: 'sleepy', s1: ['bubbles'], s2: ['spikes', 'stars'], s3: ['crown', 'stars', 'bigwings'] } },
];

export const STARTER_IDS = ['burrowby', 'puddlenite', 'embernewt'];       // 3 commons (PRD 11)
export const speciesById = (id) => SPECIES.find((s) => s.id === id);
export const regionById = (id) => REGIONS.find((r) => r.id === id);
export const regionIndex = (id) => REGIONS.findIndex((r) => r.id === id);
export const speciesInRegion = (regionId) => {
  const list = SPECIES.filter((s) => s.region === regionId);
  return { common: list.find((s) => s.rarity === 'common').id, uncommon: list.find((s) => s.rarity === 'uncommon').id, rare: list.find((s) => s.rarity === 'rare').id };
};
export const STAGE_TITLES = ['Little', '', 'Grand'];
export const stageName = (speciesId, stage) => `${STAGE_TITLES[stage - 1] ? STAGE_TITLES[stage - 1] + ' ' : ''}${speciesById(speciesId).name}`;
