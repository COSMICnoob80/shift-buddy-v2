"""Bearer-token auth middleware — protected routes only (FR-004).

Public allowlist: /api/v1/health, /api/v1/auth/*, /docs, /openapi.json.
All other /api/v1/* routes require a valid HS256 JWT; the verified UUID
is attached as ``request.state.user_id``.
"""

from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.services.jwt_service import InvalidTokenError, verify_token

PUBLIC_PATHS: frozenset[str] = frozenset(
    {
        "/api/v1/health",
        "/api/v1/auth/register",
        "/api/v1/auth/login",
        "/docs",
        "/openapi.json",
        "/redoc",
    }
)


def _envelope(status: int, error: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": error, "message": message},
        headers={"WWW-Authenticate": "Bearer"} if status == 401 else {},
    )


class BearerAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        path = request.url.path
        if path in PUBLIC_PATHS or not path.startswith("/api/v1/"):
            return await call_next(request)

        header = request.headers.get("Authorization", "")
        scheme, _, raw = header.partition(" ")
        if scheme.lower() != "bearer" or not raw:
            return _envelope(401, "unauthenticated", "Authentication required.")
        try:
            claims = verify_token(raw.strip())
        except InvalidTokenError as exc:
            code = "token_expired" if "expired" in str(exc).lower() else "unauthenticated"
            message = "Token expired." if code == "token_expired" else "Authentication required."
            return _envelope(401, code, message)

        request.state.user_id = claims.user_id
        return await call_next(request)


def current_user_id(request: Request) -> uuid.UUID:
    """Dependency for protected handlers (lands in P1 alongside clinical routes)."""
    user_id = getattr(request.state, "user_id", None)
    if not isinstance(user_id, uuid.UUID):
        raise InvalidTokenError("no authenticated user on request")
    return user_id
