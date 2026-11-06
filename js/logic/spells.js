// The Spell Master's lessons: spelling rules taught with hand-picked example words.
//
// Every example is checked by test/logic/spells.test.js against an independent formula (CHECKS below), so a word
// can only ship if it really follows the rule it is shown under. Words that only *almost* follow a rule are left
// out on purpose. Nothing here touches saved progress.
//
// Example shapes:  derived  { base, add, word, wrong? }   (word is base + ending, or ending + base for prefixes)
//                  pattern  { word, wrong? }              (the rule is about the letters in the word itself)
// `wrong` is a common misspelling, used as the other choice in "Check yourself". It is never a real word.

const d = (base, add, word, wrong) => ({ base, add, word, wrong });
const p = (word, wrong) => ({ word, wrong });

export const LESSONS = [
  { id: 'silent-e', title: 'The silent e', blurb: 'What happens to a silent e when you add an ending?', groups: [
    { kind: 'dropE', heading: 'Ending starts with a vowel? Drop the e.',
      rule: 'When an ending starts with a vowel (like -ing, -ed or -er), the silent e says goodbye.',
      examples: [d('hope', 'ing', 'hoping', 'hopeing'), d('make', 'ing', 'making', 'makeing'), d('shine', 'ing', 'shining', 'shineing'),
        d('chase', 'ing', 'chasing', 'chaseing'), d('dance', 'ed', 'danced', 'danceed'), d('bake', 'er', 'baker', 'bakeer')] },
    { kind: 'keepE', heading: 'Ending starts with a consonant? Keep the e.',
      rule: 'When an ending starts with a consonant (like -ful, -less, -ly or -ment), the silent e stays.',
      examples: [d('hope', 'ful', 'hopeful', 'hopful'), d('use', 'less', 'useless', 'usless'), d('lone', 'ly', 'lonely', 'lonly'),
        d('love', 'ly', 'lovely', 'lovly'), d('amaze', 'ment', 'amazement', 'amazment'), d('late', 'ly', 'lately', 'latly')] },
  ] },

  { id: 'double', title: 'Double the last letter', blurb: 'Why is it running, not runing?', groups: [
    { kind: 'double', heading: 'Short word, one vowel, one last consonant: double it.',
      rule: 'If a short word has one vowel and ends in one consonant, double that last letter before an ending that starts with a vowel.',
      examples: [d('run', 'ing', 'running', 'runing'), d('stop', 'ed', 'stopped', 'stoped'), d('swim', 'ing', 'swimming', 'swiming'),
        d('big', 'er', 'bigger', 'biger'), d('drop', 'ed', 'dropped', 'droped'), d('clap', 'ing', 'clapping', 'claping')] },
    { kind: 'noDouble', heading: 'Two vowels, or two consonants at the end? Do not double.',
      rule: 'If the word already has two vowels or ends in two consonants, just add the ending.',
      examples: [d('jump', 'ing', 'jumping', 'jumpping'), d('rain', 'ed', 'rained', 'rainned'), d('help', 'ing', 'helping', 'helpping'),
        d('read', 'ing', 'reading', 'readding'), d('look', 'ed', 'looked', 'lookked')] },
  ] },

  { id: 'y-to-i', title: 'When y turns into i', blurb: 'Baby becomes babies. But boy becomes boys!', groups: [
    { kind: 'yToI', heading: 'Consonant + y? Change the y to i.',
      rule: 'If a word ends in a consonant and then y, change the y to i before adding an ending (but not -ing).',
      examples: [d('baby', 'es', 'babies', 'babyes'), d('carry', 'ed', 'carried', 'carryed'), d('try', 'es', 'tries', 'tryes'),
        d('happy', 'ness', 'happiness', 'happyness'), d('funny', 'er', 'funnier', 'funnyer'), d('lucky', 'ly', 'luckily', 'luckyly')] },
    { kind: 'keepY', heading: 'Vowel before the y, or adding -ing? Keep the y.',
      rule: 'If a vowel comes right before the y, or the ending is -ing, the y stays a y.',
      examples: [d('play', 'ed', 'played', 'plaied'), d('stay', 'ed', 'stayed', 'staied'), d('boy', 's', 'boys', 'boies'),
        d('toy', 's', 'toys', 'toies'), d('carry', 'ing', 'carrying', 'carriing'), d('try', 'ing', 'trying', 'triing')] },
  ] },

  { id: 'plurals', title: 'More than one', blurb: 'One box, two boxes. Which words need -es?', groups: [
    { kind: 'es', heading: 'Ends in s, x, ch or sh? Add -es.',
      rule: 'If a word ends in s, x, ch or sh, add -es to make more than one. You can hear the extra beat.',
      examples: [d('box', 'es', 'boxes', 'boxs'), d('glass', 'es', 'glasses', 'glasss'), d('dish', 'es', 'dishes', 'dishs'),
        d('watch', 'es', 'watches', 'watchs'), d('fox', 'es', 'foxes', 'foxs'), d('brush', 'es', 'brushes', 'brushs')] },
  ] },

  { id: 'prefixes', title: 'Little words at the front', blurb: 'Prefixes like un-, re-, dis- and mis-.', groups: [
    { kind: 'prefix', heading: 'A prefix never changes the word it joins.',
      rule: 'Keep every letter of both parts, even when that makes a double letter. un- means not, re- means again, dis- means the opposite, and mis- means wrongly.',
      examples: [d('necessary', 'un', 'unnecessary', 'unecessary'), d('spell', 'mis', 'misspell', 'mispell'), d('appear', 'dis', 'disappear', 'dissapear'),
        d('agree', 'dis', 'disagree', 'dissagree'), d('natural', 'un', 'unnatural', 'unatural'), d('happy', 'un', 'unhappy', 'unhapy')] },
  ] },

  { id: 'endings', title: 'Endings: -ful, -ly, -ness', blurb: 'Is it helpful or helpfull?', groups: [
    { kind: 'ful', heading: 'The ending -ful has just one l.',
      rule: 'The ending -ful is spelled with one l. It is not the word full.',
      examples: [d('help', 'ful', 'helpful', 'helpfull'), d('joy', 'ful', 'joyful', 'joyfull'), d('thank', 'ful', 'thankful', 'thankfull'),
        d('color', 'ful', 'colorful', 'colorfull'), d('wonder', 'ful', 'wonderful', 'wonderfull'), d('power', 'ful', 'powerful', 'powerfull')] },
    { kind: 'meet', heading: 'Same letter meets same letter? Keep both.',
      rule: 'When a word ends in l and you add -ly, or ends in n and you add -ness, you get a double letter. Keep them both!',
      examples: [d('real', 'ly', 'really', 'realy'), d('final', 'ly', 'finally', 'finaly'), d('usual', 'ly', 'usually', 'usualy'),
        d('special', 'ly', 'specially', 'specialy'), d('open', 'ness', 'openness', 'openess'), d('thin', 'ness', 'thinness', 'thiness')] },
  ] },

  { id: 'i-before-e', title: 'I before E', blurb: 'Believe, receive, and neighbor.', groups: [
    { kind: 'ie', heading: 'I before E…',
      rule: 'Most of the time, the letters go i then e.',
      examples: [p('believe', 'beleive'), p('field', 'feild'), p('piece', 'peice'), p('chief', 'cheif'), p('thief', 'theif'), p('shield', 'sheild')] },
    { kind: 'cei', heading: '…except after C.',
      rule: 'After the letter c, the order flips to e then i.',
      examples: [p('receive', 'recieve'), p('ceiling', 'cieling'), p('receipt', 'reciept'), p('deceive', 'decieve')] },
    { kind: 'eigh', heading: '…or when it says “ay”, like neighbor and weigh.',
      rule: 'The letters eigh make the long a sound, like in weigh.',
      examples: [p('eight'), p('weigh', 'wiegh'), p('neighbor', 'nieghbor'), p('freight', 'frieght'), p('sleigh', 'sliegh')] },
  ], note: 'A few words break the rule, like weird and seize. You just have to remember those.' },

  { id: 'silent-letters', title: 'Silent first letters', blurb: 'Knife and wrist start with a letter you cannot hear.', groups: [
    { kind: 'kn', heading: 'kn says n.', rule: 'When a word starts with kn, the k is silent. You only hear the n.',
      examples: [p('knife', 'nife'), p('kneel', 'neel'), p('knuckle', 'nuckle'), p('know'), p('knock'), p('knee')] },
    { kind: 'wr', heading: 'wr says r.', rule: 'When a word starts with wr, the w is silent. You only hear the r.',
      examples: [p('wrist', 'rist'), p('wrong', 'rong'), p('wrench', 'rench'), p('wreck'), p('write'), p('wrap')] },
  ] },

  { id: 'ph', title: 'The ph that says f', blurb: 'Why is phone spelled with ph?', groups: [
    { kind: 'ph', heading: 'ph can say f.', rule: 'Many words that came from Greek use ph for the f sound. Fun fact: phone means sound, photo means light, and graph means write.',
      examples: [p('phone', 'fone'), p('photo', 'foto'), p('graph', 'graf'), p('dolphin', 'dolfin'), p('elephant', 'elefant'), p('alphabet', 'alfabet')] },
  ] },

  { id: 'tion', title: 'The “shun” ending', blurb: 'Nation, action, station.', groups: [
    { kind: 'tion', heading: 'Usually spelled -tion.', rule: 'The sound “shun” at the end of a word is usually spelled -tion.',
      examples: [p('action', 'akshun'), p('nation', 'nashun'), p('station', 'stashun'), p('vacation', 'vacashun'), p('fraction', 'frakshun'), p('addition', 'addishun')] },
  ] },

  { id: 'soft-c', title: 'Soft c and hard c', blurb: 'City says s. Cat says k.', groups: [
    { kind: 'softc', heading: 'c before e, i or y says s.', rule: 'When the letter c comes before e, i or y, it says s. This is the soft c.',
      examples: [p('city', 'sity'), p('face', 'fase'), p('ice', 'ise'), p('pencil', 'pensil'), p('fancy', 'fansy'), p('dance', 'danse')] },
    { kind: 'hardc', heading: 'c before anything else says k.', rule: 'When the letter c comes before any other letter, it says k. This is the hard c.',
      examples: [p('cat', 'kat'), p('cup', 'kup'), p('cold', 'kold'), p('camp', 'kamp'), p('cloud', 'kloud'), p('cost', 'kost')] },
  ] },
];

