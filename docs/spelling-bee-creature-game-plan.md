# Execution Plan: Spellbeasts (Spelling Bee Creature Game)

**Source PRD:** `docs/spelling-bee-creature-game-prd.md`
**Target:** Static site (vanilla JS ES modules + HTML + CSS, no build step) on public GitHub Pages.
**Updated:** 2026-11-05

---

## Guiding principles

- **No runtime dependencies, no build step.** The site runs by opening `index.html`. Dev-only tooling (test runner, headless browser) is allowed but never required to serve the site, and never shipped.
- **Logic is separated from the DOM.** Every rule in the PRD (answer checking, scheduler, Leitner, session builder, rewards, hatching, evolution, import parser, storage schema) lives in a pure ES module importable in Node, so `node --test` can verify it with no browser.
- **Each phase ends green.** A phase is "done" only when its automated checks pass. The checks are the autonomous feedback loop; do not advance on visual inspection alone.
- **Copyright/franchise hygiene is enforced by a script,** not by vigilance. The hygiene check runs in every phase's verification.
- **Commit directly to `main`** (user default) after each phase's checks pass.

### Repository layout (target)
```
/index.html              # entry; loads js/main.js as a module
/css/                    # styles
/js/
  /logic/                # PURE modules, no DOM/window — unit tested in Node
    answer.js            # strict answer checking + diff
    scheduler.js         # within-session requeue + session builder
    leitner.js           # across-day box math + mastery
    rewards.js           # crickets / XP / level math
    trophies.js          # trophy condition evaluation
    import.js            # word-list parser
    hatch.js             # egg roll + evolution eligibility
    storage-schema.js    # state shape, migration, safe load/save (pure core)
  /ui/                   # DOM modules (screens, components)
  /platform/             # speech.js, audio.js, store.js (localStorage wrapper)
  main.js                # app bootstrap + router
/assets/creatures/       # inline-SVG source modules (JS returning SVG strings)
/data/sample-words.js    # ~15 original sample words (shipped)
/test/                   # *.test.js (node --test) + e2e smoke (dev only)
/tools/
  hygiene.sh             # forbidden-content scanner
  serve.sh              # local static server for manual/e2e
/.gitignore
/.nojekyll               # ensure Pages serves files as-is
```

---

## Phase 0 — Scaffold, hygiene gate, and test harness
**Depends on:** nothing. **Everything else depends on this.**

Establishes the repo skeleton, the copyright/franchise hygiene scanner, and the Node test runner so every later phase has a working feedback loop from its first commit.

