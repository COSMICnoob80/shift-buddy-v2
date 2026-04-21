"""Register + login business logic.

Keeps routers thin. All error paths raise :class:`AuthError` with a
machine-readable code that maps to the locked NFR-003 envelope.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Final

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import configure_logging
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, RegisterRequest
from app.services.jwt_service import issue_token
from app.services.password import (
    DUMMY_BCRYPT_HASH,
    PasswordPolicyResult,
    hash_password,
    validate_password_policy,
    validate_pmdc,
    verify_password,
)

# Ensure logging is configured as early as possible when the service is imported.
configure_logging()

LOCKOUT_THRESHOLD: Final = 5
LOCKOUT_DURATION = timedelta(minutes=15)


class AuthError(Exception):
    """Raised by service layer; carries an envelope code + message."""

    def __init__(self, status_code: int, code: str, message: str) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        super().__init__(message)


@dataclass(frozen=True)
class RegisterResult:
    user_id: str
    token: str


@dataclass(frozen=True)
class LoginResult:
    token: str
    user: User


def _utcnow() -> datetime:
    return datetime.now(UTC)


async def register_user(session: AsyncSession, payload: RegisterRequest) -> RegisterResult:
    if not validate_pmdc(payload.pmdc_number):
        raise AuthError(400, "invalid_pmdc", "PMDC number format is invalid.")
    policy = validate_password_policy(payload.password)
    if policy is PasswordPolicyResult.BREACHED:
        raise AuthError(400, "breached_password", "Password appears in a known breach list.")
    if policy is PasswordPolicyResult.WEAK:
        raise AuthError(400, "weak_password", "Password does not meet policy.")

    user = User(
        name=payload.name.strip(),
        email=payload.email,
        password_hash=hash_password(payload.password),
        pmdc_number=payload.pmdc_number,
        hospital_code=payload.hospital_code,
        department=payload.department,
        role=UserRole.HO,
    )
    session.add(user)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        # Generic 409 — MUST NOT disclose which field collided (Story 1 AC5).
        raise AuthError(
            409, "already_registered", "Registration could not be completed."
        ) from exc

    await session.refresh(user)
    token = issue_token(user.id)
    return RegisterResult(user_id=str(user.id), token=token)


async def _lookup_user_by_email(session: AsyncSession, email: str) -> User | None:
    stmt = select(User).where(func.lower(User.email) == email.lower())
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def login_user(session: AsyncSession, payload: LoginRequest) -> LoginResult:
    user = await _lookup_user_by_email(session, payload.email)

    # Timing equalization: always run a bcrypt verify even if the user doesn't exist.
    # This blunts the oracle that distinguishes unknown-email from wrong-password.
    if user is None:
        await asyncio.to_thread(verify_password, payload.password, DUMMY_BCRYPT_HASH)
        raise AuthError(401, "invalid_credentials", "Invalid email or password.")

    now = _utcnow()
    locked_until = user.locked_until
    if locked_until is not None and locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=UTC)
    if locked_until is not None and locked_until > now:
        raise AuthError(401, "account_locked", "Account temporarily locked. Try again later.")

    password_ok = await asyncio.to_thread(verify_password, payload.password, user.password_hash)
    if not password_ok:
        user.failed_login_count += 1
        if user.failed_login_count >= LOCKOUT_THRESHOLD:
            user.locked_until = now + LOCKOUT_DURATION
        await session.commit()
        raise AuthError(401, "invalid_credentials", "Invalid email or password.")

    # Successful auth — reset lockout state.
    user.failed_login_count = 0
    user.locked_until = None
    await session.commit()
    await session.refresh(user)

    token = issue_token(user.id)
    return LoginResult(token=token, user=user)
