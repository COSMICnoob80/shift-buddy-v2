"""T075 — In-process mirror of the router-allowlist CI gate (NFR-009, Principle III).

P1a amendment: allowlist extended from P0 {__init__.py, health.py, auth.py} to
include {patients.py, vitals.py, labs.py} per FR-020 and plan.md §Scope Guard Amendment.

Any other file in api/app/routers/ still fails loud.
"""

from __future__ import annotations

from pathlib import Path

ROUTERS_DIR = Path(__file__).resolve().parents[2] / "app" / "routers"
ALLOWED: frozenset[str] = frozenset(
    {"__init__.py", "health.py", "auth.py", "patients.py", "vitals.py", "labs.py"}
)


def test_routers_directory_exists() -> None:
    assert ROUTERS_DIR.is_dir(), f"expected routers dir at {ROUTERS_DIR}"


def test_router_file_set_matches_p1a_allowlist() -> None:
    actual = {p.name for p in ROUTERS_DIR.iterdir() if p.is_file() and p.suffix == ".py"}
    unexpected = actual - ALLOWED
    missing = ALLOWED - actual
    assert not unexpected, (
        f"P1a router allowlist violation (Principle III): unexpected files {sorted(unexpected)} "
        f"in {ROUTERS_DIR}. Allowed: {sorted(ALLOWED)}."
    )
    assert not missing, (
        f"P1a router allowlist drift: missing expected files {sorted(missing)} in {ROUTERS_DIR}."
    )
