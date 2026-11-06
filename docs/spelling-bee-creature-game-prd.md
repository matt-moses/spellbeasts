# PRD: Spelling Bee Creature Game

**Working title:** Spellbeasts (final name TBD)
**Date:** 2026-11-05
**Status:** Draft, approved for planning
**Delivery:** Phase 1 = Creature Hatchery, Phase 2 = Trainer Battles (Arena mode)

---

## 1. Summary

A browser game that helps a fourth grader prepare for a school spelling bee. The game says a word aloud and the player types the spelling, as in a real bee. Correct spellings earn **crickets** (currency and creature food), **XP** and **trophies**. Crickets hatch, feed and evolve a collection of original creatures. A **world map** of unlockable regions is the hub: the player walks a trail as they spell, finds treasure, and discovers each region's creatures. Missed words come back on a spaced-repetition schedule, both later in the same session and on later days, until they are mastered.

The game is a static site hosted publicly on **GitHub Pages**. All player data and the real study word list stay in the player's browser. **The copyrighted Scripps word list is never committed to the repository.**

## 2. Goals

1. Master the 50 "Two Bee" fourth-grade study words: each spelled correctly, with correct capitalization, on 3 different days.
2. Make daily practice something the player wants to do, through creature collecting, levels, trophies and streaks.
3. Show missed words again at the right intervals without parent effort.
4. Give the parent a clear view of which words are weak.

## 3. Non-goals

- No accounts, backend, server or cloud sync.
- No characters, names, art or sounds from Pokémon, Harry Potter, How to Train Your Dragon, LEGO or any other franchise. All creatures are original.
- No committed or hosted copy of the Scripps/Merriam-Webster list or its definitions.
- No player drawing tools in v1. Creatures are pre-made.
- No mobile/touch-first design. Laptop/Chromebook with a physical keyboard is the target. Tablets should still work.
- No timed pressure on spelling, in either mode.

## 4. Users

| User | Needs |
|---|---|
| **Player** (4th grader, likes creatures, art, Pokémon, Harry Potter, Lego) | Fun, short sessions; clear audio; gentle feedback on misses; visible progress and collectibles |
| **Parent** | Load the real word list; see weak words; manage profiles; back up progress |
| **Other kids** (siblings/friends) | Their own profile and progress on the same browser |

## 5. Platform and tech stack (decided)

| Area | Decision |
|---|---|
| Language/UI | **Vanilla JavaScript (ES modules) + HTML + CSS.** No framework, no build step. |
| Art | **Hand-authored inline SVG** for creatures, eggs, trophies and UI icons. CSS/SVG animations. |
| Speech | **Web Speech API** (`speechSynthesis`). Prefer an `en-US` voice; normal rate ≈ 0.9, "slow" rate ≈ 0.6. |
| Sound | **Web Audio API** generated chimes, creature chirps and music loop. No audio files. Global mute and separate music toggle. |
| Storage | **`localStorage`**, one versioned key, all reads and writes wrapped in try/catch. JSON export/import for backup. |
| Hosting | **GitHub Pages, public repo**, deployed from the `main` branch with **no build step** ("Deploy from a branch", site root). No workflow file is needed. |
| Dependencies | None at runtime. Any later dependency must be vendored or loaded from a pinned CDN version. |
| Tests | Pure-logic modules (scheduler, answer checking, rewards, import parser) are unit-testable in Node with no browser, using `node --test`. |

## 6. Word list and copyright handling

### 6.1 Rules
- The repo ships only a **sample list** of about 15 everyday words with definitions and example sentences written for this project, so the game works for anyone who opens it.
- The real list comes in through the **Parent word list editor** (§10.2). It is pasted or uploaded and saved only in that browser's `localStorage`.
- `.gitignore` must exclude local word files (e.g. `*.words.txt`, `*.words.csv`, `private/`).
- No Scripps words, definitions or sheet images may appear in source, tests, fixtures, docs or commit history. This PRD intentionally does not list them.

