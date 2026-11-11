# Execution plan: Three new lands (r10–r12)

**Source:** no separate PRD exists. The brief below is the spec, taken from the code survey and the request "build three new lands". It follows `docs/spelling-bee-creature-game-prd.md` §11 and §11A for how lands, species and the trail work.
**Written:** 2026-11-11. Replaces the Trainer Battles plan that was here (shipped; see git history at `f4c23b2`).

**Goal:** the map goes from 9 to 12 lands and the book from 36 to 48 species. Each new land has 3 Nest species (common, uncommon, rare) and 1 Arena-only species, a patch on the map, scenery, a fog gate with an unlock rule, a battle backdrop, and a longer trail.

## Status (2026-11-11): built, committed locally, not pushed

All five phases are done. `npm run check` (12 lands, the new default) passes: 347 tests, 0 failures, hygiene OK. The whole suite also passes with the original nine lands (`SPELLBEASTS_LANDS=9`), and `npm run check:12` runs the 12-land variant explicitly. **Pushing to `main` is the go-live and is waiting on the user.**

Where the build differed from the plan:
- **Egg prices** (`js/logic/hatch.js`): `EGG_PRICES` had only nine entries and would have priced new eggs as `undefined`. Added 145, 165, 190 (D7a).
- **Arena flags** (`js/ui/map.js`): with 12 lands the flag for Crystal Caves landed 8 px from the trail. `arenaSpot` now keeps the old choice when it is clear and otherwise looks further out, judging the whole flag.
- **Creature art:** the first drafts of seven creatures were near-recolours (the new `test/logic/species-art.test.js` caught four); they were redrawn with existing parts, so no new art parts were needed.
- **Unlock rule:** `test/logic/world.test.js` used to require every land to be reachable with a 50-word list. Lands 10-12 need 53, 56 and 60 mastered (D3), so the test now allows 60 for them. To keep the new lands reachable by default, the bundled sample list grew from 15 to 75 words (60 harder ones added in `data/sample-words.js`). Saves made before this keep their own 15-word copy; only new trainers and "restore the sample list" get 75.
- **Playthrough:** with the 75-word list the two-week model now plays 39 sessions and reaches 8 lands (it needs level 18 for land 10, which two weeks of play does not reach). The new lands are reached by `test/e2e/newlands.test.js`, which starts a trainer one session short of each requirement and plays it through the UI, and covered by `lands.test.js`, `map.test.js`, `arena.test.js`, `battle.test.js` and `collection.test.js`. The planned "grep for stale literals" check was replaced by running the suite at both 9 and 12.
- **Timeouts:** the two "nothing is clipped" tests and the idle test were given longer limits (48 species, run alongside the rest of the suite on a Raspberry Pi).

**Out of scope:** new game modes, new creature body or part types unless the art review (Phase 2) shows a species is too similar to an existing one, rebalancing lands 1–9, new dependencies.

---

## What changes, by file

| Area | Files | Change |
|---|---|---|
| Land and species data | `js/logic/species.js` | 3 `REGIONS`, 12 `SPECIES` (9 nest + 3 arena) |
| Progression | `js/logic/world.js` | 3 `UNLOCKS` rows, 3 `REGION_STEPS` entries (`TOTAL_STEPS` 342 → 492) |
| Egg prices | `js/logic/hatch.js` | `EGG_PRICES` is a 9-entry table; add 145, 165, 190 (found while building Phase 1: without them lands 10–12 would sell eggs for `undefined`) |
| Battle difficulty | `js/logic/battle.js` | `heartTier` cap 2 → 3, comment updated |
| Trophies | `js/logic/trophies.js` | `explorer-12` added; `explorer-9` text made "Open 9 lands" |
| Map | `js/ui/map.js` | `W` 2800 → ~3750, more `POINTS`, 3 `COLORS`, 3 `SCENERY` functions, clouds, nothing else is per-land |
| Battle backdrops | `css/main.css` | 3 `.battle-stage[data-land=…]` rules |
| Creature art | `js/assets/creatures.js` | Only if a new species needs a part that does not exist yet |
| Docs and tests | `README.md`, `docs/changes-since-prd.md`, `test/**`, `test/COVERAGE.md` | Literals `9`, `36`, `342`, `r9` replaced by values derived from the data |