// ---------- the independent formulas every example must satisfy ----------

const SHORT = /^[^aeiou]*[aeiou][^aeiouwxy]$/; // one vowel, then one final consonant (run, stop, swim)
const startsVowel = (s) => /^[aeiou]/.test(s);
const cFollowers = (word) => [...word.matchAll(/c(.?)/g)].map((m) => m[1]);

export const CHECKS = {
  dropE: ({ base, add, word }) => base.endsWith('e') && startsVowel(add) && word === base.slice(0, -1) + add,
  keepE: ({ base, add, word }) => base.endsWith('e') && !startsVowel(add) && word === base + add,
  double: ({ base, add, word }) => SHORT.test(base) && startsVowel(add) && word === base + base.at(-1) + add,
  noDouble: ({ base, add, word }) => !SHORT.test(base) && startsVowel(add) && word === base + add,
  yToI: ({ base, add, word }) => /[^aeiou]y$/.test(base) && !add.startsWith('i') && word === base.slice(0, -1) + 'i' + add,
  keepY: ({ base, add, word }) => base.endsWith('y') && (/[aeiou]y$/.test(base) || add === 'ing') && word === base + add,
  es: ({ base, add, word }) => /(s|x|ch|sh)$/.test(base) && add === 'es' && word === base + 'es',
  prefix: ({ base, add, word }) => ['un', 're', 'dis', 'mis'].includes(add) && word === add + base,
  ful: ({ base, add, word }) => add === 'ful' && word === base + 'ful' && !word.endsWith('full'),
  meet: ({ base, add, word }) => ['ly', 'ness'].includes(add) && base.at(-1) === add[0] && word === base + add,
  ie: ({ word }) => word.includes('ie') && !word.includes('cie'),
  cei: ({ word }) => word.includes('cei'),
  eigh: ({ word }) => word.includes('eigh'),
  kn: ({ word }) => word.startsWith('kn'),
  wr: ({ word }) => word.startsWith('wr'),
  ph: ({ word }) => word.includes('ph'),
  tion: ({ word }) => word.endsWith('tion'),
  softc: ({ word }) => cFollowers(word).length > 0 && cFollowers(word).every((f) => /^[eiy]$/.test(f)),
  hardc: ({ word }) => cFollowers(word).length > 0 && cFollowers(word).every((f) => !/^[eiy]$/.test(f)),
};