### 6.2 Word record
```
{ id, word, partOfSpeech, definition, sentence? }
```
- `word` is the exact accepted spelling, case-sensitive (e.g. a proper noun keeps its capital).
- `sentence` is optional. If it's missing, the "Sentence" button is hidden.

### 6.3 Import format
One word per line. Fields are separated by a tab, `|` or `,`, with the separator detected per file:
```
word | part of speech | definition | sentence (optional)
```
- Blank lines and lines starting with `#` are ignored.
- The parser reports line-level errors (missing word, duplicate word) and imports the valid lines.
- Import modes: **Replace list** or **Add to list**. Progress is kept for words that remain, matched by exact `word`.
- A list has a name (e.g. "Two Bee – Grade 4"). A profile practices one active list at a time.

## 7. Core spelling turn (shared by both modes)

1. The game speaks the word. The word is **never shown** before the answer is submitted.
2. Buttons, each with a keyboard shortcut:
   - **Say again** (`Space` when the input is empty, or `Ctrl+R`)
   - **Say slowly**
   - **Definition** (spoken and shown as text)
   - **Part of speech** (spoken and shown as text)
   - **Sentence** (if available; spoken with the word kept in)
3. The player types and presses **Enter**.
4. **Answer checking is strict:** leading and trailing whitespace are trimmed. Everything else must match exactly, **including capitalization**. "monday" is wrong when the word is "Monday".
5. **Correct:** a short celebration, rewards (§9), next word.
6. **Incorrect:**
   - Show the correct spelling with the differing letters highlighted, plus a capitalization note if case was the only problem.
   - Ask the player to **type it correctly once** to continue. This copy earns nothing and isn't scored.
   - Requeue the word in the session (§8.1).
7. No timer. The game never counts down or penalizes slow answers.

## 8. Spaced repetition

### 8.1 Within a session
- A missed word is reinserted about **3 turns later**.
- If it's correct on that retry, it is reinserted again about **7 turns later** to confirm.
- If it's missed again, it goes back about 3 turns later. A word may appear at most **4 times** in a session, then it is left for the next session.
- If the queue is too short for the gap, the word goes at the end of the session.
- The session ends when the queue is empty.

### 8.2 Across days (Leitner boxes)
| Box | Review interval |
|---|---|
| 1 | every session |
| 2 | 2 days |
| 3 | 4 days |
| 4 | 7 days |
| 5 | 14 days |

- A word's **first attempt of the day** sets the box. Correct moves it up 1 box (max 5). Incorrect drops it to **box 1**.
- Later attempts on the same day, including in-session retries, never move the box up.
- **Mastered** means correct on the first try on **3 different calendar days**. Mastered words stay in rotation in box 4 or 5.
- "Day" is the player's local calendar date.

### 8.3 Building a session
- Size: **10–12 turns** of distinct words, before in-session retries are added.
- Order of selection:
  1. Overdue and due words, most overdue first, then lower box first.
  2. **New words, at most 3 per session.**
  3. Fill-ins from the lowest box, if the list is nearly done.
- Words are shuffled, with no word in two consecutive turns.
- If nothing is due and nothing is new, offer a "Bonus review" session of the weakest words.

## 9. Progression and rewards

### 9.1 Crickets
| Event | Crickets |
|---|---|
| Correct on first try | 3 |
| Correct on an in-session retry | 1 |
| Every 5 correct in a row (streak) | +2 bonus |
| Session completed | +5 |
| First session of the day | +5 |

### 9.2 XP and trainer levels
- Correct first try: 10 XP. Correct retry: 5 XP. Word newly mastered: 25 XP. Session complete: 15 XP.
- Reaching level *n* takes `50 × n` XP from the previous level.
- Levels unlock eggs, cosmetics and features: Arena at level 3 in Phase 2, new map regions and their Nests (§11A).
- Level-up shows a full-screen celebration.

