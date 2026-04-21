"""T023 RED — JWT claim shape: sub=UUID, HS256, 15-min TTL, no PHI (FR-004)."""

from __future__ import annotations

import time
import uuid

from jose import jwt as jose_jwt

from app.core.config import get_settings
from app.services.jwt_service import issue_token, verify_token


def test_issue_token_claim_shape() -> None:
    user_id = uuid.uuid4()
    before = int(time.time())
    token = issue_token(user_id)
    after = int(time.time())

    assert isinstance(token, str) and token.count(".") == 2

    settings = get_settings()
    decoded = jose_jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
        options={"verify_aud": False},
    )

    assert decoded["sub"] == str(user_id)
    assert decoded["iss"] == "shift-buddy"
    assert decoded["exp"] - decoded["iat"] == 900
    assert before <= decoded["iat"] <= after
    # PHI exclusion — sub is UUID only.
    forbidden = {"name", "email", "pmdc", "pmdc_number", "mrn", "dob", "phone"}
    assert forbidden.isdisjoint(decoded.keys())


def test_verify_token_returns_uuid() -> None:
    user_id = uuid.uuid4()
    token = issue_token(user_id)
    claims = verify_token(token)
    assert claims.user_id == user_id