// ---------- how an example is drawn: pieces of the equation, and the finished word with its changed letters marked ----------
// A piece is [text, flag]; flag 'cut' = letter that goes away, 'hl' = letter to point at.

export function showExample(kind, ex) {
  const { base = '', add = '', word } = ex;
  const lit = (t) => [t, ''], hl = (t) => [t, 'hl'], cut = (t) => [t, 'cut'];
  switch (kind) {
    case 'dropE': return { terms: [[lit(base.slice(0, -1)), cut('e')], [lit(add)]], result: [lit(base.slice(0, -1)), hl(add)] };
    case 'yToI': return { terms: [[lit(base.slice(0, -1)), cut('y')], [lit(add)]], result: [lit(base.slice(0, -1)), hl('i'), lit(add)] };
    case 'double': return { terms: [[lit(base)], [lit(add)]], result: [lit(base), hl(base.at(-1)), lit(add)] };
    case 'es': return { terms: [[lit(base)], [lit(add)]], result: [lit(base), hl(add)] };
    case 'prefix': return { terms: [[lit(add)], [lit(base)]], result: [hl(add), lit(base)] };
    case 'keepE': case 'noDouble': case 'keepY': case 'ful': case 'meet':
      return { terms: [[lit(base)], [lit(add)]], result: [lit(base), hl(add)] };
    default: { // pattern lessons: point at the letters the rule is about
      const spot = { ie: 'ie', cei: 'cei', eigh: 'eigh', kn: 'kn', wr: 'wr', ph: 'ph', tion: 'tion' }[kind];
      if (spot) {
        const i = word.indexOf(spot);
        return { terms: null, result: [lit(word.slice(0, i)), hl(spot), lit(word.slice(i + spot.length))].filter(([t]) => t) };
      }
      const out = []; // soft c / hard c: mark every c and the letter after it
      for (let i = 0; i < word.length;) {
        if (word[i] === 'c') { out.push(hl(word.slice(i, i + 2))); i += 2; } else { out.push(lit(word[i])); i += 1; }
      }
      return { terms: null, result: out };
    }
  }
}

// ---------- "Check yourself": up to four questions per lesson, mixed across the lesson's groups ----------

export function quizFor(lesson, max = 4) {
  const lanes = lesson.groups.map((g) => g.examples.filter((e) => e.wrong).map((e) => ({ word: e.word, wrong: e.wrong, rule: g.rule, heading: g.heading })));
  const out = [];
  for (let i = 0; out.length < max && lanes.some((l) => i < l.length); i += 1) {
    for (const l of lanes) if (i < l.length && out.length < max) out.push(l[i]);
  }
  // Alternate which side the right answer sits on, in a fixed pattern, so tests are stable.
  return out.map((q, i) => ({ ...q, options: (q.word.length + i) % 2 ? [q.word, q.wrong] : [q.wrong, q.word] }));
}

export const lessonById = (id) => LESSONS.find((l) => l.id === id);
