# Execution plan: Trainer Battles (Arena mode)

**Source spec:** `docs/spelling-bee-creature-game-prd.md` §12 and the Phase 2 criteria in §15, plus the Arena section of `TODO.md`.
**Written:** 2026-11-10. Supersedes "Phase 9" in `docs/spelling-bee-creature-game-plan.md`.

A battle is one ordinary practice session with a wild creature on screen. Words, scheduling, rewards and spaced repetition come from the existing engine (`js/logic/session.js`); the battle layer only watches the results and adds hearts, animations and a prize.

---

## Decisions taken (defaults for the spec's open questions)

Each is a named constant in `js/logic/battle.js`, so it can be changed in one place.

| # | Question | Decision |
|---|---|---|
| D1 | How many hearts? | Scaled to the session so the fight lasts it: `hearts = min(words + tier, words + floor(words / 3))`, where `tier` is 0 in lands 1–3, 1 in lands 4–6, 2 in lands 7–9. The second term guarantees a clean run always wins. A 10-word battle in Sunny Meadow has 10 hearts and a perfect run wins on answer 8. |
| D2 | What happens after the win? | **Victory lap.** The session always plays every word. The wild creature stays on screen cheering. A battle never shortens or changes the word queue. |
| D3 | When does the special move fire? | On every third correct answer in a row (run of 3, 6, 9…), using the session's existing run counter. It removes 2 hearts. At a run of 2 the player's creature visibly charges up. |
| D4 | Does the chosen creature matter? | Cosmetic only. Any owned creature can battle; its current stage is what is drawn. |
| D5 | Nothing is due today? | The battle uses the Bonus review word set (weakest words). If the trainer has no seen words at all, the Arena shows a friendly "practice first" note. |
| D6 | Which wild creature? | From that land: its arena-only species 40% of the time until befriended (10% after), otherwise one of the 3 Nest species, evenly. Wild stage is cosmetic: stage 1 60%, stage 2 30%, stage 3 10%. |
| D7 | Prize for a win? | Arena-only species not yet owned: always befriended (joins at stage 1). Nest species not yet owned: 25% befriend chance. Everything else: bonus crickets, `5 + 2 × land index`. |
| D7a | When is the win saved? | **Changed while building:** the moment the last heart goes, not at the end of the session, so a win the player has seen is never lost by leaving early. The victory lap still asks every word. |
| D8 | Escape? | If the words run out with hearts left, the creature waves and leaves. Nothing is lost. With D1 this is rare (it needs given-up words), which suits the "can never lose" rule. |
| D9 | Arena-only species count | 9, one per land (the PRD said 6 when there were 6 lands). Total species 36, total creature drawings 108. |
| D10 | Rollout | Built behind `ARENA_ENABLED = false` in `js/config.js`, because every push to `main` goes live. Tests switch it on with `globalThis.SPELLBEASTS_ARENA = true` (same pattern as `SPELLBEASTS_READY_DELAY`). The last phase flips the flag. |

**Out of scope:** player hearts, creature stats or types, trainer-vs-trainer, timers, new trophies beyond the existing Champion.

## Ground rules for every phase

- **No dependency changes** (`AGENTS.md`). Tests use `node --test` and the existing `playwright-core`. Image checks compare PNG buffers; no image-diff package.
- **A phase is done only when `npm run check` is green** (hygiene scan, all unit tests, all end-to-end tests including the two-week playthrough) and its own new tests pass.
- Game rules stay in pure modules under `js/logic/`; screens under `js/ui/`; art under `js/assets/`.
- New shipped files must appear in `sw-assets.js` (run `npm run stamp`); `test/logic/pwa.test.js` and `test/e2e/offline.test.js` guard this.
- New creature and move names must pass `npm run hygiene` (original names only).
- Commit to `main` at the end of each phase. `.github/workflows` is not touched.

## Phase map

```
Phase 1  Battle rules ─────────────┐
                                   ├─► Phase 4  Battle screen ─► Phase 5  Arena on the map ─► Phase 6  Playthrough, polish, switch on
Phase 2  Species, art, poses ─► Phase 3  Animation kit ─┘
```

Phases 1 and 2 are independent of each other and can be built in either order.

---

## Phase 1: Battle rules (pure logic)

**Depends on:** nothing.
**Leaves:** a fully tested `startBattle()` that can be driven from Node with no browser.

