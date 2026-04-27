"""T077 — Negative gate: check_router_allowlist.sh still fails on P1a scope creep.

Creates api/app/routers/_dummy_p1a.py (teardown removes it); shells out to the
CI script; asserts non-zero exit AND teardown restores tree. Analogous to T043.
"""

from __future__ import annotations

import subprocess
from collections.abc import Generator
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
_DUMMY = _REPO_ROOT / "api" / "app" / "routers" / "_dummy_p1a.py"
_SCRIPT = _REPO_ROOT / "scripts" / "ci" / "check_router_allowlist.sh"


@pytest.fixture()
def planted_dummy_p1a() -> Generator[None, None, None]:
    _DUMMY.write_text("# P1a scope-creep sentinel — must be caught by the CI gate\n")
    try:
        yield
    finally:
        if _DUMMY.exists():
            _DUMMY.unlink()


def test_allowlist_script_fails_on_unknown_p1a_router(planted_dummy_p1a: None) -> None:
    result = subprocess.run(
        ["bash", str(_SCRIPT)],
        capture_output=True,
        text=True,
        cwd=str(_REPO_ROOT),
    )
    assert result.returncode != 0, (
        f"Expected non-zero exit from check_router_allowlist.sh with _dummy_p1a.py present, "
        f"got 0. stdout={result.stdout!r} stderr={result.stderr!r}"
    )
    assert "_dummy_p1a.py" in result.stdout, (
        f"Expected _dummy_p1a.py name in script output, got: {result.stdout!r}"
    )


def test_dummy_file_removed_after_fixture(planted_dummy_p1a: None) -> None:
    assert _DUMMY.exists(), "fixture did not create _dummy_p1a.py"
