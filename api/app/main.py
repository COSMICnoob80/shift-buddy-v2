"""FastAPI app factory (P0).

Wires:
  - structlog redactor (Principle IV — commit #1 guarantee)
  - /api/v1 routers: health + auth
  - error-envelope exception handlers (NFR-003): every non-2xx body has
    exactly {"error", "message"} — never FastAPI's default {"detail": ...}.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.middleware import BearerAuthMiddleware
from app.core.ratelimit import limiter
from app.routers import alerts as alerts_module
from app.routers import auth as auth_router
from app.routers import health as health_router
from app.routers import labs as labs_router
from app.routers import patients as patients_router
from app.routers import protocols as protocols_router
from app.routers import vitals as vitals_router
from app.routers.alerts import alerts_acknowledge_router

API_PREFIX = "/api/v1"


def _envelope_response(status_code: int, error: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": error, "message": message})


def _install_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def _http_exc_handler(_: Request, exc: HTTPException) -> JSONResponse:
        detail = exc.detail
        if isinstance(detail, dict) and "error" in detail and "message" in detail:
            return _envelope_response(
                exc.status_code,
                str(detail["error"]),
                str(detail["message"]),
            )
        code = detail if isinstance(detail, str) else "http_error"
        message = detail if isinstance(detail, str) else str(detail)
        mapping = {
            401: ("unauthenticated", "Authentication required."),
            403: ("forbidden", "Forbidden."),
            404: ("not_found", "Not found."),
            429: ("rate_limited", "Too many requests. Slow down."),
        }
        default = mapping.get(exc.status_code)
        if default and not isinstance(detail, str):
            code, message = default
        elif not isinstance(detail, str):
            message = str(detail)
        return _envelope_response(exc.status_code, code, message)

    @app.exception_handler(RequestValidationError)
    async def _validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return _envelope_response(400, "validation_error", "Request validation failed.")


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(level=settings.log_level)

    app = FastAPI(
        title="Shift Buddy V2 API",
        version="0.1.0",
        docs_url="/docs",
        openapi_url="/openapi.json",
    )
    app.state.limiter = limiter

    @app.exception_handler(RateLimitExceeded)
    async def _rate_limit_handler(_: Request, __: RateLimitExceeded) -> JSONResponse:
        return _envelope_response(429, "rate_limited", "Too many requests. Slow down.")

    _install_exception_handlers(app)
    app.add_middleware(BearerAuthMiddleware)

    app.include_router(health_router.router, prefix=API_PREFIX)
    app.include_router(auth_router.router, prefix=f"{API_PREFIX}/auth")
    app.include_router(patients_router.router, prefix=API_PREFIX)
    app.include_router(vitals_router.router, prefix=f"{API_PREFIX}/patients")
    app.include_router(labs_router.router, prefix=f"{API_PREFIX}/patients")
    # GET /patients/{id}/alerts lives under /patients prefix (same as vitals/labs)
    app.include_router(alerts_module.router, prefix=f"{API_PREFIX}/patients")
    # POST /alerts/{id}/acknowledge lives under /api/v1
    app.include_router(alerts_acknowledge_router, prefix=API_PREFIX)
    app.include_router(protocols_router.router, prefix=API_PREFIX)
    return app


app = create_app()
