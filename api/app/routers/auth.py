"""Auth router — /auth/register + /auth/login (FR-002, FR-003)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db import get_session
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    UserPublic,
)
from app.services.auth_service import AuthError, login_user, register_user

router = APIRouter(tags=["auth"])


def _raise_envelope(err: AuthError) -> None:
    raise HTTPException(
        status_code=err.status_code,
        detail={"error": err.code, "message": err.message},
    )


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(
    payload: RegisterRequest,
    session: AsyncSession = Depends(get_session),
) -> RegisterResponse:
    try:
        result = await register_user(session, payload)
    except AuthError as err:
        _raise_envelope(err)
        raise  # unreachable; keeps mypy happy

    return RegisterResponse(id=result.user_id, token=result.token)  # type: ignore[arg-type]


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> LoginResponse:
    # Rate-limiting is installed at app-factory level via slowapi on this route.
    _ = request
    try:
        result = await login_user(session, payload)
    except AuthError as err:
        _raise_envelope(err)
        raise  # unreachable

    user_public = UserPublic.model_validate(result.user)
    return LoginResponse(token=result.token, user=user_public)
