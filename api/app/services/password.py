"""Password policy, breach check, and bcrypt hashing (NFR-002 / NFR-005)."""

from __future__ import annotations

import enum
import re
from functools import lru_cache
from pathlib import Path

from passlib.context import CryptContext  # type: ignore[import-untyped]

PMDC_RE = re.compile(r"^\d{4,6}-[A-Z]$")
_PWD_CTX = CryptContext(schemes=["bcrypt"], bcrypt__rounds=12, deprecated="auto")
_BREACH_LIST_PATH = Path(__file__).resolve().parents[1] / "data" / "breached_passwords.txt"

MIN_PASSWORD_LEN = 12


class PasswordPolicyResult(enum.StrEnum):
    OK = "ok"
    WEAK = "weak"
    BREACHED = "breached"


def validate_pmdc(value: str) -> bool:
    """Return True iff value matches ``^\\d{4,6}-[A-Z]$``."""
    return bool(PMDC_RE.fullmatch(value))


@lru_cache(maxsize=1)
def _breach_set() -> frozenset[str]:
    if not _BREACH_LIST_PATH.exists():
        return frozenset()
    with _BREACH_LIST_PATH.open(encoding="utf-8") as fh:
        return frozenset(line.strip().lower() for line in fh if line.strip())


def is_breached(password: str) -> bool:
    return password.lower() in _breach_set()


def _count_classes(password: str) -> int:
    classes = 0
    if any(c.islower() for c in password):
        classes += 1
    if any(c.isupper() for c in password):
        classes += 1
    if any(c.isdigit() for c in password):
        classes += 1
    if any(not c.isalnum() for c in password):
        classes += 1
    return classes


def validate_password_policy(password: str) -> PasswordPolicyResult:
    """≥12 chars, 3-of-4 classes, and not in the top-10k breach list."""
    if len(password) < MIN_PASSWORD_LEN:
        return PasswordPolicyResult.WEAK
    if _count_classes(password) < 3:
        return PasswordPolicyResult.WEAK
    if is_breached(password):
        return PasswordPolicyResult.BREACHED
    return PasswordPolicyResult.OK


def hash_password(password: str) -> str:
    return str(_PWD_CTX.hash(password))


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bool(_PWD_CTX.verify(password, hashed))
    except ValueError:
        return False


DUMMY_BCRYPT_HASH = "$2b$12$CjwlYqv7L8kZ5oHnxqV4AOjzg7V3p5dXbDZ0X1bgB2sVqfj.mOY9a"
"""Known-valid bcrypt hash used to equalize login timing on unknown email."""
