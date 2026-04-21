"""T024 RED — JWT expiry + leeway (FR-004)."""

from __future__ import annotations

import uuid

import pytest

from app.services import jwt_service
from app.services.jwt_service import InvalidTokenError, issue_token, verify_token


def test_token_accepted_before_expiry(monkeypatch: pytest.MonkeyPatch) -> None:
    t0 = 1_700_000_000
    monkeypatch.setattr(jwt_service, "_now", lambda: t0)
    token = issue_token(uuid.uuid4())

    monkeypatch.setattr(jwt_service, "_now", lambda: t0 + 899)
    claims = verify_token(token)
    assert claims.user_id is not None


def test_token_rejected_after_expiry_plus_leeway(monkeypatch: pytest.MonkeyPatch) -> None:
    t0 = 1_700_000_000
    monkeypatch.setattr(jwt_service, "_now", lambda: t0)
    token = issue_token(uuid.uuid4())

    monkeypatch.setattr(jwt_service, "_now", lambda: t0 + 961)
    with pytest.raises(InvalidTokenError):
        verify_token(token)
