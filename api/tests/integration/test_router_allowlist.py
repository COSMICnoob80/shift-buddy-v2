"""T096 — In-process mirror of the router-allowlist CI gate (NFR-009, Principle III).

P1b amendment: allowlist extended from P1a {__init__.py, health.py, auth.py,
patients.py, vitals.py, labs.py} to also include {alerts.py, protocols.py}
per FR-018 and plan.md §Scope Guard Amendment.

Any other file in api/app/routers/ still fails loud.
"""

from __future__ import annotations

from pathlib import Path

ROUTERS_DIR = Path(__file__).resolve().parents[2] / "app" / "routers"
ALLOWED: frozenset[str] = frozenset(
    {
        "__init__.py",
        "health.py",
        "auth.py",
        "patients.py",
        "vitals.py",
        "labs.py",
        "alerts.py",
        "protocols.py",
    }
)


def test_routers_directory_exists() -> None:
    assert ROUTERS_DIR.is_dir(), f"expected routers dir at {ROUTERS_DIR}"


def test_router_file_set_matches_p1b_allowlist() -> None:
    actual = {p.name for p in ROUTERS_DIR.iterdir() if p.is_file() and p.suffix == ".py"}
    unexpected = actual - ALLOWED
    missing = ALLOWED - actual
    assert not unexpected, (
        f"P1b router allowlist violation (Principle III): unexpected files {sorted(unexpected)} "
        f"in {ROUTERS_DIR}. Allowed: {sorted(ALLOWED)}."
    )
    assert not missing, (
        f"P1b router allowlist drift: missing expected files {sorted(missing)} in {ROUTERS_DIR}."
    )
