#!/usr/bin/env bash
set -euo pipefail
# P1b amendment: alerts.py, protocols.py added per FR-018
extra=$(find api/app/routers -maxdepth 1 -type f -name '*.py' \
  ! -name '__init__.py' ! -name 'health.py' ! -name 'auth.py' \
  ! -name 'patients.py' ! -name 'vitals.py' ! -name 'labs.py' \
  ! -name 'alerts.py' ! -name 'protocols.py')
if [ -n "$extra" ]; then
  echo "P1b router allowlist violation (Principle III):"; echo "$extra"; exit 1
fi
