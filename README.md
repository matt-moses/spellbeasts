# Spellbeasts

A browser spelling-bee practice game with collectible original creatures. Static site: vanilla JS (ES modules), no build step, all data in the player's browser.

- Run locally: `bash tools/serve.sh` then open http://localhost:8000
- Tests + hygiene: `npm run check` (needs Node 20+; no runtime dependencies)
- Deploy: GitHub Pages, Deploy from branch → `main` / root
- **Copyright rule:** the real Scripps word list is never committed. Load it through the in-game Parent area; it stays in `localStorage`. Local word files (`*.words.*`, `private/`) are git-ignored.

See `docs/` for the PRD and execution plan.
