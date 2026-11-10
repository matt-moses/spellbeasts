// The battle screen (PRD 12): the ordinary word prompt under a battle stage. Each answer plays an animation and the
// next word is asked straight away: nothing here ever waits for an animation.
import { h } from './dom.js';
import { wordScreen } from './practice.js';
import { createBattleStage } from './battle-stage.js';
import { arenaOn } from '../config.js';
import { speciesById } from '../logic/species.js';
import { CUES, stageEvent } from '../logic/battle-cues.js';

export function battleView(app, regionId) {
  const b = app.battle;
  if (!arenaOn() || !b || b.regionId !== regionId) { queueMicrotask(() => app.go(arenaOn() && regionId ? `/arena/${regionId}` : '/home')); return h('div'); }
  const wildName = speciesById(b.wild.species).name;
  const rest = () => ({ heartsLeft: b.heartsLeft, charge: b.charge, won: b.won, prize: b.prize?.kind ?? null });
  const stage = createBattleStage({ player: b.fighter, wild: b.wild, hearts: b.hearts, heartsLeft: b.heartsLeft, land: regionId, audio: app.audio });
  stage.set(rest());
  if (b.progress.resolved === 0) queueMicrotask(() => stage.play('enter', rest()));
  const react = (r) => {
    const event = stageEvent(r.battle);
    stage.play(event, rest(), { damage: r.battle.damage });
    if (!CUES[event].sound) app.audio.play(r.correct ? 'correct' : 'gentle');
  };
  const scene = {
    el: stage.el, cls: 'battle', quiet: true,
    correct: react, miss: react, corrected() {},
    toast(r) {
      const t = r.battle;
      if (t.justWon) return t.prize.kind === 'befriend' ? `You won! ${wildName} joined you!` : `You won! A bag of ${t.prize.crickets} crickets!`;
      return { hit: 'Hit!', special: 'Special move!', dodge: 'It dodged!', cheer: '✓ Correct!' }[t.event] ?? null;
    },
    // If the words ran out first, the wild creature waves and hops away before the summary. Nothing is lost.
    finish(summary) {
      if (summary.battle.outcome !== 'escaped') return 0;
      stage.play('escape', { ...rest(), escaped: true });
      return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : CUES.escape.ms + 100;
    },
    end() { app.battle = null; },
    destroy() { stage.destroy(); },
  };
  return wordScreen(app, b, scene);
}