### 9.3 Trophies (initial set)
| Trophy | Condition |
|---|---|
| First Hatch | Hatch your first egg |
| Busy Bee | Complete 5 sessions |
| Perfect Flight | A session with no misses |
| Streak of 10 | 10 correct in a row |
| Comeback | Spell correctly a word you missed earlier in the same session |
| Capital Idea | Spell a capitalized word correctly |
| 10 / 25 / 50 Mastered | Mastery milestones |
| 3-Day / 7-Day Streak | Play on consecutive days |
| Collector | Own 10 creatures |
| Fully Evolved | Evolve a creature to stage 3 |
| Champion (Phase 2) | Win 10 battles |

Trophies appear in a Trophy Case. Locked trophies are shown as silhouettes with their conditions.

### 9.4 Daily streak and reminders
- Days-in-a-row counter on the home screen. Missing one day resets it, softened by **1 free "rest day" per week**.
- Reminders are in-app only (no push or email). If the player hasn't practiced today, the home screen shows creatures looking hungry with a "Your creatures are hungry!" banner. Words due today are shown as a count.

## 10. Screens

### 10.1 Player screens
1. **Profile picker:** large creature avatars, "Add trainer" (name + choose 1 of 3 starter creatures).
2. **World map (home screen):** the illustrated island (§11A) with the player's token on the trail, cricket and XP bars, streak, due-word count, and a big **Practice** button. Region pins open each region's Nest (hatchery) and, in Phase 2, its Arena spot. Also has buttons for **Sanctuary**, **Trophies** and **Creature book**.
2a. **Sanctuary:** the player's home base on the map, where owned creatures wander, get fed and can be chosen as the practice companion. Shows hungry creatures for the reminder (§9.4).
3. **Practice session:** the spelling turn (§7), a progress bar for the session, a companion creature that reacts to answers.
4. **Session summary:** words right/missed, crickets/XP earned, any trophies, "Feed your creatures" shortcut.
5. **Region Nest (hatchery):** buy that region's eggs with crickets, watch hatching (an egg hatches after a set number of correct words, shown as cracks), feed creatures.
6. **Creature book:** every species as a silhouette until owned, with stage art, name and a short original flavor line.
7. **Trophy case.**
8. **Settings:** sound/music toggles, voice picker (from available voices), speech speed.

### 10.2 Parent area
Behind a simple adult gate (e.g. a multi-digit multiplication question), not a password.
- **Word list editor:** paste or upload (§6.3), preview with errors, replace or add, rename list, view and edit or delete single words, reset sample list.
- **Stats per profile:** for each word, the attempts, first-try accuracy, current box, next due date, mastered (yes/no) and last missed date. Sortable, with a "Most missed" quick view and a session history list.
- **Profiles:** rename, delete (with confirm), reset progress.
- **Backup:** export all data as a JSON file and import it (overwrite with confirm). The export includes the word list, so the UI warns: "Contains your word list. Don't post it publicly."

## 11. Creatures (Phase 1)

- **18 original Nest species** (plus 6 arena-only species in Phase 2), each with **3 evolution stages** (54 SVG illustrations in Phase 1, 18 more in Phase 2).
- Style: chunky, rounded, friendly shapes with bold outlines and bright flat colors. Some have block/brick-like details (a nod to building toys without copying any brand). Each has an idle animation (bob, blink, tail flick).
- Each map region (§11A) is home to **3 species: 1 common, 1 uncommon and 1 rare** (6 / 6 / 6 in total).
- Each region's Nest sells one egg type. Prices rise by region: 20, 30, 40, 50, 60 and 75 crickets. An egg hatches into that region's species with weights of 60% common, 30% uncommon and 10% rare. A species already owned is re-rolled once before the duplicate rule applies.
- Example roster themes (names to be finalized; all must be original and searched for obvious conflicts): marsh drake, moon owl, ember newt, kelp serpent, burrow badger-sprite, thistle fox, cloud ray, cinder hatchling, puddle toad-knight, crystal beetle, lantern moth, frost hare, river otter-mage, storm wyrmling, moss golem, sky whale calf, ink octo-scribe, star kitten-griffin.
- **Evolution:**
  - Stage 1 → 2: fed 30 crickets **and** trainer level ≥ 3.
  - Stage 2 → 3: fed 60 more crickets **and** at least 10 words mastered.
  - Tying the last stage to mastery is what links evolution to learning.
