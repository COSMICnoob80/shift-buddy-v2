"""T021 RED — Password policy + breach list + bcrypt (NFR-002, NFR-005)."""

from __future__ import annotations

import pytest

from app.services.password import (
    PasswordPolicyResult,
    hash_password,
    is_breached,
    validate_password_policy,
    verify_password,
)


def test_too_short_rejected() -> None:
    result = validate_password_policy("Ab1!xyz")
    assert result is PasswordPolicyResult.WEAK


@pytest.mark.parametrize(
    "password,expected",
    [
        # all-lower (1 class) — weak
        ("abcdefghijklm", PasswordPolicyResult.WEAK),
        # lower + digits (2 classes) — weak
        ("abcdefghij1234", PasswordPolicyResult.WEAK),
        # lower + upper + digits (3 classes) — OK
        ("Abcdefghij1234", PasswordPolicyResult.OK),
        # lower + upper + symbols (3 classes) — OK
        ("Abcdefghij!@#$", PasswordPolicyResult.OK),
        # all 4 classes — OK
        ("Abcdefghi1234!@", PasswordPolicyResult.OK),
    ],
)
def test_three_of_four_classes(password: str, expected: PasswordPolicyResult) -> None:
    assert validate_password_policy(password) is expected


def test_breach_known_password() -> None:
    # "password1234" is 12 chars — clears length + 2 classes but is breached.
    assert is_breached("password1234") is True
    assert validate_password_policy("Password1234") is PasswordPolicyResult.BREACHED


def test_unbreached_random_password() -> None:
    assert is_breached("Zq8!vMpL3nRx#7Wt") is False


def test_bcrypt_roundtrip() -> None:
    hashed = hash_password("Abcdefghij1234!")
    assert len(hashed) == 60
    assert hashed.startswith("$2b$12$")
    assert verify_password("Abcdefghij1234!", hashed) is True
    assert verify_password("wrong-password", hashed) is False
