# Agent notes

## Dependencies: locked, and only updated on a human's request

The shipped site has no runtime dependencies and loads nothing from a CDN. The only package is `playwright-core`, a dev dependency used for browser tests. Keep it that way.

- **Never add, remove, upgrade or downgrade a dependency on your own initiative.** This includes "routine" bumps, fixing an audit warning, and installing a helper package for a task. Do it only when the user explicitly asks, and name the package and version you changed in your reply.
- **Exact versions only.** No `^`, `~`, `latest`, ranges or git/URL specs in `package.json`. `.npmrc` sets `save-exact=true`; don't override it.
- **Commit `package-lock.json` with every dependency change.** It holds the registry URL and `sha512` integrity hash. Never delete or regenerate it wholesale; review its diff.
- **Install scripts stay off.** `.npmrc` has `ignore-scripts=true`. Don't pass `--ignore-scripts=false` or run a dependency's lifecycle scripts.
- **Use `npm ci`, not `npm install`,** for normal installs (CI does). `npm install` can rewrite the lockfile.
- **When asked to update a dependency:** pin the exact version, run `npm audit` and the full `npm test`, check the lockfile diff only touches the intended package, and prefer a release that has been public for a few days.
- **GitHub Actions** should be pinned to full commit SHAs, not floating tags. The App token can't push `.github/workflows`; send the edit to the user.