### Tasks
- [ ] Record the baseline: `npm ci`, then `npm run check` is green before any change.
- [ ] Add `ARENA_ENABLED = false` to `js/config.js` and an `arenaOn()` helper that honours `globalThis.SPELLBEASTS_ARENA`.
- [ ] `js/logic/session.js`: accept a `mode` label so the saved session row can say `'battle'`. No other change to turn handling.
- [ ] New `js/logic/battle.js`:
  - [ ] Constants for D1, D3, D6, D7 and `ARENA_LEVEL = 3`.
  - [ ] `arenaOpen(profile)`, `wildHearts(words, landIndex)`, `pickWild({ regionId, owned, rng })`, `prizeFor({ wild, owned, landIndex, rng })`.
  - [ ] `startBattle({ profile, list, today, regionId, creatureId, rng })`: wraps `startSession()` (falling back to the bonus set, D5) and returns the same `next / submit / submitCorrection / finish` interface. `submit()` passes the session result through untouched and adds a `battle` field: `{ event: 'hit' | 'special' | 'dodge' | 'cheer', damage, heartsLeft, charged, justWon }`.
  - [ ] `finish()`: sets the outcome (`won` or `escaped`), applies the prize, increments `profile.battlesWon`, records `profile.arena.befriended` and `profile.arena.wins[regionId]`, and runs the trophy check so Champion can fire.
- [ ] `js/logic/storage-schema.js`: add `battlesWon: 0` and `arena: { befriended: [], wins: {} }` to `freshProfile()` (migration already fills defaults, so no schema version bump).
- [ ] `js/logic/trophies.js`: confirm Champion is counted and shown now that `battlesWon` is real.

### How we know it is done (autonomous)
- [ ] `test/logic/battle.test.js`:
  - [ ] Heart maths: hit removes 1, every third in a row removes 2, a miss removes 0 and resets the run, hearts never go below 0.
  - [ ] `wildHearts` for every word count 1–12 and every land: a clean run always wins, and never before the session is about two-thirds played (for 6 or more words).
  - [ ] Victory lap: after `justWon`, the queue is unchanged and later answers report `cheer` with 0 damage.
  - [ ] Escape: a script with given-up words ends `escaped`, with crickets and XP equal to plain practice.
  - [ ] Prize: arena-only unowned always befriends; Nest unowned follows the 25% roll with a seeded generator; owned species pay the cricket bonus; a befriended creature appears in `profile.creatures` at stage 1.
  - [ ] `pickWild` weights over 10,000 seeded rolls land within tolerance, before and after befriending.
  - [ ] Champion fires on the 10th win and only once.
  - [ ] Nothing-due fallback uses the bonus set; no seen words returns `null`.
- [ ] **Parity test:** the same seeded answer script run through `startSession()` and `startBattle()` on cloned profiles gives deep-equal `wordStats`, trail, eggs, streak, XP and (before the prize) crickets.
- [ ] **Fuzz test:** 500 seeded random answer scripts. Invariants: hearts only go down, outcome is `won` or `escaped`, parity holds, no throw.
- [ ] `test/logic/storage-schema.test.js`: an old profile without the new fields migrates; backup and restore round-trip keeps them.
- [ ] `npm run check` green.

---

## Phase 2: Arena-only species, part-grouped art and battle poses

**Depends on:** nothing.
**Leaves:** 36 species that draw in every stage and pose, with existing screens unchanged.

### Tasks
- [ ] `js/logic/species.js`: add 9 species, one per land, with `rarity: 'arena'`, a name, flavour line, palette and parts. Use the existing part vocabulary; add a part only where a creature needs a signature look.
- [ ] Keep arena species out of eggs and starters: audit every use of `SPECIES` and `speciesInRegion` (`hatch.js`, `collection.js`, `profiles.js`, `trophies.js`, `world.js`, `parent.js`) and add `arenaSpeciesOf(regionId)` and `nestSpecies()` helpers. Decide per trophy whether "collect them all" means 27 or 36 and say so in its description.
- [ ] `js/assets/creatures.js`: wrap the drawing in named groups so parts can move on their own: `.c-back` (wings, glow), `.c-tail`, `.c-ears`, `.c-body`, `.c-front`, `.c-face`, `.c-eyes`. Pixel output of the default pose must not change.
- [ ] Add a `pose` option to `creatureSvg()`, composed from existing parts only:
  - [ ] `ready` (leaning in, determined brows), `attack` (open mouth, forward lean), `hurt` (squeezed eyes, wobble mouth), `dodge` (smirk, side glance), `dizzy` (spiral eyes), `cheer` (arms-up bounce, big smile), `smitten` (heart eyes, for befriending).
  - [ ] A `facing: 'left'` option so the wild creature faces the player.
