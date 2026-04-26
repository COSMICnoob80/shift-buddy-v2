"""Patient ORM model (P1a data-model.md §Entity: Patient)."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    TypeDecorator,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, _utcnow
from app.models.user import _UUIDString


class _PortableJSON(TypeDecorator[Any]):
    """Emits JSONB on PostgreSQL, JSON on SQLite/other dialects."""

    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect: Any) -> Any:
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        from sqlalchemy import JSON

        return dialect.type_descriptor(JSON())

    def process_bind_param(self, value: Any, dialect: Any) -> Any:
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        import json

        return json.dumps(value)

    def process_result_value(self, value: Any, dialect: Any) -> Any:
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        if isinstance(value, str):
            import json

            return json.loads(value)
        return value


class Patient(Base):
    __tablename__ = "patients"

    __table_args__ = (
        CheckConstraint("length(bed_number) >= 1", name="ck_patients_bed_number_len"),
        CheckConstraint("length(name) >= 1", name="ck_patients_name_len"),
        CheckConstraint(
            "length(provisional_diagnosis) >= 1", name="ck_patients_diag_len"
        ),
        CheckConstraint("age BETWEEN 0 AND 150", name="ck_patients_age"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        _UUIDString(), primary_key=True, default=uuid.uuid4
    )
    bed_number: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    sex: Mapped[str] = mapped_column(String(10), nullable=False)
    rank_title: Mapped[str | None] = mapped_column(String(100), nullable=True)
    date_of_admission: Mapped[date] = mapped_column(Date, nullable=False)
    provisional_diagnosis: Mapped[str] = mapped_column(String(500), nullable=False)
    active_problems: Mapped[list[Any]] = mapped_column(
        _PortableJSON(), nullable=False, default=list
    )
    current_medications: Mapped[list[Any]] = mapped_column(
        _PortableJSON(), nullable=False, default=list
    )
    allergies: Mapped[list[Any]] = mapped_column(
        _PortableJSON(), nullable=False, default=list
    )
    acuity: Mapped[str] = mapped_column(String(20), nullable=False, default="stable")
    ward: Mapped[str] = mapped_column(String(30), nullable=False)
    assigned_ho: Mapped[uuid.UUID] = mapped_column(
        _UUIDString(),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="admitted")
    discharged_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    condition_at_discharge: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        _UUIDString(),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow
    )