### Tasks
- [ ] Create directory layout above (empty placeholder modules where needed).
- [ ] Write `.gitignore` with `*.words.*`, `*.words.txt`, `*.words.csv`, `private/`, `spellbeasts-backup*.json`, `node_modules/`, plus OS/editor noise.
- [ ] Add `.nojekyll` at repo root.
- [ ] Write `index.html` shell that loads `js/main.js` as `type="module"` and renders a visible "it works" placeholder.
- [ ] Write `tools/serve.sh` (e.g. `python3 -m http.server` wrapper) to serve the static site locally for e2e/manual checks.
- [ ] Write `tools/hygiene.sh`: scans tracked files (source, tests, fixtures, docs excluding the PRD's own non-goal list) for a configurable blocklist — franchise names (Pokémon, Pikachu, Harry Potter, Hogwarts, Dragon [HtTYD terms], LEGO, etc.) and a Scripps-word denylist file path that is **git-ignored** and supplied locally. Exit non-zero on any hit. The real 50 study words never enter the repo, so the script only needs the local ignored denylist when present; otherwise it checks franchise terms only.
- [ ] Add `package.json` (dev-only, `"private": true`) with scripts: `test` → `node --test test/`, `hygiene` → `bash tools/hygiene.sh`, `check` → runs hygiene then test. No runtime deps listed.
- [ ] Add one trivial passing logic module + its `node --test` test to prove the harness runs.
- [ ] Write `README.md`: what it is, how to run tests, how to serve locally, the copyright rule, and the Pages deploy instructions (Deploy from branch → `main` / root).

### Verification (autonomous feedback loop)
- [ ] `npm run check` exits 0 (hygiene passes, sample test passes).
- [ ] `bash tools/serve.sh` serves `index.html` and the placeholder loads with no console errors (manual once; automated smoke added in Phase 8).
- [ ] `tools/hygiene.sh` exits **non-zero** when fed a deliberately planted franchise term (self-test: a temp file, then confirm it's caught, then remove).

**Done when:** `npm run check` is green and the hygiene scanner provably fails on bad content.

---

## Phase 1 — Core logic modules (pure, fully unit-tested)
**Depends on:** Phase 0. **Phases 2–9 depend on this.**

All game rules as pure functions. This is the heart of the PRD's correctness and is where most tests live. No DOM, no `localStorage`, no `window`.

### 1a. Answer checking — `js/logic/answer.js` (PRD §7.4, §7.6)
- [ ] `checkAnswer(typed, accepted)` → `{correct, caseOnly, diff}`: trim leading/trailing whitespace; exact match incl. capitalization.
- [ ] `caseOnly` true when the only difference is capitalization (drives the capitalization note).
- [ ] `diff` identifies differing letter positions for highlight rendering.
- [ ] Tests: "monday"≠"Monday" (caseOnly), trailing space ignored, internal space significant, empty input, exact match, accented/proper-noun cases.

### 1b. Within-session scheduler — `js/logic/scheduler.js` (PRD §8.1)
- [ ] Requeue missed word ~3 turns later; after a correct retry requeue ~7 later; max 4 appearances/session; if queue too short, push to end; session ends when queue empties.
- [ ] No word in two consecutive turns (also §8.3).
- [ ] Deterministic via injectable RNG so tests are reproducible.
- [ ] Tests: 3-turn gap, 7-turn confirm gap, 4-appearance cap, short-queue fallback, no-consecutive-repeat.

### 1c. Session builder — `js/logic/scheduler.js` (PRD §8.3)
- [ ] Build 10–12 distinct words: overdue/due first (most overdue, then lower box), ≤3 new words, then lowest-box fill-ins.
- [ ] Shuffle with no consecutive repeats; "Bonus review" of weakest when nothing due/new.
- [ ] Tests: size bounds, ≤3 new cap, ordering priority, bonus-review fallback.

### 1d. Leitner boxes & mastery — `js/logic/leitner.js` (PRD §8.2)
- [ ] Box intervals (1=every session,2=2d,3=4d,4=7d,5=14d). First attempt of the (local calendar) day sets movement: correct +1 (max 5), incorrect → box 1. Later same-day attempts never raise the box.
- [ ] `nextDue` computed from box + date. Mastery = first-try correct on 3 distinct calendar days; mastered words stay in box 4/5 rotation.
- [ ] Inject "today" for deterministic tests; handle timezone-local date boundaries.
- [ ] Tests: box up/down, same-day no-raise, 3-distinct-day mastery, due-date math, box cap at 5.

### 1e. Rewards & levels — `js/logic/rewards.js` (PRD §9.1, §9.2)
- [ ] Cricket table (first-try 3, retry 1, streak-of-5 +2, session complete +5, first session of day +5).
- [ ] XP table (10/5/25/15); level threshold `50×n` from previous level; level-from-total-XP helper.
- [ ] Tests: each cricket event, streak bonus boundary, XP totals, level thresholds across several levels.

### 1f. Trophy evaluation — `js/logic/trophies.js` (PRD §9.3)
- [ ] Pure evaluator: given profile state + an event, return newly-earned trophy ids (First Hatch, Busy Bee, Perfect Flight, Streak of 10, Comeback, Capital Idea, 10/25/50 Mastered, 3/7-Day streak, Collector, Fully Evolved; Champion deferred to Phase 9).
- [ ] Tests: each condition triggers once and only once.

### 1g. Import parser — `js/logic/import.js` (PRD §6.3)
- [ ] One record/line; separator (tab, `|`, `,`) detected per file; fields `word | pos | definition | sentence?`.
- [ ] Ignore blank lines and `#` comments; per-line errors (missing word, duplicate word); import valid lines; Replace vs Add modes; list name.
- [ ] Tests: each separator, comments/blanks ignored, duplicate + missing-word errors, optional sentence, mixed valid/invalid, replace vs add semantics.

### 1h. Hatching & evolution — `js/logic/hatch.js` (PRD §11, §11A)
- [ ] Egg roll weighted 60/30/10 common/uncommon/rare for a region's 3 species; re-roll an owned species once before duplicate rule; duplicate → half-price crickets + friendship heart.
- [ ] Evolution eligibility: 1→2 (fed 30 **and** level ≥3); 2→3 (fed 60 more **and** ≥10 mastered).
- [ ] Egg hatch progress tied to count of correct words.
- [ ] Tests (injected RNG): weight distribution over many rolls, re-roll-once behavior, duplicate payout, both evolution gates.

### 1i. Storage schema core — `js/logic/storage-schema.js` (PRD §13)
- [ ] Pure functions: `freshState()`, `migrate(state)`, `validate(state)`, default profile factory. No actual `localStorage` here (that's Phase 2 `platform/store.js`).
- [ ] Session history capped at last 200.
- [ ] Tests: fresh state shape, migration from missing/partial, corrupt → fresh, session cap.

### Verification (autonomous feedback loop)
- [ ] `npm test` runs all `test/logic/*.test.js` green.
- [ ] Coverage spot-check: every acceptance criterion in PRD §15 that is pure logic (answer case-sensitivity, requeue timing, box movement, session composition, reward math) maps to at least one passing test — maintain a checklist comment in `test/COVERAGE.md`.
- [ ] `npm run hygiene` green.

**Done when:** every logic module has tests and `npm run check` is green. No UI yet.

---

## Phase 2 — Platform layer: storage, speech, audio wrappers
**Depends on:** Phase 1 (schema core). **Phases 3–9 depend on this.**

Thin, DOM/browser-touching wrappers around the pure core.

### Tasks
- [ ] `js/platform/store.js`: load/save the single versioned key `spellbeasts.v1`; all reads/writes in try/catch; on corrupt/missing → `freshState()` + non-blocking warning flag; detect unavailable storage (private window) → in-memory fallback + "Progress won't be saved" flag. Save after every turn.
- [ ] `js/platform/speech.js`: Web Speech `speechSynthesis` wrapper; list voices, prefer `en-US`; rate 0.9 normal / 0.6 slow; "no voice available" state + guidance message; replay without limit.
- [ ] `js/platform/audio.js`: Web Audio generated chimes/chirps/music loop; global mute + separate music toggle; no audio files.
- [ ] A tiny dependency-injection seam so UI can be tested with fake platform modules.

### Verification (autonomous feedback loop)
- [ ] Node tests for `store.js` using a **fake `localStorage`** (quota-exceeded throw, corrupt JSON, absent object) → confirm fallback + flags. Pure-core still covered by Phase 1.
- [ ] Node tests for speech/audio **logic** (voice selection preference, rate mapping, mute state machine) with injected fakes — no real browser audio needed.
- [ ] Manual browser smoke (serve locally): a word is spoken, "say slowly" is slower, a chime plays, mute silences both; captured as a checklist. (Automated in the Phase 8 e2e smoke.)
- [ ] `npm run check` green.

**Done when:** storage survives corrupt/absent/quota cases in tests, and speech/audio selection logic is tested.

---

## Phase 3 — Core spelling turn UI (end-to-end playable loop)
**Depends on:** Phases 1, 2.

First playable vertical slice: profile → practice session → summary, on the **sample word list**, with real scheduling, answer checking and persistence. (Rewards/creatures/map are stubbed as counters; full UI for them in later phases.)

### Tasks
- [ ] App bootstrap + simple hash router in `js/main.js`.
- [ ] Profile picker (minimal): add trainer (name + placeholder starter pick), select profile; separate state per profile.
- [ ] Practice session screen (PRD §7): speak word (never shown pre-submit); buttons Say again (`Space`/`Ctrl+R`), Say slowly, Definition, Part of speech, Sentence (hidden if absent) each with shown+spoken text; type + Enter; strict check; correct → celebration + reward tick + next; incorrect → show correct spelling with highlighted diff + capitalization note, require one correct copy (unscored), requeue per §8.1; no timer; session progress bar; companion placeholder.
- [ ] Answer input hardening: `spellcheck="false"`, `autocomplete="off"`, `autocapitalize="off"`, `autocorrect="off"` (§14).
- [ ] Session summary screen: right/missed, crickets/XP earned (from Phase 1 math), trophies placeholder, "Feed" shortcut placeholder.
- [ ] Wire first-try results into Leitner box updates + persistence after every turn.
- [ ] Sample word list `data/sample-words.js`: ~15 original everyday words w/ definitions + sentences (authored for this project; hygiene-clean).

### Verification (autonomous feedback loop)
- [ ] **e2e smoke (dev-only headless browser, e.g. Playwright run against `tools/serve.sh`):** create profile → start session → submit a correct answer (word revealed only after submit) → submit a wrong answer → see diff + capitalization note → type correction → reach summary. Assert word never in DOM before submit.
- [ ] e2e: reload mid-session → progress persisted (≤1 turn lost).
- [ ] Keyboard-only run: all actions reachable via keyboard; visible focus present.
- [ ] `npm run check` green (logic tests still pass; hygiene scans the new sample list).

**Done when:** the game is playable start-to-finish on the sample list and the e2e smoke passes headless.

---

## Phase 4 — Progression UI: crickets, XP, levels, trophies, streak
**Depends on:** Phases 1, 3.

Surface the reward engine and trophy case; daily streak + hungry reminder.

### Tasks
- [ ] Cricket & XP bars, trainer level display; full-screen level-up celebration.
- [ ] Trophy case screen: earned + locked silhouettes with conditions; wire `trophies.js` evaluation into turn/session events.
- [ ] Daily streak counter with 1 free rest-day/week; reset logic; best streak.
- [ ] Hungry-creatures reminder banner + due-word count on home (home still placeholder until Phase 6, but the banner logic lands here).
- [ ] First-session-of-day and session-complete cricket/XP bonuses visibly applied.

### Verification (autonomous feedback loop)
- [ ] Node tests: streak increment/reset with rest-day, across simulated date changes (inject "today").
- [ ] e2e: complete a session → correct crickets/XP shown and persisted; earn a scripted trophy (e.g. Capital Idea via a capitalized sample word) → appears in case; cross a level threshold → celebration fires.
- [ ] `npm run check` green.

**Done when:** rewards, levels, trophies and streak all reflect §9 and survive reload, verified by tests + e2e.

---

## Phase 5 — Creatures, Nests (hatchery), evolution, Creature book, Sanctuary
**Depends on:** Phases 1, 4.

The collection loop. Needs the SVG creature art and the hatch/evolution logic (Phase 1h) wired to UI.

### Tasks
- [ ] Author 18 original Nest species × 3 stages = **54 inline-SVG** illustrations as JS modules returning SVG strings; chunky rounded friendly style; idle animation (bob/blink/tail-flick) via CSS/SVG; honor `prefers-reduced-motion`. Names/themes original and conflict-checked (PRD §11; coordinate Open Question #2 with user before finalizing names — placeholders acceptable to proceed).
- [ ] Assign 3 species per region (common/uncommon/rare) across 6 regions.
- [ ] Region Nest screen: buy region egg (prices 20/30/40/50/60/75), hatch after N correct words (crack animation), weighted roll via `hatch.js`, duplicate → crickets + heart.
- [ ] Evolution UI + gates (fed thresholds + level/mastery) from `hatch.js`.
- [ ] Creature book: silhouette-until-owned, stage art, name, original flavor line.
- [ ] Sanctuary: owned creatures wander/feed; choose practice companion (used by Phase 3 companion slot); hungry state feeds the Phase 4 reminder.
- [ ] Starter: offer 3 commons at profile creation (upgrade the Phase 3 placeholder).

### Verification (autonomous feedback loop)
- [ ] Logic tests (Phase 1h) remain green; add tests for egg-price-by-region and hatch-progress thresholds.
- [ ] **SVG asset check script:** every species×stage module returns well-formed SVG (parse with a dev-only DOM/XML parser), has a `viewBox`, and uses only inline SVG (no external refs). Count must equal 54.
- [ ] e2e: earn enough crickets (scripted) → buy egg → spell to hatch → creature appears in book + Sanctuary → feed + meet gates → evolve to stage 2/3. Duplicate hatch pays crickets + heart.
- [ ] `npm run check` + asset check green.

**Done when:** hatching, feeding and evolution work per §11, all 54 assets validate, and the collection persists.

---

## Phase 6 — World map (home screen)
**Depends on:** Phases 1, 4, 5.

The hub that ties it together: layered SVG island, region unlocks, trail progress, landmarks.

### Tasks
- [ ] Layered SVG island (terrain, regions, fog, trail, pins, token) with 6 regions on a winding trail; built so regions can be added later without redrawing. Original region names/themes (Open Question #2).
- [ ] Make the map the home screen: cricket/XP bars, streak, due-count, big Practice button; pins open each region's Nest; buttons for Sanctuary, Trophies, Creature book.
- [ ] Region unlock gates per §11A table (level **and** mastery counts); fogged locked regions with a "what's needed" sign.
- [ ] Trail: each first-try-correct moves token 1 step; token halts at edge of next locked region; animated walk on return to map (skipped under reduced motion).
- [ ] Landmarks ~every 10 steps: treasure chest 5–15 crickets, occasional hatch boost; claimable once.
- [ ] Confirm practice is region-independent (single global scheduler, §8).

### Verification (autonomous feedback loop)
- [ ] Logic tests: region-unlock predicate for each of the 6 thresholds (level-only, mastery-only, both) — unlocks exactly when both conditions met; landmark-claim-once; token halt-at-gate; step count from first-try corrects.
- [ ] e2e: from fresh profile, map is home; scripted progress unlocks region 2 at level 2; a locked region shows requirements; token advances on first-try corrects and stops at a locked gate; a landmark pays out once (second visit pays nothing).
- [ ] Reduced-motion: with `prefers-reduced-motion`, walk animation is skipped (e2e asserts instant position).
- [ ] `npm run check` green.

**Done when:** the map is the hub, unlocks/trail/landmarks match §11A, verified by logic + e2e.

---

## Phase 7 — Parent area: word list editor, stats, profiles, backup
**Depends on:** Phases 1, 2, 3.

The parent-facing tooling. Wires the import parser (Phase 1g) and storage to real UI, and is where the real word list enters the browser (never the repo).

### Tasks
- [ ] Adult gate: a multi-digit multiplication question (not a password).
- [ ] Word list editor: paste or upload (§6.3), preview with per-line errors, Replace/Add, rename list, view/edit/delete single words, reset to sample list. Data saved only to `localStorage`.
- [ ] Per-profile stats: per word — attempts, first-try accuracy, current box, next due, mastered?, last missed; sortable; "Most missed" quick view; session history list.
- [ ] Profiles: rename, delete (confirm), reset progress.
- [ ] Backup: export all data as JSON (includes word list → UI warns "Contains your word list. Don't post it publicly."); import with overwrite confirm.

### Verification (autonomous feedback loop)
- [ ] Logic tests: export→import round-trips full state byte-for-byte (schema stable); stat aggregation (accuracy, most-missed) computed correctly from a fixture profile.
- [ ] e2e: pass adult gate; paste a sample-format list with one bad line → error shown, valid lines imported; practice immediately uses it; export downloads JSON → re-import reproduces state; profile delete requires confirm.
- [ ] **Privacy check:** e2e/network assertion that import/stats make **no network requests**; hygiene confirms no imported content is written to tracked files.
- [ ] `npm run check` green.

**Done when:** parent can load the real list locally, see weak words, and back up/restore — all offline, nothing committed.

---

## Phase 8 — Accessibility, settings, polish, and deploy to GitHub Pages
**Depends on:** Phases 3–7.

Hardening and the public deploy.

### Tasks
- [ ] Settings screen: sound/music toggles, voice picker (from available voices), speech speed.
- [ ] Accessibility pass (§14): ≥20px input, high contrast, readable non-stylized word font, full keyboard operation, visible focus, `prefers-reduced-motion` everywhere, unlimited audio replay, no-voice guidance, encouraging wording / no harsh "wrong" sound.
- [ ] Empty-state & resilience: no-data opens profile picker on sample list; corrupt key → fresh + warning; private window → "Progress won't be saved" banner.
- [ ] Consolidate the **e2e smoke suite** covering PRD §15 Phase-1 acceptance criteria end to end (one headless run).
- [ ] Deploy: create public repo (name TBD, Open Question #1), push `main`, enable Pages (Deploy from branch → `main`/root), confirm `.nojekyll`. Per memory [[deploy-early-and-notify]], deploy as soon as browser-viewable and send the URL.

### Verification (autonomous feedback loop)
- [ ] Automated a11y check (dev-only, e.g. axe via Playwright) on each screen → no critical violations; keyboard-only traversal asserted.
- [ ] Full e2e suite green, mapping to each §15 Phase-1 checkbox (maintain `test/ACCEPTANCE.md` mapping).
- [ ] Post-deploy: fetch the live Pages URL, assert profile picker loads and sample list plays (headless against the live URL).
- [ ] `npm run check` green; final hygiene scan before push confirms no franchise/Scripps content.

**Done when:** every PRD §15 Phase-1 criterion has a passing automated check and the live Pages URL is playable. **This completes PRD Phase 1 (Creature Hatchery).**

---

## Phase 9 — PRD Phase 2: Trainer Battles (Arena mode)
**Depends on:** Phases 1–8 (shipped Phase 1). Gated by: Arena unlocks at trainer level 3.

Adds battles on top of the shared engine without forking the scheduler.

### Tasks
- [ ] Arena spot pin on each unlocked region; unlock Arena at level 3.
- [ ] 6 arena-only species (one per region) × 3 stages = **18 more SVGs**; befriended only by battling.
- [ ] Battle = one practice session using the **same** scheduler (§8), turn rules (§7), rewards (§9), plus: correct → attack, wild loses 1 of 5 hearts; 3-in-a-row → special (−2 hearts); incorrect → dodge animation + requeue. Player cannot lose; queue empties → wild "escapes", player keeps crickets/XP. No player hearts, no timers; animations ≤~1s and never block input.
- [ ] Win → befriend (100% first time for arena-only species; else bonus crickets) + Champion trophy progress.
- [ ] Battle-pose variant for every owned species, composed from existing SVG parts (no new full illustrations for owned species).
- [ ] Champion trophy (win 10 battles).

### Verification (autonomous feedback loop)
- [ ] Logic tests: hit/special/dodge heart math (5 hearts, 3-streak = −2), escape-on-empty-queue, befriend probability (100% first arena-only), and that spaced-repetition box updates are **identical** to practice (shared code path — assert same function used).
- [ ] Asset check: 18 arena SVGs validate (total species art = 72); every owned species has a battle-pose variant generated from parts.
- [ ] e2e: reach level 3 (scripted) → Arena appears → battle → correct hits, 3-streak special, miss dodges + requeues → win befriends arena-only species → it appears in Creature book → Champion progresses; confirm player cannot lose when queue empties.
- [ ] `npm run check` green; each §15 Phase-2 criterion mapped in `test/ACCEPTANCE.md`.

**Done when:** every PRD §15 Phase-2 criterion has a passing automated check and Arena is deployed to the live Pages URL.

---

## Cross-cutting autonomous checks (run every phase)
- `npm run hygiene` — no franchise names; no Scripps words/definitions in any tracked file (local denylist when present).
- `npm test` — all `node --test` logic + platform tests.
- From Phase 3 on: the headless e2e smoke for the current slice.
- `test/ACCEPTANCE.md` and `test/COVERAGE.md` keep PRD §15 criteria mapped to concrete passing checks.

## Open questions to resolve with the user (do not block scaffolding)
1. Final game + repo name (Phase 8 needs the repo name).
2. Final creature/region names + 3 starters; whether the player helps pick (Phase 5/6 use placeholders until decided).
3. "Practice only missed words" quick button on the map in Phase 1 or later (Phase 6 can slot it in cheaply).
4. Default voice (Phase 2/8; parent may test Chromebook voices first).
