# TODO

Things still to build or decide. Newest ideas go at the bottom of each section.

## Up next

### [ ] Trainer Battles (Arena mode): PRD Phase 2

Spec: `docs/spelling-bee-creature-game-prd.md` §12 and the Phase 2 acceptance criteria in §15.

A battle is one practice session that uses the **same scheduler, turn rules and rewards** as normal practice, with a wild creature to beat.

- [ ] **Unlock:** Arena opens at trainer level 3.
- [ ] **Arena spots:** every open land gets an Arena pin on the map. The player picks one owned creature to battle with.
- [ ] **Wild creature:** one of that land's 3 Nest species, or that land's **arena-only species**. It has **5 hearts**.
- [ ] **Turns:**
  - [ ] Correct answer: your creature attacks, the wild one loses 1 heart.
  - [ ] 3 correct in a row: special move, the wild one loses 2 hearts.
  - [ ] Wrong answer: the wild creature dodges (short animation) and the word is requeued as usual.
- [ ] **The player can never lose:** if the queue runs out first the creature "escapes", and all crickets and XP are still kept. No player hearts.
- [ ] **Win:** a chance to befriend it (100% the first time for an arena-only species, otherwise bonus crickets), plus progress toward the Champion trophy (win 10 battles).
- [ ] **Arena-only species:** one per land. The map now has 9 lands, so that means **9** (the PRD said 6). Each needs 3 evolution stages of SVG art, and they show in the Creature book once befriended.
- [ ] **Battle poses:** a battle-pose variant for every owned species, built from the existing SVG parts (no new full illustrations for owned species).
- [ ] **Feel:** no timers or speed bonuses, and no animation may delay input by more than about 1 second.
- [ ] **Wire in the existing hooks:** the `champion` trophy and `battlesWon` already exist in `js/logic/trophies.js` and the trophy context (`profile.battlesWon`), but nothing sets them yet.

How we will know it is done (the same autonomous loop as the other phases):

- [ ] Unit tests for the heart maths (5 hearts, 3-streak = 2 hearts), escape on an empty queue, and the befriend chance.
- [ ] A test that battle answers update boxes, due dates and rewards **identically** to practice (shared code path).
- [ ] An art check that every arena-only species and every battle pose is valid SVG, with the species and pose counts asserted.
- [ ] An end-to-end test: reach level 3, open the Arena, hit, special move, dodge and requeue, win and befriend, see the creature in the Creature book, and Champion progress.
- [ ] Extend the whole-game playthrough (`test/e2e/playthrough.test.js`) so its independent model covers battles too.

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

See `docs/changes-since-prd.md` for everything built beyond the PRD, and `docs/spelling-bee-creature-game-plan.md` for the original plan (Phases 0 to 8 are built).