- Duplicate hatches turn into bonus crickets (half the egg price) and a "friendship" heart on that species.
- Starter choice: 3 commons are always offered at profile creation.

## 11A. World map

- **One illustrated SVG island** with **6 regions** linked by a winding trail. Region names and themes are original (to be finalized), for example: Sunny Meadow (start, with the Sanctuary), Misty Marsh, Ember Peaks, Moonlit Highlands, Coral Reef and Cloudspire.
- **Region unlocks** depend on learning as well as play:

  | Region | Unlocks at |
  |---|---|
  | 1 | start |
  | 2 | level 2 |
  | 3 | level 4 |
  | 4 | level 6 **and** 15 mastered |
  | 5 | level 8 **and** 25 mastered |
  | 6 | level 10 **and** 40 mastered |

  Locked regions are fogged, with a sign showing what's still needed.
- **Trail progress:** every **first-try correct** answer moves the player's token 1 step along the trail. Steps stop at the edge of the next locked region (the token waits at the gate).
- **Landmarks** every ~10 steps (bridges, caves, ruins) contain a treasure chest with 5–15 crickets, occasionally an egg-hatch boost. Each landmark can be claimed once.
- **Spelling is never tied to a region.** All practice uses the single global scheduler (§8), whichever region the player is in.
- The map is the home screen. Practicing returns the player to the map, where the token's walk to its new position is animated (skipped under reduced motion).
- Built from layered SVG (terrain, regions, fog, trail, pins, token) so new regions can be added later without redrawing the map.

## 12. Phase 2: Trainer Battles (Arena mode)

- Unlocked at **trainer level 3**.
- Each **unlocked map region has an Arena spot** (a pin on the map). The player picks 1 owned creature. A wild creature from **that region** appears: one of its 3 Nest species, or its **arena-only species**. There are 6 arena-only species, one per region, which can only be befriended by battling.
- Each battle is one practice session using the same scheduler (§8), turn rules (§7) and rewards (§9), plus battle extras:
  - **Correct:** your creature attacks; the wild creature loses 1 heart (wild creatures have **5 hearts**).
  - **3 correct in a row:** special move, which removes 2 hearts.
  - **Incorrect:** the wild creature dodges with a short animation, and the word is requeued (§8.1).
- **The player cannot lose.** If the queue runs out before the wild creature's hearts are gone, it "escapes" and the player still keeps all the crickets and XP. There are no player hearts.
- **Win:** a chance to befriend the wild creature (100% the first time for arena-only species, otherwise bonus crickets), plus Champion trophy progress.
- Battle creatures get a battle-pose variant built from the existing SVG parts (no new full illustrations needed for owned species).
- No timers or speed bonuses. Animations must not delay input for more than ~1 s.

## 13. Data model (localStorage)

Single key `spellbeasts.v1`:
```
{
  version: 1,
  settings: { sound, music, voiceURI, rate },
  wordLists: { [listId]: { name, words: [WordRecord] } },
  profiles: {
    [profileId]: {
      name, avatarSpecies, createdAt, activeListId,
      crickets, xp, level, streak: { current, best, lastPlayDate, restUsedWeek },
      wordStats: { [listId]: { [word]: { box, nextDue, correctDays: [dates], attempts, firstTryCorrect, lastMissed } } },
      creatures: [{ id, species, stage, fed, hearts, hatchedAt }],
      eggs: [{ id, regionId, progress, needed }],
      map: { trailStep, claimedLandmarks: [ids], unlockedRegions: [ids] },
      trophies: { [trophyId]: earnedAt },
      sessions: [{ date, mode, words, correctFirstTry, misses }]   // capped at last 200
    }
  }
}
```
- Writes happen after every turn, so closing the tab mid-session loses at most one turn.
- On load, a missing or corrupt key falls back to a fresh state, and a non-blocking warning is shown.
- If storage is unavailable (private window), the game still runs and shows a banner: "Progress won't be saved".
- A schema `version` field allows migrations.

