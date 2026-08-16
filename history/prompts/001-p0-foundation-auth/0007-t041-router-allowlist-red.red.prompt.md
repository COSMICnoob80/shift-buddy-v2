---
id: 0007
title: T041 router allowlist RED
stage: red
date: 2026-04-24
surface: agent
model: claude-opus-4-7
feature: 001-p0-foundation-auth
branch: 001-p0-foundation-auth
user: COSMICnoob80
command: /sp.implement
labels: ["ci-gate", "principle-iii", "nfr-009", "scope-guard", "tdd-red"]
links:
  spec: specs/001-p0-foundation-auth/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - api/tests/integration/test_router_allowlist.py
  - specs/001-p0-foundation-auth/tasks.md
tests:
  - api/tests/integration/test_router_allowlist.py::test_routers_directory_exists
  - api/tests/integration/test_router_allowlist.py::test_router_file_set_matches_p0_allowlist
---

## Prompt

Proceed straight into CP3 / STEP C (T041 next, committing per    
    task)

## Response snapshot

Implemented T041 — the in-process mirror of the router-allowlist CI gate. Added
`api/tests/integration/test_router_allowlist.py` with two checks: (1) the
routers directory exists at the expected path, (2) the Python file set in
`api/app/routers/` equals exactly `{__init__.py, health.py, auth.py}`. Test
uses `pathlib.Path.iterdir()` + set comparison for exhaustive detection and
surfaces both unexpected-extra and missing-expected files with targeted error
messages citing Principle III.

Verified: `pytest` 2/2 PASS, `ruff check`/`ruff format --check` clean, `mypy
--strict` clean. Flipped `[ ] T041` → `[X] T041` in tasks.md. Committing this
task on its own per the user’s per-task commit cadence; T042 (shell script +
CI wiring) and T043 (negative test) will follow as separate commits.

## Outcome

- ✅ Impact: Scope-creep guard now fires under `pytest` (defense in depth with T042 shell gate). Closes the pytest half of NFR-009 / SC-008.
- 🧪 Tests: 2 added, 2 passing. Ruff + mypy --strict clean on the new file.
- 📁 Files: +1 test (`test_router_allowlist.py`), tasks.md checkbox flip.
- 🔁 Next prompts: T042 `scripts/ci/check_router_allowlist.sh` + `.github/workflows/ci.yml` `router-allowlist` job; then T043 negative test proving the shell gate fails loud on a planted dummy router.
- 🧠 Reflection: Task labels "RED" but the acceptance criterion is "passes now" — flagged to user; treated as scope gate rather than failing-first test. Worth revisiting the template wording in a follow-up spec-hygiene sweep.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): pytest PASS (2/2), ruff check PASS, ruff format --check PASS, mypy --strict PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): when writing T042 shell script, keep it byte-for-byte aligned with plan.md §CI Gates (lines 184–192) so the T043 negative test can assert exact exit-code contract without drift.
