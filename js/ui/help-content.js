import { arenaOn } from '../config.js';

// Kid-friendly FAQs. Keep answers short and simple (a test checks length and reading ease).
export const FAQ = [
  { group: 'Spelling', items: [
    { q: 'How do I play?', a: 'Listen to the word, then type how it is spelled and press Enter. You get crickets for every right answer.' },
    { q: 'Can I hear the word again?', a: 'Yes, as many times as you like! Press Say again, or press the space bar when the box is empty. Say slowly says it in slow motion.' },
    { q: 'What do the other buttons do?', a: 'Definition tells you what the word means. Part of speech says if it is a noun, verb or something else. Sentence uses the word in a sentence.' },
    { q: 'Do capital letters matter?', a: 'Yes! A word like Monday needs a big M. If your letters are right but the capitals are wrong, the game will tell you.' },
    { q: 'What happens if I get one wrong?', a: 'No worries! You will see how to spell it, then type it once to keep going. The word comes back soon so you can try again.' },
    { q: 'What does mastered mean?', a: 'A word is mastered when you spell it right on your first try on 3 different days. That is how you know it really stuck!' },
  ] },
  { group: 'Prizes and levels', items: [
    { q: 'What are crickets?', a: 'Crickets are your coins. You earn them for right answers and finishing practice. Use them to buy eggs and feed your creatures.' },
    { q: 'What are levels and XP?', a: 'XP is a score that goes up when you spell. When your XP bar fills up, you go up a level and unlock new things!' },
    { q: 'What are trophies?', a: 'Trophies are prizes for cool things you do, like a perfect practice or a hatched egg. Look in the Trophy case to see them all.' },
    { q: 'What is a streak?', a: 'A streak counts the days in a row you practice. You get one free rest day each week, so one missed day will not break it.' },
  ] },
  { group: 'Creatures', items: [
    { q: 'How do I get a new creature?', a: 'Tap an egg nest on the map and buy an egg with crickets. Right answers warm the egg up. When it is ready, tap Hatch!' },
    { q: 'How do my creatures grow?', a: 'Feed them crickets in the Sanctuary. When a creature is full and you have reached the level it needs, tap Evolve to make it bigger!' },
    { q: 'How do I take care of my creatures?', a: 'Open Care and play. Give berries, a bath, love and games to fill the four meters. If you have practiced words today, a creature that is happy on every meter leaves you a gift!' },
    { q: 'Where do I get berries?', a: 'You find berries when you finish practice and when you open treasure stars. Spelling is how you get them!' },
    { q: 'Why do games cost crickets?', a: 'Spelling words earns crickets, and crickets let you play. A game costs 3 crickets when you finish it, and a great game gives 1 back. Leaving a game early costs nothing. Out of crickets? Practice some words!' },
    { q: 'What happens when I tap my creature?', a: 'Try it and see! It does something different each time.' },
  ] },
  { group: 'The map', items: [
    { q: 'How do I move on the map?', a: 'Every word you spell right on the first try moves you one step along the path. You do not need to drag your buddy.' },
    { q: 'What are the stars on the path?', a: 'They are treasure! When your buddy has walked past a star, tap it to open it and find crickets and a berry.' },
    { q: 'Why is a land foggy?', a: 'It is locked. The sign tells you what you need, like a higher level or more mastered words. Keep practicing and the fog will clear!' },
    { q: 'How do I see the other lands?', a: 'Drag the map sideways, swipe it, or tap the arrow buttons. The game keeps your buddy in view.' },
  ] },
  { group: 'Trouble?', items: [
    { q: 'What if I cannot hear the word?', a: 'Ask a grown-up to check that the sound is on and the volume is up. Your device also needs an English voice turned on.' },
    { q: 'Why are my creatures hungry?', a: 'They are hungry on days you have not practiced yet. Do a practice and they will perk right up!' },
    { q: 'How do I change my word list?', a: 'That is for grown-ups. They can open the Parent area from the home screen. It asks the year they were born, to check they are grown up.' },
  ] },
];

// Shown once the Arena is switched on (js/config.js).
export const ARENA_FAQ = { group: 'Battles', items: [
  { q: 'What is a battle?', a: 'A battle is spelling practice with a wild creature watching. Tap an Arena flag on the map, pick your creature and press Battle!' },
  { q: 'How do I win a battle?', a: 'Every right answer is a hit that takes one heart from the wild creature. Take all its hearts and you win!' },
  { q: 'What is a special move?', a: 'Spell three words right in a row and your creature does a special move. It takes two hearts at once!' },
  { q: 'Can I lose a battle?', a: 'No, never! If you run out of words the wild creature just hops away. You keep all your crickets and XP.' },
  { q: 'How do I make friends with a wild creature?', a: 'Win a battle! Each land has one special creature that lives only in its Arena. It joins you the first time you beat it.' },
  { q: 'When does the Arena open?', a: 'The Arena opens when you reach level 3. Until then the flags on the map are grey.' },
] };
// The groups to show: the battle questions slot in after Creatures.
export const faqGroups = () => (arenaOn() ? [...FAQ.slice(0, 3), ARENA_FAQ, ...FAQ.slice(3)] : FAQ);
