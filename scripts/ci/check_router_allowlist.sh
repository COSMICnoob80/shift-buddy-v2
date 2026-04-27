#!/usr/bin/env bash
set -euo pipefail
# P1a amendment: patients.py, vitals.py, labs.py added per FR-020
extra=$(find api/app/routers -maxdepth 1 -type f -name '*.py' \
  ! -name '__init__.py' ! -name 'health.py' ! -name 'auth.py' \
  ! -name 'patients.py' ! -name 'vitals.py' ! -name 'labs.py')
if [ -n "$extra" ]; then
  echo "P1a router allowlist violation (Principle III):"; echo "$extra"; exit 1
fi
