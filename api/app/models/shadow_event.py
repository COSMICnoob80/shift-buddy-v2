"""ShadowEvent ORM model — MEP hinge for Shadow-First deployment (Principles XIII, XIV).

The underlying table was created in migration 0002_shadow_events. This ORM model
enables SQLAlchemy session writes and allows Base.metadata.create_all in test fixtures.
Uses _PortableJSON for cross-dialect JSONB/JSON support (PostgreSQL/SQLite).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.patient import _PortableJSON
from app.models.user import _UUIDString


def _utcnow() -> datetime:
    return datetime.now(UTC)


class ShadowEvent(Base):
    __tablename__ = "shadow_events"

    id: Mapped[uuid.UUID] = mapped_column(_UUIDString(), primary_key=True, default=uuid.uuid4)
    shift_id: Mapped[uuid.UUID | None] = mapped_column(_UUIDString(), nullable=True)
    ho_user_id: Mapped[uuid.UUID] = mapped_column(
        _UUIDString(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(_PortableJSON(), nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    divergence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
