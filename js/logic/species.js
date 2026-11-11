import { arenaOn, landCount } from '../config.js';

// Species and regions (names are placeholders to be finalized with the player; all original).
// All lands that exist in the data. Only the first landCount() are live (js/config.js), so a new land can be built and
// tested while the shipped game still has the old number.
export const ALL_REGIONS = [
  { id: 'r1', name: 'Sunny Meadow' },
  { id: 'r2', name: 'Misty Marsh' },
  { id: 'r3', name: 'Ember Peaks' },
  { id: 'r4', name: 'Moonlit Highlands' },
  { id: 'r5', name: 'Coral Reef' },
  { id: 'r6', name: 'Cloudspire' },
  { id: 'r7', name: 'Crystal Caves' },
  { id: 'r8', name: 'Sunset Dunes' },
  { id: 'r9', name: 'Starfall Isles' },
  { id: 'r10', name: 'Harvest Hollow' },
  { id: 'r11', name: 'Lantern Harbor' },
  { id: 'r12', name: 'Wishing Ruins' },
];
export const REGIONS = ALL_REGIONS.slice(0, landCount());

// Each region: 1 common, 1 uncommon, 1 rare. `art` drives the SVG builder (js/assets/creatures.js).
export const ALL_SPECIES = [
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

  { id: 'pebblepup', name: 'Pebblepup', region: 'r7', rarity: 'common', flavor: 'Collects shiny pebbles and keeps the best ones under its pillow.',
    art: { pal: ['#9a8fb0', '#5c5270', '#e4dcf2'], body: 'round', ears: 'round', tail: 'tuft', face: 'sleepy', s2: ['crystals', 'cheeks'], s3: ['crown', 'stars'] } },
  { id: 'geodeling', name: 'Geodeling', region: 'r7', rarity: 'uncommon', flavor: 'Plain on the outside, sparkling on the inside, just like a geode.',
    art: { pal: ['#7d6fc9', '#43388a', '#c9f0ff'], body: 'block', ears: 'none', tail: 'none', face: 'wide', s1: ['crystals'], s2: ['crystals', 'cheeks'], s3: ['crown', 'stars'] } },
  { id: 'gemdrake', name: 'Gemdrake', region: 'r7', rarity: 'rare', flavor: 'Its scales glow in the dark and sing when the cave hums.',
    art: { pal: ['#c04fa0', '#7a2a68', '#ffd1f0'], body: 'long', ears: 'fin', tail: 'curl', face: 'fierce', s1: ['horns'], s2: ['wings', 'crystals'], s3: ['bigwings', 'crown', 'stars'] } },

  { id: 'dunefox', name: 'Dunefox', region: 'r8', rarity: 'common', flavor: 'Giant ears hear a snack rustling three dunes away.',
    art: { pal: ['#e8c27a', '#a87a2e', '#fff1cf'], body: 'tall', ears: 'long', tail: 'fluff', face: 'smirk', s2: ['whiskers', 'cheeks'], s3: ['crown', 'stars'] } },
  { id: 'scarabit', name: 'Scarabit', region: 'r8', rarity: 'uncommon', flavor: 'Rolls a tiny golden sun across the sand every evening.',
    art: { pal: ['#d9692b', '#8a3a12', '#ffd9b0'], body: 'round', ears: 'none', tail: 'none', face: 'wide', s1: ['shell', 'antennae'], s2: ['horns', 'spikes'], s3: ['crown', 'stars'] } },
  { id: 'sandwyrm', name: 'Sandwyrm', region: 'r8', rarity: 'rare', flavor: 'Swims under the dunes and pops up to say hello.',
    art: { pal: ['#e0a23a', '#8a5a12', '#fff0c2'], body: 'long', ears: 'fin', tail: 'curl', face: 'fierce', s1: ['spikes'], s2: ['horns', 'wings'], s3: ['bigwings', 'crown', 'flame'] } },

  { id: 'lumifin', name: 'Lumifin', region: 'r9', rarity: 'common', flavor: 'Glows softly so the other fish never get lost at night.',
    art: { pal: ['#4fa8e8', '#1f5fa8', '#d8f0ff'], body: 'wide', ears: 'fin', tail: 'curl', face: 'wide', s1: ['bubbles'], s2: ['cheeks', 'stars'], s3: ['crown', 'stars', 'bigwings'] } },
  { id: 'nebulynx', name: 'Nebulynx', region: 'r9', rarity: 'uncommon', flavor: 'Leaves a trail of stardust and pounces on shooting stars.',
    art: { pal: ['#7a5fd6', '#3a2a8a', '#eadfff'], body: 'tall', ears: 'point', tail: 'fluff', face: 'smirk', s1: ['whiskers'], s2: ['stars', 'wings'], s3: ['bigwings', 'crown', 'stars'] } },
  { id: 'solphoenix', name: 'Solphoenix', region: 'r9', rarity: 'rare', flavor: 'Rises from its own sparks each sunrise, never in a bad mood.',
    art: { pal: ['#ff7a3a', '#b8341a', '#ffe0a0'], body: 'round', ears: 'none', tail: 'flame', face: 'fierce', s1: ['beak'], s2: ['wings', 'flame'], s3: ['bigwings', 'crown', 'stars'] } },
  { id: 'acornet', name: 'Acornet', region: 'r10', rarity: 'common', flavor: 'Wears an acorn cap to every party and saves the crumbs for later.',
    art: { pal: ['#b9783a', '#6e4220', '#f2dcae'], body: 'round', ears: 'round', tail: 'tuft', face: 'wide', s2: ['cheeks', 'leafy'], s3: ['hat', 'stars'] } },
  { id: 'quillhog', name: 'Quillhog', region: 'r10', rarity: 'uncommon', flavor: 'Rolls through the leaf piles and comes out wearing a whole autumn.',
    art: { pal: ['#8a5a8c', '#4e2f54', '#f0d9f2'], body: 'wide', ears: 'round', tail: 'none', face: 'smirk', s1: ['spikes'], s2: ['spikes', 'whiskers'], s3: ['crown', 'stars'] } },
  { id: 'gourdwyrm', name: 'Gourdwyrm', region: 'r10', rarity: 'rare', flavor: 'Curls up like a pumpkin and rumbles happily when the pie is done.',
    art: { pal: ['#f08a24', '#a8480f', '#ffe3a8'], body: 'long', ears: 'fin', tail: 'curl', face: 'smirk', s1: ['leafy'], s2: ['horns', 'wings'], s3: ['bigwings', 'crown', 'flame'] } },

  { id: 'lampling', name: 'Lampling', region: 'r11', rarity: 'common', flavor: 'Hangs its little lantern on the dock so the boats can find home.',
    art: { pal: ['#3b5a9c', '#1e2f5e', '#ffe9a0'], body: 'round', ears: 'none', tail: 'none', face: 'sleepy', s1: ['antennae'], s2: ['lantern', 'cheeks'], s3: ['lantern', 'stars'] } },
  { id: 'buoypup', name: 'Buoypup', region: 'r11', rarity: 'uncommon', flavor: 'Bobs on the waves and barks once for every ship that sails past.',
    art: { pal: ['#e5484d', '#9c1f2a', '#ffffff'], body: 'round', ears: 'round', tail: 'tuft', face: 'happy', s2: ['hat', 'cheeks'], s3: ['hat', 'stars', 'bubbles'] } },
  { id: 'anglerlight', name: 'Anglerlight', region: 'r11', rarity: 'rare', flavor: 'Its glowing lure lights the harbor, and it shares it with everyone.',
    art: { pal: ['#2a4a7f', '#122244', '#7fe8ff'], body: 'wide', ears: 'fin', tail: 'curl', face: 'fierce', s1: ['lantern'], s2: ['lantern', 'spikes'], s3: ['crown', 'stars', 'bubbles'] } },

  { id: 'runepup', name: 'Runepup', region: 'r12', rarity: 'common', flavor: 'Sniffs out old carvings and wags when it finds a new one.',
    art: { pal: ['#a8a08a', '#6b6450', '#f0ead2'], body: 'round', ears: 'point', tail: 'tuft', face: 'wide', s2: ['crystals', 'cheeks'], s3: ['crown', 'stars'] } },
  { id: 'chimeling', name: 'Chimeling', region: 'r12', rarity: 'uncommon', flavor: 'Rings a soft golden note whenever somebody makes a wish.',
    art: { pal: ['#e0b84a', '#8a6a12', '#fff6d0'], body: 'tall', ears: 'fin', tail: 'none', face: 'sleepy', s1: ['antennae'], s2: ['stars', 'wings'], s3: ['bigwings', 'crown', 'stars'] } },
  { id: 'wishlion', name: 'Wishlion', region: 'r12', rarity: 'rare', flavor: 'Its mane is full of tiny stars, and it saves the brightest for you.',
    art: { pal: ['#f6e08a', '#b58a2a', '#fffbe6'], body: 'round', ears: 'round', tail: 'fluff', face: 'fierce', s1: ['mane'], s2: ['mane', 'wings'], s3: ['bigwings', 'crown', 'stars'] } },
  // Arena-only species: one per land, befriended only by winning a battle there (js/logic/battle.js). Never in eggs.
  { id: 'cloverknight', name: 'Cloverknight', region: 'r1', rarity: 'arena', flavor: 'Guards the meadow with a four-leaf shield and a very loud hello.',
    art: { pal: ['#6fbf5a', '#3d7a34', '#eaf7c8'], body: 'tall', ears: 'round', tail: 'tuft', face: 'fierce', s1: ['leafy'], s2: ['cape', 'helmet'], s3: ['stars', 'crown'] } },
  { id: 'reedwisp', name: 'Reedwisp', region: 'r2', rarity: 'arena', flavor: 'A marsh light that leads lost travelers home, then asks for a story.',
    art: { pal: ['#7fc7c2', '#3b7f86', '#e6fbf7'], body: 'round', ears: 'none', tail: 'curl', face: 'sleepy', s1: ['antennae'], s2: ['wings', 'lantern'], s3: ['bigwings', 'stars'] } },
  { id: 'lavalynx', name: 'Lavalynx', region: 'r3', rarity: 'arena', flavor: 'Purrs like a kettle and naps on the warmest rock it can find.',
    art: { pal: ['#f0703a', '#7a2a1a', '#ffe0b0'], body: 'tall', ears: 'point', tail: 'flame', face: 'fierce', s1: ['whiskers'], s2: ['mane', 'claws'], s3: ['flame', 'stars'] } },
  { id: 'aurorastag', name: 'Aurorastag', region: 'r4', rarity: 'arena', flavor: 'Its antlers catch the northern lights and keep a little for later.',
    art: { pal: ['#7fd6c0', '#3a7f8c', '#f0e6ff'], body: 'tall', ears: 'round', tail: 'tuft', face: 'wide', s1: ['antlers'], s2: ['cheeks', 'stars'], s3: ['bigwings', 'cape'] } },
  { id: 'pearlcrab', name: 'Pearlcrab', region: 'r5', rarity: 'arena', flavor: 'Polishes one pearl all day and gives it away by evening.',
    art: { pal: ['#ff8fa3', '#c0506a', '#fff0f3'], body: 'wide', ears: 'none', tail: 'none', face: 'wide', s1: ['pincers', 'eyebumps'], s2: ['shell', 'bubbles'], s3: ['crown', 'stars'] } },
  { id: 'galeram', name: 'Galeram', region: 'r6', rarity: 'arena', flavor: 'Headbutts storm clouds until they agree to rain somewhere else.',
    art: { pal: ['#f4f4fb', '#8f9bd0', '#ffffff'], body: 'round', ears: 'round', tail: 'fluff', face: 'smirk', s1: ['horns'], s2: ['mane', 'bolts'], s3: ['wings', 'stars'] } },
  { id: 'echobat', name: 'Echobat', region: 'r7', rarity: 'arena', flavor: 'Sings into the caves and giggles when the caves sing back.',
    art: { pal: ['#8a6fd0', '#4a3590', '#e9dcff'], body: 'round', ears: 'point', tail: 'none', face: 'wide', s1: ['batwings'], s2: ['crystals', 'cheeks'], s3: ['crown', 'stars'] } },
  { id: 'miragecat', name: 'Miragecat', region: 'r8', rarity: 'arena', flavor: 'Now you see it, now you see two of it. Only one wants a snack.',
    art: { pal: ['#f2b84a', '#b5622a', '#fff3d0'], body: 'long', ears: 'point', tail: 'curl', face: 'smirk', s1: ['whiskers'], s2: ['hat', 'cheeks'], s3: ['stars', 'bubbles'] } },
  { id: 'cosmoth', name: 'Cosmoth', region: 'r9', rarity: 'arena', flavor: 'Carries a map of the night sky on its wings and never gets lost.',
    art: { pal: ['#5a4fc0', '#2a2470', '#d9ccff'], body: 'tall', ears: 'none', tail: 'none', face: 'owl', s1: ['antennae', 'wings'], s2: ['bigwings', 'stars'], s3: ['crown', 'bolts'] } },
  { id: 'hollowfawn', name: 'Hollowfawn', region: 'r10', rarity: 'arena', flavor: 'Wears fallen leaves like a cloak and tiptoes so the acorns can sleep.',
    art: { pal: ['#d9a35a', '#8a5a2a', '#fff0d2'], body: 'tall', ears: 'round', tail: 'tuft', face: 'wide', s1: ['antlers'], s2: ['leafy', 'cape'], s3: ['crown', 'stars'] } },
  { id: 'sealantern', name: 'Sealantern', region: 'r11', rarity: 'arena', flavor: 'Balances a glowing lantern on its nose and never drops a single beam.',
    art: { pal: ['#7f8fa6', '#46546a', '#eaf0f7'], body: 'long', ears: 'round', tail: 'curl', face: 'smirk', s1: ['whiskers'], s2: ['lantern', 'cape'], s3: ['crown', 'stars'] } },
  { id: 'mythcat', name: 'Mythcat', region: 'r12', rarity: 'arena', flavor: 'Guards the oldest stones and purrs out riddles to anyone who asks nicely.',
    art: { pal: ['#7a9a7a', '#3f5e46', '#e3f2dc'], body: 'tall', ears: 'point', tail: 'curl', face: 'smirk', s1: ['leafy', 'whiskers'], s2: ['cape', 'claws'], s3: ['crown', 'stars', 'flame'] } },
];

