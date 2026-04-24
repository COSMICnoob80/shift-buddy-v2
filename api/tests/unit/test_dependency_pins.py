"""CVE guard: passlib 1.7.4 + bcrypt 4.1.3 compatibility pin.

passlib 1.7.4 introspects `bcrypt.__about__.__version__`, which was removed
in bcrypt 4.1+. Running newer bcrypt against passlib 1.7.4 raises
`AttributeError: module 'bcrypt' has no attribute '__about__'` the first
time passlib tries to hash a password. We pin bcrypt to 4.1.3 (the last
release that keeps the attribute) until passlib 1.7.5 ships.

This test fails loudly if either pin drifts AND also runs a bcrypt smoke
to catch environment breakage.
"""

from __future__ import annotations

import tomllib
from pathlib import Path

PYPROJECT = Path(__file__).resolve().parents[2] / "pyproject.toml"


def _pinned(name: str, dependencies: list[str]) -> str | None:
    for dep in dependencies:
        if dep.startswith(f"{name}=="):
            return dep.split("==", 1)[1]
    return None


def test_passlib_pinned_exactly() -> None:
    data = tomllib.loads(PYPROJECT.read_text(encoding="utf-8"))
    deps = data["project"]["dependencies"]
    assert _pinned("passlib", deps) == "1.7.4", (
        "passlib MUST be pinned to ==1.7.4 — newer releases do not exist and "
        "older ones lack bcrypt 4.x compatibility shims."
    )


def test_bcrypt_pinned_exactly() -> None:
    data = tomllib.loads(PYPROJECT.read_text(encoding="utf-8"))
    deps = data["project"]["dependencies"]
    assert _pinned("bcrypt", deps) == "4.1.3", (
        "bcrypt MUST be pinned to ==4.1.3 — 4.2+ removes `__about__` which "
        "passlib 1.7.4 relies on, causing AttributeError at hash time."
    )


def test_bcrypt_hash_smoke() -> None:
    """Smoke test: `bcrypt.hashpw` must not raise."""
    import bcrypt

    hashed = bcrypt.hashpw(b"x" * 12, bcrypt.gensalt(rounds=4))
    assert hashed.startswith(b"$2")
    assert bcrypt.checkpw(b"x" * 12, hashed)
