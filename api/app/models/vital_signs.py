"""VitalSigns ORM model (P1a data-model.md §Entity: VitalSigns)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, _utcnow
from app.models.user import _UUIDString


class VitalSigns(Base):
    __tablename__ = "vital_signs"

    __table_args__ = (
        CheckConstraint(
            "heart_rate IS NULL OR (heart_rate >= 0 AND heart_rate <= 300)",
            name="ck_vital_signs_heart_rate",
        ),
        CheckConstraint(
            "systolic_bp IS NULL OR (systolic_bp >= 0 AND systolic_bp <= 300)",
            name="ck_vital_signs_systolic_bp",
        ),
        CheckConstraint(
            "diastolic_bp IS NULL OR (diastolic_bp >= 0 AND diastolic_bp <= 200)",
            name="ck_vital_signs_diastolic_bp",
        ),
        CheckConstraint(
            "temperature IS NULL OR (temperature >= 30.0 AND temperature <= 45.0)",
            name="ck_vital_signs_temperature",
        ),
        CheckConstraint(
            "spo2 IS NULL OR (spo2 >= 0 AND spo2 <= 100)",
            name="ck_vital_signs_spo2",
        ),
        CheckConstraint(
            "respiratory_rate IS NULL OR (respiratory_rate >= 0 AND respiratory_rate <= 80)",
            name="ck_vital_signs_respiratory_rate",
        ),
        CheckConstraint(
            "gcs IS NULL OR (gcs >= 3 AND gcs <= 15)",
            name="ck_vital_signs_gcs",
        ),
        CheckConstraint(
            "urine_output IS NULL OR (urine_output >= 0 AND urine_output <= 5000)",
            name="ck_vital_signs_urine_output",
        ),
        CheckConstraint(
            "blood_sugar IS NULL OR (blood_sugar >= 0 AND blood_sugar <= 1000)",
            name="ck_vital_signs_blood_sugar",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        _UUIDString(), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        _UUIDString(),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
    )
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    heart_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    systolic_bp: Mapped[int | None] = mapped_column(Integer, nullable=True)
    diastolic_bp: Mapped[int | None] = mapped_column(Integer, nullable=True)
    temperature: Mapped[float | None] = mapped_column(
        Numeric(precision=4, scale=1), nullable=True
    )
    spo2: Mapped[int | None] = mapped_column(Integer, nullable=True)
    respiratory_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gcs: Mapped[int | None] = mapped_column(Integer, nullable=True)
    urine_output: Mapped[float | None] = mapped_column(
        Numeric(precision=7, scale=1), nullable=True
    )
    blood_sugar: Mapped[float | None] = mapped_column(
        Numeric(precision=6, scale=1), nullable=True
    )
