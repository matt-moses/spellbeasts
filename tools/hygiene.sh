#!/usr/bin/env bash
# Scans tracked + untracked-unignored files for forbidden content.
# Franchise terms are built in; real word-list terms go in the git-ignored
# tools/denylist.local.txt (one per line). Docs PRD/plan are exempt (they name the rules).
cd "$(dirname "$0")/.." || exit 2
ROOT="${HYGIENE_ROOT:-.}"
FRANCHISE='pok[eé]mon|pikachu|charizard|harry potter|hogwarts|hermione|dumbledore|voldemort|quidditch|toothless|how to train your dragon|\blego\b|digimon|nintendo'
fail=0
if [ "$ROOT" = "." ]; then
  files=$(git ls-files -co --exclude-standard | grep -v -e '^docs/' -e '^tools/hygiene.sh$' -e '^test/hygiene.test.js$')
else
  files=$(cd "$ROOT" && find . -type f | sed 's|^\./||')
fi
for f in $files; do
  [ -f "$ROOT/$f" ] || continue
  if grep -IniE "$FRANCHISE" "$ROOT/$f" >/tmp/hyg.$$ 2>/dev/null; then
    echo "HYGIENE: franchise term in $f"; cat /tmp/hyg.$$; fail=1
  fi
  if [ -f tools/denylist.local.txt ]; then
    while IFS= read -r w; do
      [ -z "$w" ] && continue
      if grep -IniwF -- "$w" "$ROOT/$f" >/dev/null 2>&1; then
        echo "HYGIENE: denylisted word in $f"; fail=1
      fi
    done < tools/denylist.local.txt
  fi
done
rm -f /tmp/hyg.$$
[ $fail -eq 0 ] && echo "hygiene ok"
exit $fail