Saves store only `unlockedRegions` and `trailStep`, so old profiles need no migration. A player at the end of the old trail simply finds it extended and a new gate ahead (proved in Phase 1).

---

## Decisions taken (defaults; each is one constant or one table row)

| # | Question | Decision |
|---|---|---|
| D1 | Land names and themes | Proposals, **to be confirmed by the user in Phase 1** (`TODO.md` still lists final names as open). **r10 Harvest Hollow** (autumn orchard, orange and amber), **r11 Lantern Harbor** (night seaside town, teal and warm yellow), **r12 Wishing Ruins** (mossy stone and soft gold). |
| D2 | Species names (proposals, all must pass `npm run hygiene` and be unique) | r10: Acornet (common), Quillhog (uncommon), Gourdwyrm (rare), Hollowfawn (arena). r11: Lampling, Buoypup, Anglerlight, Sealantern (arena). r12: Runepup, Chimeling, Wishlion, Mythcat (arena). Starters stay the same three. |
| D3 | Unlock rules | r10: level 18 and 53 words mastered. r11: level 20 and 56. r12: level 22 and 60. (Today's last three: 12/44, 14/47, 16/50.) Level 22 needs 12,600 XP (`xpForLevel`), about twice level 16. |
| D4 | Trail length per land | 48, 50, 52 steps, continuing the "+2 each land" rule. `LANDMARK_EVERY` stays 10, so stars go from 34 to 49. |
| D5 | Battle difficulty | `heartTier = min(3, floor(landIndex / 3))`: lands 10–12 get +3 hearts. `wildHearts` already caps hearts at what a clean run can deal, so a clean run still always wins. |
| D6 | Trophies | `explorer-12` "Open all 12 lands" is added. Existing earned trophies are never revoked. `collector-all` is checked: its condition is `speciesOwned >= speciesTotal`, so players who had 36 of 36 keep the badge they earned, and the book then shows 36 of 48. |
| D7 | Rollout | Built behind a land-count flag, because every push to `main` goes live. `LAND_COUNT = 9` in `js/config.js`, with a `landCount()` helper that honours `globalThis.SPELLBEASTS_LANDS` (same pattern as `arenaOn()`). Tests switch it to 12 through that global; **all data for the new lands is present but filtered out** until the flag is raised. Phase 5 raises the default and is the go-live commit. |
| D7a | Egg prices | 145, 165, 190 crickets for lands 10–12 (steps of +20, +20, +25, continuing the table's rising steps). `eggNeeded` is already a formula. |
| D8 | Word-list size | Mastery thresholds above 50 only matter with a big custom list. The bundled sample list stays as is; the Parent area is unchanged. Noted in the README. |

## Ground rules for every phase

- **No dependency changes** (`AGENTS.md`). Tests use `node --test` and the existing `playwright-core`.
- **A phase is done only when `npm run check` is green** (hygiene, unit tests, end-to-end tests) **and** its own new checks pass. From Phase 1 on, `npm run check:12` (added in Phase 1: the same suite with `SPELLBEASTS_LANDS=12`) is also run, and it is allowed to fail only on the literals Phase 5 will fix. Each phase lists which failures are expected.
- Game rules stay in `js/logic/`, screens in `js/ui/`, art in `js/assets/`.
- New shipped files need `npm run stamp` (updates `sw-assets.js`); `test/logic/pwa.test.js` and `test/e2e/offline.test.js` guard this.
- Commit to `main` at the end of each phase. Phases 1–4 are invisible to players (flag off), so pushing them is safe. **Pushing Phase 5 is the go-live; confirm with the user first.** `.github/workflows` is not touched.
- The e2e suite needs a Chromium for `playwright-core`; if none is found the tests skip, so the first task of Phase 1 confirms they actually run.

## Phase map

```
Phase 1  Flag, data and rules ─► Phase 2  Species art ─────┐
                              └► Phase 3  The map ─────────┼─► Phase 4  Nest, Arena, book, battles ─► Phase 5  Playthrough, tests and docs, switch on
```

Phases 2 and 3 both depend on Phase 1 but not on each other. Phase 4 needs both. Phase 5 needs all.

---

## Phase 1: Flag, data model and progression rules (pure logic)

**Depends on:** nothing.
**Leaves:** with the flag at 9 the game is byte-for-byte what ships today; with it at 12 the logic layer knows all 12 lands, and a Node test proves the rules.

### Tasks
- [ ] Baseline: `npm ci`, then `npm run check` is green. Confirm the e2e tests run (not skipped) and note the counts.
- [ ] Ask the user to confirm or change the names in D1 and D2 and the thresholds in D3. Record the answers in the table above.
- [ ] `js/config.js`: add `LAND_COUNT = 9` and `landCount()` honouring `globalThis.SPELLBEASTS_LANDS`.
- [ ] `js/logic/species.js`: define `ALL_REGIONS` (12) and `ALL_SPECIES` (48). Export `REGIONS = ALL_REGIONS.slice(0, landCount())` and `SPECIES` filtered to active regions, so every existing import keeps working. Species use only existing art parts for now, with distinct palettes; Phase 2 reviews them.
- [ ] `js/logic/world.js`: extend `UNLOCKS` and `REGION_STEPS` to 12 and slice both to `landCount()` so `REGION_END`, `TOTAL_STEPS` and `LANDMARKS` follow.
- [ ] `js/logic/battle.js`: `heartTier` cap 3; fix the comment that lists tiers.
- [ ] `js/logic/trophies.js`: `explorer-9` text "Open 9 lands"; add `explorer-12`.
- [ ] `test/lands-env.mjs`: a tiny `--import` preload that copies `SPELLBEASTS_LANDS` from the environment onto `globalThis`. `package.json` gets scripts `test:12` and `check:12` that use it (scripts only, no dependency change). `test/e2e/helpers.js` forwards the same variable into the page with the same init script that already sets `SPELLBEASTS_ARENA`.

### How we know it is done (autonomous)
- [ ] `test/logic/lands.test.js` (sets the global, then imports dynamically, so it runs under plain `npm test`):
  - [ ] 12 regions with ids `r1..r12`, in order; 48 species with unique ids and names; every region has exactly one each of common, uncommon, rare and arena.
  - [ ] `NEST_SPECIES` is 36 (3 per land) and `ARENA_SPECIES` is 12; `bookSpecies()` is 48 with the Arena on and 36 with it off.
  - [ ] `UNLOCKS` levels and mastery counts never decrease; `REGION_STEPS` strictly increases; `TOTAL_STEPS` is 492; `maxStep` for each unlocked set equals that land's `REGION_END`; `regionOfStep` is correct at every boundary (1, `REGION_END[i]`, `REGION_END[i]+1`).
  - [ ] `updateUnlocks` opens r10 only when level 18 **and** 53 mastered (each missing half keeps it closed), likewise r11 and r12; `unlockRequirement` strings read correctly.
  - [ ] `wildHearts` for words 1–12 in every land: a clean run always wins, never below 1; lands 10–12 are one tier above 7–9.
  - [ ] `explorer-12` fires only at 12 open lands and only once; `explorer-9` still fires at 9.
  - [ ] **Old-save test:** a profile with `trailStep: 342`, `unlockedRegions` r1–r9 and all 34 landmarks claimed loads at 12 lands, shows 15 unclaimed landmarks to come, keeps its token where it is, and can step into land 10 only after r10 unlocks.
  - [ ] `pickWild`/`prizeFor` work for r10–r12 (seeded, 10,000 rolls within tolerance); `claimLandmark` pays out for the new stars.
- [ ] **Flag-off guard:** the existing suite is unchanged and green with the flag at its default 9 (`npm run check`).
- [ ] Hygiene is green with all 12 new species and 3 land names present.
- [ ] `npm run check:12` runs. Expected failures: only tests that hardcode 9, 36 or 342 (listed in a scratch file for Phase 5). Anything else is a bug.

---

## Phase 2: Species art for the 12 new creatures

**Depends on:** Phase 1.
**Leaves:** all 48 species draw in every stage and battle pose, look distinct from each other, and fit their boxes.

### Tasks
- [ ] Review each new `art` recipe against the existing 36: body, face, ears, tail, extras and palette. Adjust until each new species is visibly its own creature.
- [ ] Add new parts to `js/assets/creatures.js` (a body, ear, tail or extra) only where the recipes cannot make the theme (for example a lantern for Lampling or a flame-free glow for Anglerlight). New parts must work in all three stages and all seven battle poses.
- [ ] Check name originality (D2) against the hygiene scan and the species list.
- [ ] Render a contact sheet with `tools/screenshots.mjs` (or a small script in the scratchpad) of all 48 species at stage 1, 2 and 3 and look at the new ones.

### How we know it is done (autonomous)
- [ ] `test/e2e/art.test.js` (run with the flag at 12): every species × 3 stages × 7 poses × both directions is valid, fully grouped, and stays in its box. The expected count is computed from `SPECIES.length`, so it reads 48 × 3 × 7 × 2 = 2016.
- [ ] `test/e2e/battle-stage.test.js` at 12: idle is alive for all 48; nothing is clipped at phone and tablet widths.
- [ ] **Distinctness test:** no two species render to the same SVG at the same stage; each new species' main colour is at least a set colour distance from every other species in the **same** land, so three siblings cannot look alike.
- [ ] **Visual review:** I read the contact-sheet PNG (Read tool handles images) and compare the 12 new creatures with the existing ones. Anything that looks like a recolour gets another pass.
- [ ] `npm run check` green (flag 9, unchanged).

---

## Phase 3: The map

**Depends on:** Phase 1. (Does not need Phase 2.)
**Leaves:** with the flag at 12 the map shows 12 lands on a longer trail, nothing overlaps, and the token can walk the whole way.

### Tasks
- [ ] `js/ui/map.js`:
  - [ ] Raise `W` (about 3750) so each land keeps roughly the same width as today.
  - [ ] Extend `POINTS` with a continuing winding route; keep the Catmull-Rom path inside the 620-high frame.
  - [ ] Add `COLORS` for r10–r12 (D1 palettes) and make the 9 existing colours the first nine.
  - [ ] Add three `SCENERY` functions (Harvest Hollow: trees with orange leaves, pumpkins, haystacks; Lantern Harbor: lampposts, boats, barrels; Wishing Ruins: broken pillars, glowing stones, vines).
  - [ ] Extend `CLOUDS`; check the park props loop (`80` props) still fills the longer map evenly, raising the count in proportion.
  - [ ] Slice `COLORS`/`SCENERY` to `REGIONS.length` so the flag-off map is unchanged.
- [ ] `css/main.css`: `.battle-stage[data-land="r10".."r12"]` sky and floor variables matching the land colours.
- [ ] Check the scroll container, scroll-to-token and the wheel at 12 wedges (the wheel divides by `REGIONS.length` already; confirm labels fit).

### How we know it is done (autonomous)
- [ ] `test/e2e/map.test.js` generalised and run at 12: 12 patches; every fogged land's `aria-label` carries its requirement ("Reach level 18 and 53 words mastered"); the keyboard-operable pins work for r10–r12.
- [ ] **Geometry test** (new, in the same file): for every land the patch is fully inside the frame; centres of neighbouring patches are at least 200 apart (patch rx is 96); no patch covers another's Nest pin or name label; the fog sign text fits its box; the trail's last point is inside the frame.
- [ ] **Walk test:** start at step 0 with all 12 lands unlocked, play 492 first-try steps through the real UI (or set `trailStep` stepwise), and assert the token reaches the end, each gate stops it at the right step, and every 10th step is a star.
- [ ] Phone (390 px) and tablet (820 px) screenshots at three scroll positions (start, middle, end); I read them. No horizontal page scroll outside the map scroller.
- [ ] Flag-9 map tests unchanged and green; `npm run check` green.

---

## Phase 4: Nest, Arena, Creature book and battles in the new lands

**Depends on:** Phases 1, 2 and 3.
**Leaves:** a trainer can fully play lands 10–12 with the flag at 12: hatch their species, battle their wild creatures, befriend the Arena creatures, see them in the book.

### Tasks
- [ ] Walk every screen that is keyed by region and fix anything that assumes 9: Nest page (`#/nest/r10`), Arena page and flag (`arenaSpot` for the new patches), battle backdrop and wild pick, Creature book grouping and "x of 48 discovered" copy, hatch odds, trophy list, help text, summary "New region unlocked" message.
- [ ] Make `help-content.js` and any "lands" wording read the count from the data rather than saying nine.
- [ ] Check the Arena flag spots: the flag must stay clear of the trail, stars and Nest pin in the longer map.

### How we know it is done (autonomous)
- [ ] `test/e2e/arena.test.js` generalised (flag 12): flags exist in all open lands; "every flag in all twelve lands can be clicked, and so can every star" (set `trailStep = TOTAL_STEPS`); `#/arena/r10..r12` open when the land is open and show the fog message when it is not.
- [ ] `test/e2e/battle.test.js` at 12: one full battle each in r10, r11 and r12 (clean run wins, a miss dodges, escape keeps rewards, the Arena creature is befriended on the first win and appears in the book), with the right backdrop (`data-land`).
- [ ] `test/e2e/collection.test.js` and `test/logic/collection.test.js`: hatching in r10–r12 yields only that land's three Nest species (10,000 seeded hatches); the 12 Arena creatures never come from eggs; the book reads "x of 48".
- [ ] `test/e2e/help.test.js` and `test/logic/help-content.test.js` green, including `nest/r10`.
- [ ] No page error or console error across every route in `test/e2e/screens.test.js` at 12.
- [ ] `npm run check` green; `npm run check:12` failures narrowed to only the literal-count assertions in the two-week playthrough and a few files listed for Phase 5.

---

## Phase 5: Playthrough, test literals, docs, switch on

**Depends on:** Phases 1–4.
**Leaves:** 12 lands live for everyone, with the whole suite green at the new default and the docs telling the truth.

### Tasks
- [ ] Replace every hardcoded `9`, `36`, `342`, `r9`, and nine-land region regex in the tests with values derived from `REGIONS`, `SPECIES`, `TOTAL_STEPS` (files found by the grep in Phase 1: `playthrough`, `map`, `arena`, `art`, `battle`, `battle-stage`, `collection` e2e tests and `test/COVERAGE.md`). After this, no test names a land count.
- [ ] Extend the two-week playthrough so a trainer with a large list reaches at least one new land, and add a long-run variant that unlocks all 12.
- [ ] Update `README.md` ("twelve lands", word-list note from D8) and `docs/changes-since-prd.md`; tick/adjust `TODO.md`; add the new criteria to `test/COVERAGE.md`.
- [ ] Raise `LAND_COUNT` to 12 in `js/config.js`. Run `npm run stamp`.
- [ ] Ask the user before pushing; then push to `main` and confirm the deploy.

### How we know it is done (autonomous)
- [ ] `npm run check` is green with the new default (12), and `npm run check` is also green with `SPELLBEASTS_LANDS=9` (the old shape still works, which proves nothing is hardcoded either way).
- [ ] The playthrough ends with the unlocked set, trail position, species count and trophies all matching what the data says, and `explorer-12` earned in the long run.
- [ ] `grep -rnE "\b(342|36 species|nine lands|r9\b)"` over `js/` and `test/` finds no stale literal (a scripted check in `test/hygiene.test.js`, so it stays that way).
- [ ] `test/logic/pwa.test.js` and `test/e2e/offline.test.js` green: the service worker version is bumped and the app still loads offline.
- [ ] After the push, the live site loads, shows 12 lands and an existing 9-land save still opens (a Playwright run against the Pages URL, plus a manual iPad check, still pending from the Arena release).

---

## Risks

- **Art workload.** 12 creatures is the largest cost; a smaller release (3 lands, no new Arena species) is possible but breaks the one-Arena-creature-per-land pattern that tests and the book rely on.
- **Late-game reachability.** Level 22 and 60 mastered words may take a very long time; D3 is deliberately a table so it can be tuned without code changes.
- **`collector-all` regression feel.** A child who finished the book sees it drop from 36 of 36 to 36 of 48. The trophy stays earned (D6), but the copy on the book page should say "new creatures to find" rather than showing a lower fraction as a loss; decide in Phase 4.
- **Map performance.** Ticks, props and fog grow with the trail; Phase 3 watches for jank on the oldest tablet before it ships.
