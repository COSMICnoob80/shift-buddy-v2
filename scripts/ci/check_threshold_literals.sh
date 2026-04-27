#!/usr/bin/env bash
# T087 — Guard: no clinical threshold literals in routers or services.
# Exits 1 (failure) if ANY literal threshold value is found in those paths.
# Exits 0 (success) when the tree is clean (all values sourced from config).
set -euo pipefail

SEARCH_DIRS="api/app/routers api/app/services"

PATTERN='6\.0\|2\.5\|7\.0\|50\.0\|3\.0\|400\.0\|54\.0\|4\.0\|125\.0\|155\.0'

matches=$(grep -rn "$PATTERN" $SEARCH_DIRS 2>/dev/null | grep -v "^Binary" || true)

if [ -n "$matches" ]; then
  echo "FAIL: threshold literals found in routers/services:" >&2
  echo "$matches" >&2
  exit 1
fi

echo "PASS: no threshold literals found in routers/services."
exit 0
