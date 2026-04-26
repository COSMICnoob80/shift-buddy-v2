"""LabResult ORM model (P1a data-model.md §Entity: LabResult)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.user import _UUIDString


class LabResult(Base):
    __tablename__ = "lab_results"

    __table_args__ = (
        CheckConstraint("length(test_name) >= 1", name="ck_lab_results_test_name_len"),
        CheckConstraint("length(unit) >= 1", name="ck_lab_results_unit_len"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        _UUIDString(), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        _UUIDString(),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
    )
    test_name: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[float] = mapped_column(Numeric(precision=10, scale=4), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    reference_low: Mapped[float | None] = mapped_column(
        Numeric(precision=10, scale=4), nullable=True
    )
    reference_high: Mapped[float | None] = mapped_column(
        Numeric(precision=10, scale=4), nullable=True
    )
    is_critical: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
