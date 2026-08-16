"""T043 — Negative gate: check_router_allowlist.sh fails loud on a planted dummy router.

Creates api/app/routers/_dummy.py in a fixture, shells out to the CI script,
asserts non-zero exit, then teardown removes the file so the tree is restored
for subsequent test runs.
"""

from __future__ import annotations

import subprocess
from collections.abc import Generator
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
_DUMMY = _REPO_ROOT / "api" / "app" / "routers" / "_dummy.py"
_SCRIPT = _REPO_ROOT / "scripts" / "ci" / "check_router_allowlist.sh"


@pytest.fixture()
def planted_dummy() -> Generator[None, None, None]:
    _DUMMY.write_text("# scope-creep sentinel — must be caught by the CI gate\n")
    try:
        yield
    finally:
        if _DUMMY.exists():
            _DUMMY.unlink()


def test_allowlist_script_fails_on_unknown_router(planted_dummy: None) -> None:
    result = subprocess.run(
        ["bash", str(_SCRIPT)],
        capture_output=True,
        text=True,
        cwd=str(_REPO_ROOT),
    )
    assert result.returncode != 0, (
        f"Expected non-zero exit from check_router_allowlist.sh with _dummy.py present, "
        f"got 0. stdout={result.stdout!r} stderr={result.stderr!r}"
    )
    assert "_dummy.py" in result.stdout, (
        f"Expected _dummy.py name in script output, got: {result.stdout!r}"
    )


def test_dummy_file_removed_after_fixture(planted_dummy: None) -> None:
    assert _DUMMY.exists(), "fixture did not create _dummy.py"


def test_routers_clean_after_teardown() -> None:
    assert not _DUMMY.exists(), "_dummy.py leaked after fixture teardown"
