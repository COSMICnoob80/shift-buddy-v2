"""Alert ORM model (P1b data-model.md §ORM Model Sketch)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base
from app.models.user import _UUIDString


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(_UUIDString(), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        _UUIDString(), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    alert_type: Mapped[str] = mapped_column(String(10), nullable=False)
    trigger_source: Mapped[str] = mapped_column(String(10), nullable=False)
    trigger_parameter: Mapped[str] = mapped_column(String(50), nullable=False)
    trigger_value: Mapped[float] = mapped_column(Float, nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    protocol_link: Mapped[str | None] = mapped_column(String(200), nullable=True)
    acknowledged: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false", default=False
    )
    acknowledged_by: Mapped[uuid.UUID | None] = mapped_column(
        _UUIDString(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    acknowledged_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