- [ ] `js/ui/collection.js`: Creature book lists arena species in their land as silhouettes with a "Meet it in the Arena" hint until befriended.
- [ ] Update the counts in `README.md` text only where already true after this phase (the rest waits for Phase 6).

### How we know it is done (autonomous)
- [ ] `test/e2e/art.test.js` extended:
  - [ ] All 108 stage drawings are well-formed, self-contained and draw something.
  - [ ] Every species × stage × pose (36 × 3 × 7) is valid XML, has every named group, and its drawing stays inside the view box when facing either way.
  - [ ] Every pose differs from the default drawing for every species.
- [ ] **No-regression snapshot:** before the regroup, save the default-pose screenshot of all 81 existing drawings to the scratchpad; after it, the PNG buffers are identical.
- [ ] `test/logic/hatch.test.js` and `collection.test.js`: 10,000 seeded hatches never produce an arena species; starters exclude them.
- [ ] `test/e2e/collection.test.js`: the book shows 36 entries with 9 arena silhouettes and the hint.
- [ ] `npm run check` green (the existing playthrough proves eggs and trophies did not shift).

---

## Phase 3: Battle animation kit

**Depends on:** Phase 2.
**Leaves:** a self-contained battle stage component that can play every animation on its own, with a test page.

This phase is where the wild creatures come alive. Animations use CSS transforms and opacity only, are driven by a `data-anim` attribute, and never hold up typing.

### Tasks
- [ ] New `js/logic/battle-cues.js` (pure): maps each battle event to an ordered list of cues with durations, for example `special → [charge 250, lunge 200, burst 350, hearts 300]`. One table, so timing is testable.
- [ ] New `js/ui/battle-stage.js`: `createBattleStage({ player, wild, hearts })` returning `{ el, play(event), setHearts(n), destroy() }`.
  - [ ] `play()` never returns a promise the caller must wait on. A new event interrupts the previous animation and jumps the stage to the correct end state, so a fast typist never sees a stale heart count.
  - [ ] Heart row with a text equivalent and a polite live region ("Glowmoth has 4 hearts left").
- [ ] Wild creature animations in `css/main.css`:
  - [ ] **Entrance:** grass rustles, the creature hops in with squash and stretch, and a name banner slides in ("A wild Glowmoth appears!").
  - [ ] **Living idle, driven by its parts:** breathing bob and blinking for all; wings flap, tails sway, flame tails flicker, ears twitch, crystals and stars twinkle. Each part group gets its own gentle loop with staggered timing so no two species move alike.
  - [ ] **Taunts while waiting:** every 6–10 seconds one of a small set (peek, hop, spin, tongue-out smirk), picked at random.
  - [ ] **Hit:** knock-back with squash, a white flash, a star burst in the attacker's colour, a floating "−1", and one heart cracking and popping.
  - [ ] **Special hit:** a larger burst in the player creature's palette, a small stage shake, a tumble and recover, "−2", and two hearts popping one after the other.
  - [ ] **Dodge:** a quick sidestep or duck with an after-image and a cheeky smirk, then back to idle. The wording stays kind: "It dodged! Let's look at the word together."
  - [ ] **Getting tired:** at a quarter of its hearts or less, the idle slows, the creature wobbles and a sweat drop appears.
  - [ ] **Won, befriended:** dizzy spin, sits down, heart eyes, hops across to the player's side, heart burst and confetti.
  - [ ] **Won, not befriended:** dizzy spin, a friendly wave, drops a cricket pouch that flies to the cricket counter, then cheers through the victory lap.
  - [ ] **Escape:** waves goodbye and bounds off with a dust puff.
- [ ] Player creature animations: lunge on a hit, a glowing charge-up at a run of 2, a big leap on the special, a sympathetic flinch on a miss, a cheer on the win.
- [ ] Sounds in `js/platform/audio.js`: `hit`, `special`, `dodge`, `win`, `befriend`, `escape`, respecting the sound setting.
- [ ] **Reduced motion:** every animation has an override in the existing `prefers-reduced-motion` blocks. The stage changes pose and hearts instantly and relies on the text announcements.
- [ ] Test page `test/fixtures/battle-stage.html` that mounts the stage for any species, stage and event from the query string. Not shipped (kept out of `sw-assets.js`).
- [ ] New `tools/battle-filmstrip.mjs`: for a given species, captures frames at 0, 150, 300, 600 and 1000 ms of every animation into the scratchpad as contact sheets.

