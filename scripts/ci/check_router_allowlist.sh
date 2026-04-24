#!/usr/bin/env bash
set -euo pipefail
extra=$(find api/app/routers -maxdepth 1 -type f -name '*.py' \
  ! -name '__init__.py' ! -name 'health.py' ! -name 'auth.py')
if [ -n "$extra" ]; then
  echo "P0 router allowlist violation (Principle III):"; echo "$extra"; exit 1
fi