export const SPECIES = ALL_SPECIES.filter((s) => REGIONS.some((r) => r.id === s.region));

export const STARTER_IDS = ['burrowby', 'puddlenite', 'embernewt'];       // 3 commons (PRD 11)
export const speciesById = (id) => SPECIES.find((s) => s.id === id);
export const regionById = (id) => REGIONS.find((r) => r.id === id);
export const regionIndex = (id) => REGIONS.findIndex((r) => r.id === id);
export const isArenaSpecies = (id) => speciesById(id)?.rarity === 'arena';
export const NEST_SPECIES = SPECIES.filter((s) => s.rarity !== 'arena');
export const ARENA_SPECIES = SPECIES.filter((s) => s.rarity === 'arena');
export const arenaSpeciesOf = (regionId) => ARENA_SPECIES.find((s) => s.region === regionId)?.id ?? null;
// The species the Creature book counts: arena-only ones join once the Arena is switched on.
export const bookSpecies = () => (arenaOn() ? SPECIES : NEST_SPECIES);
// The three Nest (egg) species of a land, by rarity.
export const speciesInRegion = (regionId) => {
  const list = SPECIES.filter((s) => s.region === regionId);
  return { common: list.find((s) => s.rarity === 'common').id, uncommon: list.find((s) => s.rarity === 'uncommon').id, rare: list.find((s) => s.rarity === 'rare').id };
};
export const STAGE_TITLES = ['Little', '', 'Grand'];
export const stageName = (speciesId, stage) => `${STAGE_TITLES[stage - 1] ? STAGE_TITLES[stage - 1] + ' ' : ''}${speciesById(speciesId).name}`;
