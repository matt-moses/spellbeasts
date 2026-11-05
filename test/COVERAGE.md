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