## 14. Accessibility and UX

- Large text (≥ 20px for the input), high-contrast colors, a font that's easy to read and spell from (no stylized lettering for words).
- Everything works by keyboard. Visible focus.
- Respects `prefers-reduced-motion`.
- Audio can be replayed without limit. If no speech voice is available, a clear message explains how to enable one.
- Encouraging wording only. Misses say "Almost! Let's look at it together." There's no "wrong" sound blast.
- Spellcheck and autocorrect are **disabled** on the answer input (`spellcheck="false"`, `autocomplete="off"`, `autocapitalize="off"`, `autocorrect="off"`).

## 15. Acceptance criteria

### Phase 1
- [ ] Opening the Pages URL with no data shows the profile picker and the sample list works end to end.
- [ ] A parent can paste the real list in the §6.3 format, see errors per line, and practice it right away. Nothing about it is sent anywhere or committed.
- [ ] Answers are case-sensitive. "monday" for "Monday" is marked incorrect with a capitalization note.
- [ ] A missed word reappears about 3 turns later, then about 7 turns later after a correct retry, and never more than 4 times per session.
- [ ] Box movement follows §8.2. Only the first attempt per day moves a word up. Mastery requires 3 distinct days.
- [ ] Sessions contain 10–12 distinct words with ≤ 3 new words.
- [ ] Crickets, XP, levels, trophies, eggs, hatching, feeding and evolution work as specified, and progress survives a reload.
- [ ] The world map is the home screen. Regions unlock by the level and mastery thresholds in §11A, first-try correct answers move the token, landmark chests pay out once, and each region's Nest hatches only that region's species.
- [ ] Multiple profiles keep fully separate progress.
- [ ] Parent stats show per-word box, next due date, accuracy and most-missed.
- [ ] JSON export/import round-trips all data.
- [ ] Sound and music toggles work, and both are off when muted.
- [ ] The streak counter and the hungry-creatures reminder behave as in §9.4.
- [ ] Unit tests cover the scheduler, answer checking, import parser and reward math.
- [ ] No franchise names or assets, and no Scripps words or definitions, appear in the repo (checked before each push).

### Phase 2
- [ ] Arena unlocks at level 3, battles use the shared scheduler, and spaced-repetition updates are identical to practice.
- [ ] Correct = hit, a streak of 3 = special, miss = dodge + requeue. The player can't lose.
- [ ] Arena-only species can be befriended and appear in the Creature book.
- [ ] A battle-pose variant exists for every owned species.

## 16. Delivery and hosting notes

- **Repo:** new public GitHub repo under the user's account (name TBD, e.g. `spellbeasts`). `/repo` currently has no commits or remote.
- **Pages:** Settings → Pages → Deploy from branch → `main` / root. The site needs no build step, which avoids having to push workflow files.
- Commit directly to `main` (user's default).
- `.gitignore` includes local word-list and backup patterns (`*.words.*`, `private/`, `spellbeasts-backup*.json`).
- During implementation, the 50 study words transcribed from the user's photos will be given to the user as a **local import file outside the repo** (e.g. in a scratch/private folder), formatted per §6.3.

## 17. Open questions

1. Final game name and repo name.
2. Final creature and region names, and the three starter creatures. Should the player help pick from candidates?
3. Should a "Practice only missed words" quick-session button be added to the map screen in Phase 1, or wait?
4. Default voice. The parent may want to test the available Chromebook voices first.
