# PRD §15 pure-logic criteria → tests

| Criterion | Test |
|---|---|
| Answers case-sensitive, "monday" ≠ "Monday" with capitalization note | test/logic/answer.test.js |
| Missed word returns ~3 turns later, ~7 after a correct retry, max 4 per session | test/logic/scheduler.test.js |
| Box movement; only first attempt per day moves up; mastery = 3 distinct days | test/logic/leitner.test.js |
| Sessions 10–12 distinct words, ≤ 3 new | test/logic/scheduler.test.js |
| Crickets / XP / level math | test/logic/rewards.test.js |
| Trophies fire once, on their condition | test/logic/trophies.test.js |
| Import format, per-line errors, replace/add | test/logic/import.test.js |
| Hatch weights, duplicates, evolution gates, egg prices | test/logic/hatch.test.js |
| State shape, migration, corrupt fallback, JSON round-trip | test/logic/storage-schema.test.js |
| No franchise / denylisted content | test/hygiene.test.js + tools/hygiene.sh |

# PRD §15 Phase 2 (Trainer Battles) → tests

| Criterion | Test |
|---|---|
| Arena unlocks at level 3 | test/logic/battle.test.js ("the Arena opens at level 3"), test/e2e/arena.test.js (flags, the whole journey) |
| Battles use the shared scheduler; spaced-repetition updates identical to practice | test/logic/battle.test.js (parity, 500-battle fuzz), test/e2e/battle.test.js ("same answers, same progress"), test/e2e/playthrough.test.js |
| Correct = 1 heart, 3 in a row = special (2 hearts), miss = dodge and requeue | test/logic/battle.test.js (heart maths, a miss), test/e2e/battle.test.js (clean battle, a miss) |
| The player cannot lose; an escape keeps all crickets and XP | test/logic/battle.test.js (escape), test/e2e/battle.test.js (escape) |
| Win: befriend (always, first time, for arena-only species) or bonus crickets; Champion progress | test/logic/battle.test.js (prize, Champion), test/e2e/battle.test.js, test/e2e/playthrough.test.js |
| One arena-only species per land (9), shown in the Creature book once befriended | test/logic/collection.test.js, test/e2e/collection.test.js, test/e2e/art.test.js (108 drawings) |
| A battle-pose variant exists for every species | test/e2e/art.test.js (every species × 3 × 7 poses, both directions) |
| No timers; no animation delays input by more than about 1 s | test/logic/battle-cues.test.js (every cue ≤ 1000 ms), test/e2e/battle-stage.test.js (ends on time), test/e2e/battle.test.js ("typing is never blocked", rapid play) |

## Decisions in plan.md → tests

| Decision | Test |
|---|---|
| D1 hearts scale with the session, capped so a clean run wins, tougher in later lands | test/logic/battle.test.js ("wildHearts"), playthrough (`heartsFor`) |
| D2 victory lap: every word is still asked after the win | test/logic/battle.test.js ("a clean battle", "after the win"), test/e2e/battle.test.js |
| D3 special on every third right answer in a row, with a visible charge | test/logic/battle.test.js (heart maths), test/e2e/battle-stage.test.js ("tired and charged"), test/e2e/battle.test.js |
| D4 the chosen creature is cosmetic; the choice is remembered | test/logic/battle.test.js ("the chosen creature fights"), test/e2e/arena.test.js ("pick who battles") |
| D5 nothing due → Bonus review words; no words → friendly note | test/logic/battle.test.js ("nothing due"), test/e2e/arena.test.js (journey, "no words to spell"), playthrough |
| D6 which wild creature appears, and its stage | test/logic/battle.test.js ("pickWild") |
| D7 prizes (25% for an unowned egg species, cricket bag grows by land) | test/logic/battle.test.js (prize tests), playthrough (`cricketBag`) |
| D8 escape | as above |
| D9 one arena-only species per land (12), never from eggs | test/logic/collection.test.js (10,000 hatches) |
| D10 the off switch hides everything | test/e2e/battle.test.js ("switched off"), test/e2e/arena.test.js, test/e2e/collection.test.js, test/logic/help-content.test.js |

The win is saved the moment the last heart goes (not at the end of the session): test/logic/battle.test.js ("the win is kept the moment").

## Battle animations → tests

| What | Test |
|---|---|
| Every event animates the wild creature, uses its cue length, and cleans up | test/e2e/battle-stage.test.js |
| Frames really change during each animation | test/e2e/battle-stage.test.js (uses tools/battle-filmstrip.mjs) |
| Idle is alive for every species; wings, tails, flames, ears, eyes and sparkles each move; species keep their own tempo | test/e2e/battle-stage.test.js, test/logic/battle-cues.test.js |
| Nothing is clipped, every species × 3 stages, phone and tablet widths | test/e2e/battle-stage.test.js |
| Interrupt safety; pose swaps do not restart the idle | test/e2e/battle-stage.test.js |
| Reduced motion | test/e2e/battle-stage.test.js, test/e2e/battle.test.js, test/logic/battle-cues.test.js |
| Only transform, opacity and filter are animated | test/logic/battle-cues.test.js |
| Arena flags never cover the trail, a star or a Nest | test/e2e/arena.test.js |
| By eye | `node tools/battle-filmstrip.mjs <dir>` writes contact sheets; `node tools/battle-tuning.mjs` prints win rates |

## Twelve lands (plan.md, 2026-11-11) → tests

| What | Test |
|---|---|
| 12 lands, 48 species, one common / uncommon / rare / arena per land; unlock rules, trail (492 steps), egg prices, battle tier, trophies | test/logic/lands.test.js |
| A save from the nine-land game keeps its place and finds the trail extended | test/logic/lands.test.js ("a save from the nine-land game") |
| New creatures are not recolours of old ones; recipes use real parts | test/logic/species-art.test.js |
| Every species × stage × pose draws and fits (48 species) | test/e2e/art.test.js, test/e2e/battle-stage.test.js (run with `npm run check:12`) |
| Map geometry: nothing leaves the map, lands and pins never overlap, the end can be scrolled to; the whole trail can be walked; the gate between lands stops the token | test/e2e/map.test.js |
| Arena flags clear of the trail and stars in every land; a battle, win and befriend in each new land | test/e2e/arena.test.js, test/e2e/battle.test.js |
| Nest prices, hatch targets and books for the new lands | test/e2e/collection.test.js, test/logic/collection.test.js |
| The whole suite passes with 9 lands (what ships) and with 12 | `npm run check`, `npm run check:12` |
