"""T029 RED — JWT alg allowlist guard (CVE-2024-33663 / 33664)."""

from __future__ import annotations

import uuid

import pytest
from jose import jwt as jose_jwt

from app.core.config import get_settings
from app.services.jwt_service import InvalidTokenError, issue_token, verify_token


def test_reject_alg_none() -> None:
    import base64
    import json

    def _b64(value: bytes) -> str:
        return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")

    header = _b64(json.dumps({"alg": "none", "typ": "JWT"}).encode("utf-8"))
    payload = _b64(
        json.dumps({"sub": str(uuid.uuid4()), "iss": "shift-buddy", "iat": 0, "exp": 2**31}).encode(
            "utf-8"
        )
    )
    # Hand-crafted unsigned token — jose library refuses to emit one.
    token = f"{header}.{payload}."
    with pytest.raises(InvalidTokenError):
        verify_token(token)


def test_reject_wrong_algorithm() -> None:
    settings = get_settings()
    claims = {"sub": str(uuid.uuid4()), "iss": "shift-buddy", "iat": 0, "exp": 2**31}
    # Same secret but HS512 — verifier must reject because only HS256 is allowed.
    token = jose_jwt.encode(claims, settings.jwt_secret, algorithm="HS512")
    with pytest.raises(InvalidTokenError):
        verify_token(token)


def test_reject_wrong_secret() -> None:
    # Use the library directly with a bogus secret to forge a valid-looking
    # HS256 token, then verify it with the real secret — must be rejected.
    claims = {"sub": str(uuid.uuid4()), "iss": "shift-buddy", "iat": 0, "exp": 2**31}
    token = jose_jwt.encode(claims, "WRONG-SECRET", algorithm="HS256")
    with pytest.raises(InvalidTokenError):
        verify_token(token)


def test_reject_malformed() -> None:
    with pytest.raises(InvalidTokenError):
        verify_token("not.a.jwt")


def test_valid_token_accepted() -> None:
    token = issue_token(uuid.uuid4())
    claims = verify_token(token)
    assert claims.user_id is not None