### How we know it is done (autonomous)
- [ ] `test/logic/battle-cues.test.js`: every battle event has cues; every sequence totals 1000 ms or less; entrance is 1000 ms or less.
- [ ] `test/logic/battle-css.test.js` (reads `css/main.css` as text): every cue name has a matching `@keyframes`; every battle animation class is switched off inside a reduced-motion block; battle keyframes animate only `transform`, `opacity` and `filter`.
- [ ] `test/e2e/battle-stage.test.js` on the test page:
  - [ ] For each event, `getAnimations()` on the wild creature is non-empty while it plays and empty within 1.1 s.
  - [ ] Frames differ: a screenshot at 0 ms and at mid-animation are not byte-identical, for every event.
  - [ ] Idle is alive: two screenshots 400 ms apart differ for every one of the 36 species, and species with wings, tails or flames have a running animation on that part group.
  - [ ] Nothing is clipped: for all 36 species in all 3 stages, the creature's bounding box stays inside the stage at the peak of hit, special, dodge and entrance, at phone (375 px) and tablet (1024 px) widths.
  - [ ] Interrupt safety: firing 10 events in 300 ms leaves the heart row and pose matching the last event.
  - [ ] Reduced motion (`page.emulateMedia({ reducedMotion: 'reduce' })`): no running animations, hearts and pose still update, live region text is correct.
  - [ ] Zero console errors.
- [ ] **Visual review loop:** run `tools/battle-filmstrip.mjs` for one species of each body shape plus all 9 arena species, open the contact sheets, and fix anything that reads badly (stiff, clipped, unreadable, too busy). Repeat until a pass finds nothing. Note the review in the commit message.
- [ ] `npm run check` green.

---

## Phase 4: The battle screen

**Depends on:** Phases 1 and 3.
**Leaves:** a playable battle at `#/battle/<land>` (flag on), start to summary, with plain practice untouched.

### Tasks
- [ ] `js/ui/practice.js`: split the word prompt (clue buttons, answer box, miss feedback, get-ready pause, keyboard shortcuts) from the scene above it. Practice keeps its companion scene; behaviour and element ids do not change.
- [ ] New `js/ui/battle.js`: the same prompt under the battle stage. After each `submit()` it calls `stage.play(result.battle.event)` and immediately asks the next word. No awaits between answer and next word.
- [ ] `js/main.js`: `battle` route, guarded like `practice` (no battle in memory goes home) and by `arenaOn()`.
- [ ] Toasts: "Hit!", "Special move!", "It dodged!", alongside the existing cricket reward text.
- [ ] Charge indicator: three pips under the player creature that fill with the run, so the special is anticipated.
- [ ] `js/ui/summary.js`: a battle result card above the usual summary: befriended (with the new creature and a link to the book), won (bonus crickets), or escaped ("It got away. You keep everything you earned!").
- [ ] Leaving mid-battle behaves exactly as leaving practice does today: answers so far are saved, no win is recorded.
- [ ] `npm run stamp` so the new modules are cached offline.

### How we know it is done (autonomous)
- [ ] All existing practice tests pass unchanged (`smoke`, `screens`, `words`, `playthrough`): proof the split changed nothing.
- [ ] `test/e2e/battle.test.js` with a seeded level-3 trainer:
  - [ ] Clean run: hearts fall 1, 1, 2; the special toast shows on the third; the win lands on the expected answer; the victory lap plays the remaining words; the summary shows the win.
  - [ ] Miss: the dodge plays, the miss feedback and "type it correctly" step work as in practice, the word comes back later, the run pips reset.
  - [ ] Escape: a script that gives up words ends with the escape card and the same crickets and XP as the model predicts.
  - [ ] Befriend: forcing the arena-only wild creature ends with it in `profile.creatures` and on the summary card.
  - [ ] **Typing is never blocked:** immediately after pressing Enter the answer box is focused, empty and accepts keys while the hit animation is still running; the next word is spoken within the same delay as in practice (measured against a practice run in the same test, tolerance 150 ms).
  - [ ] Rapid play: answering 10 words with no pauses ends with the right heart count and outcome.
  - [ ] Reduced motion run reaches the same end state.
  - [ ] Stored state after a battle equals the state after the same answers in practice, apart from the prize and battle fields.
  - [ ] Keyboard only, start to summary. Zero console errors.
