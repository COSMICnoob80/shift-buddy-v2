"""T041 — In-process mirror of the router-allowlist CI gate (NFR-009, Principle III).

Walks ``api/app/routers/`` and asserts the Python file set is exactly the P0
allowlist: ``{__init__.py, health.py, auth.py}``. Acts as a second gate
alongside ``scripts/ci/check_router_allowlist.sh`` (T042) so scope creep fails
locally under ``pytest`` before it ever reaches CI.
"""

from __future__ import annotations

from pathlib import Path

ROUTERS_DIR = Path(__file__).resolve().parents[2] / "app" / "routers"
ALLOWED: frozenset[str] = frozenset({"__init__.py", "health.py", "auth.py"})


def test_routers_directory_exists() -> None:
    assert ROUTERS_DIR.is_dir(), f"expected routers dir at {ROUTERS_DIR}"


def test_router_file_set_matches_p0_allowlist() -> None:
    actual = {p.name for p in ROUTERS_DIR.iterdir() if p.is_file() and p.suffix == ".py"}
    unexpected = actual - ALLOWED
    missing = ALLOWED - actual
    assert not unexpected, (
        f"P0 router allowlist violation (Principle III): unexpected files {sorted(unexpected)} "
        f"in {ROUTERS_DIR}. Allowed: {sorted(ALLOWED)}."
    )
    assert not missing, (
        f"P0 router allowlist drift: missing expected files {sorted(missing)} in {ROUTERS_DIR}."
    )
