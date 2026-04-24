"""HS256 JWT issue / verify with explicit algorithm allowlist.

Guards against CVE-2024-33663 / 33664 by passing ``algorithms=["HS256"]``
to :func:`jose.jwt.decode` — never accepts ``alg=none`` or asymmetric
algorithm confusion. Claims contain only `sub` (UUID), `iss`, `iat`,
`exp` — zero PHI (Principle IV).
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass

from jose import JWTError  # type: ignore[import-untyped]
from jose import jwt as jose_jwt

from app.core.config import get_settings

ISSUER = "shift-buddy"
ALLOWED_ALGORITHMS: tuple[str, ...] = ("HS256",)
LEEWAY_SECONDS = 60


class InvalidTokenError(Exception):
    """Raised when a token is malformed, expired, or cryptographically invalid."""


@dataclass(frozen=True)
class TokenClaims:
    user_id: uuid.UUID


def _now() -> int:
    """Override target for tests."""
    return int(time.time())


def issue_token(user_id: uuid.UUID) -> str:
    settings = get_settings()
    if settings.jwt_algorithm not in ALLOWED_ALGORITHMS:
        raise InvalidTokenError(f"unsupported algorithm: {settings.jwt_algorithm}")
    iat = _now()
    exp = iat + settings.jwt_expires_min * 60
    payload: dict[str, object] = {
        "sub": str(user_id),
        "iss": ISSUER,
        "iat": iat,
        "exp": exp,
    }
    token = jose_jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    return str(token)


def verify_token(token: str) -> TokenClaims:
    settings = get_settings()
    try:
        now = _now()
        decoded = jose_jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=list(ALLOWED_ALGORITHMS),
            issuer=ISSUER,
            options={
                "verify_aud": False,
                "verify_iat": False,
                "verify_exp": False,
            },
        )
    except JWTError as exc:
        raise InvalidTokenError(str(exc)) from exc

    exp = decoded.get("exp")
    iat = decoded.get("iat")
    sub = decoded.get("sub")
    if not isinstance(exp, int) or not isinstance(iat, int) or not isinstance(sub, str):
        raise InvalidTokenError("missing or malformed claims")
    if now > exp + LEEWAY_SECONDS:
        raise InvalidTokenError("token expired")
    try:
        return TokenClaims(user_id=uuid.UUID(sub))
    except ValueError as exc:
        raise InvalidTokenError("sub is not a UUID") from exc
