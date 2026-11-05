const phases = [
  ['Scaffold, hygiene check, test harness', true],
  ['Game rules: answers, scheduler, boxes, rewards, trophies, import, hatching, storage', true],
  ['Speech, sound and storage wrappers', false],
  ['Playable spelling turn', false],
  ['Crickets, XP, levels, trophies, streaks', false],
  ['Creatures, nests, evolution', false],
  ['World map', false],
  ['Parent area', false],
  ['Polish and accessibility', false],
  ['Arena battles', false],
];
const app = document.getElementById('app');
app.innerHTML = `<h1>Spellbeasts</h1>
<p>A spelling-bee practice game with collectible creatures. <strong>Under construction.</strong></p>
<ol>${phases.map(([t, d]) => `<li>${d ? '✅' : '⬜'} ${t}</li>`).join('')}</ol>`;
