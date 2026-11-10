# TODO

Things still to build or decide. Newest ideas go at the bottom of each section.

## Up next

### [ ] Trainer Battles (the Arena): real-device check

**Status: built, tested and switched on** (`ARENA_ENABLED = true` in `js/config.js`). See `plan.md` for the plan and the decisions taken, and `test/COVERAGE.md` for which test covers what.

- [ ] **Real-device check on the child's iPad:** touch targets on the Arena flags and the creature picker, battle sounds, and whether the animations are smooth. This is the one thing the automated tests cannot see.
- [ ] **Watch the 25% befriend chance** for egg species (`NEST_BEFRIEND_CHANCE` in `js/logic/battle.js`). If battles make buying eggs feel pointless, lower it.
- [ ] **Names** of the 9 arena-only creatures are placeholders like the rest (see "Final names" below).

### [ ] Spell Master: make the lessons clearer, then switch it on

**Status: built, tested and committed, but switched OFF.** The home tile and the `#/learn` screens are hidden by `SPELL_MASTER_ENABLED = false` in `js/config.js`. To turn it on, set that to `true` (this also un-skips `test/e2e/learn.test.js`).

What exists: a snowy owl in a magician's hat teaches 11 spelling rules (`js/logic/spells.js`, `js/ui/learn.js`, art in `js/assets/spellmaster.js`). Every example word is verified against a rule formula in `test/logic/spells.test.js`; those unit tests still run while it is off.

Before switching it on:

- [ ] **Make the lessons clearer for a 4th grader.** Reread each rule and heading in plain words, try them with the child, and rewrite whatever confuses them (for example "consonant", "vowel ending" and "prefix" may need a quick "what is that?" line).
- [ ] **Check the examples and the made-up wrong spellings by eye** (the tests check the pattern, not whether a word is real).
- [ ] **Decide how it fits the game:** where it lives (tile only, or also a hint after a missed word), and whether finishing lessons or quizzes should earn anything.
- [ ] **Real-device check** on the child's iPad, then flip the flag.

## Known gaps and open questions

- [x] **Settings screen** (PRD §10.1): voice picker (natural voices first, with preview), speed, sound and music. Done.
- [x] **Per-word pronunciation respelling** ("say it like"), editable in the Parent area, kept only in the browser. Done.
- [ ] **Final names** for the game, the creatures and the lands, and the three starters (PRD open question 2). Current names are placeholders.
- [ ] **"Practice only missed words"** button on the map (PRD open question 3). Bonus review covers part of this.
- [ ] **Default voice**: try the available Chromebook voices (PRD open question 4).
- [ ] **First session length:** a brand-new trainer's first session has only 3 words (the PRD caps new words at 3 per session and nothing is due yet). Decide whether to allow more new words early.
- [ ] **Keeping a streak when nothing is due:** today only the Bonus review button can do it. Consider a gentler path.
- [ ] **CI:** `.github/workflows/ci.yml` is committed but has not run on GitHub yet. Check the first run (it assumes `google-chrome` exists on the runner).

## Done

See `docs/changes-since-prd.md` for everything built beyond the PRD, and `docs/spelling-bee-creature-game-plan.md` for the original plan (Phases 0 to 8 are built). Trainer Battles (PRD Phase 2) followed `plan.md`.