- [ ] `test/e2e/offline.test.js`: a battle works offline after one visit.
- [ ] `npm run check` green.

---

## Phase 5: The Arena on the map

**Depends on:** Phase 4 (and Phase 2 for the book).
**Leaves:** the full player journey, still behind the flag.

### Tasks
- [ ] `js/ui/map.js`: an Arena pin beside the Nest pin in every open land. Below level 3 it shows locked with "Opens at level 3". Keyboard reachable with a clear label.
- [ ] New `js/ui/arena.js` at `#/arena/<land>`: pick one owned creature (large tappable cards showing the `ready` pose), see which arena creature lives here (silhouette until befriended), then "Battle!". Remembers the last pick.
- [ ] A one-time "The Arena is open!" moment when level 3 is reached (on the summary and the map).
- [ ] `js/ui/trophies.js`: Champion shows progress (for example 4 of 10).
- [ ] `js/ui/help-content.js`: plain-language FAQs: what a battle is, why you cannot lose, how the special move works, how to befriend arena creatures.
- [ ] `js/ui/parent.js`: battles show in session history as "Battle"; per-word stats unchanged.
- [ ] Befriended creatures behave like any other in the Sanctuary, care screens and games.

### How we know it is done (autonomous)
- [ ] `test/e2e/map.test.js`: with the flag off there is no Arena anywhere; flag on at level 2 shows locked pins; at level 3 they open; locked lands have none.
- [ ] `test/e2e/arena.test.js`: full journey: reach level 3 by playing, see the unlock moment, open the pin, pick a creature, battle, win, befriend, find the creature in the Creature book and Sanctuary, feed it, see Champion progress 1 of 10.
- [ ] The nothing-due and no-seen-words cases (D5) from the Arena screen.
- [ ] `test/logic/help-content.test.js` covers the new FAQs; `test/e2e/help.test.js` still passes.
- [ ] `test/e2e/parent.test.js`: backup, wipe, restore keeps befriended creatures and battle wins.
- [ ] `npm run check` green.

---

## Phase 6: Whole-game playthrough, polish and switching on

**Depends on:** Phases 1 to 5.
**Leaves:** the Arena live for players.

### Tasks
- [ ] Extend `test/e2e/playthrough.test.js`: on some simulated days the session is a battle. Add battles to the test's **independent** model (hearts, special cadence, outcome, prize, wins, Champion) written from this plan's decision table, not by importing `battle.js`.
- [ ] `test/COVERAGE.md`: map each PRD §15 Phase 2 criterion and each decision D1 to D10 to its test.
- [ ] Tuning pass using the fuzz harness from Phase 1: report win rate and "answer on which the win lands" for accuracy levels 60%, 80% and 100% across lands; adjust the constants if a typical 80% speller does not win almost always.
- [ ] Final visual pass with the filmstrip tool across all 36 species at phone and tablet sizes.
- [ ] `tools/screenshots.mjs`: add Arena and battle screenshots; update `README.md` (feature list, creature counts), `docs/changes-since-prd.md`, and tick off the Arena section in `TODO.md`.
- [ ] Set `ARENA_ENABLED = true`, run `npm run stamp`, commit, push.
- [ ] Still needs a person: a real-device check on the child's iPad (touch targets, sound, animation smoothness). List it in `TODO.md`.

### How we know it is done (autonomous)
- [ ] The playthrough passes with battles included and zero console errors.
- [ ] `npm run check` green with the flag on by default, and again with `SPELLBEASTS_ARENA = false` forced in a smoke run to prove the off switch still hides everything.
- [ ] After the push, fetch `version.json` from the live site until it matches, then run the smoke and battle end-to-end tests against the live URL.
- [ ] Every row in `test/COVERAGE.md` names a test that exists and passes.

---

## Risks to watch

- **Art regroup breaking existing looks** (Phase 2): guarded by the byte-identical snapshot check.
- **Animations delaying a fast typist** (Phases 3 and 4): guarded by the interrupt-safety and typing-never-blocked tests.
- **Arena species leaking into eggs or "collect all" trophies** (Phase 2): guarded by the seeded hatch test and the existing playthrough.
- **Befriending making eggs pointless** (D7): the 25% chance is one constant; the Phase 6 tuning report shows how often it happens.
- **Playthrough test time** (currently up to 280 s): battles reuse session turns, so the cost is the model, not extra play. Raise the timeout only if measured.
