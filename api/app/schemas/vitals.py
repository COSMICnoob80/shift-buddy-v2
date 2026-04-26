"""VitalSigns Pydantic v2 schemas (P1a)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def _future_datetime_check(v: datetime) -> datetime:
    if v > datetime.now(UTC):
        raise ValueError("recorded_at: cannot be a future timestamp")
    return v


_MEASUREMENT_FIELDS = frozenset(
    {
        "heart_rate",
        "systolic_bp",
        "diastolic_bp",
        "temperature",
        "spo2",
        "respiratory_rate",
        "gcs",
        "urine_output",
        "blood_sugar",
    }
)


class VitalsCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=False)

    heart_rate: int | None = Field(default=None, ge=0, le=300)
    systolic_bp: int | None = Field(default=None, ge=0, le=300)
    diastolic_bp: int | None = Field(default=None, ge=0, le=200)
    temperature: float | None = Field(default=None, ge=30.0, le=45.0)
    spo2: int | None = Field(default=None, ge=0, le=100)
    respiratory_rate: int | None = Field(default=None, ge=0, le=80)
    gcs: int | None = Field(default=None, ge=3, le=15)
    urine_output: float | None = Field(default=None, ge=0.0, le=5000.0)
    blood_sugar: float | None = Field(default=None, ge=0.0, le=1000.0)
    recorded_at: datetime

    @field_validator("recorded_at", mode="after")
    @classmethod
    def _check_future(cls, v: datetime) -> datetime:
        return _future_datetime_check(v)

    @model_validator(mode="after")
    def _require_at_least_one_measurement(self) -> "VitalsCreate":
        has_any = any(
            getattr(self, field) is not None for field in _MEASUREMENT_FIELDS
        )
        if not has_any:
            raise ValueError("At least one measurement field required")
        return self


class VitalsRead(VitalsCreate):
    id: uuid.UUID
    patient_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=False)


class VitalsListResponse(BaseModel):
    vitals: list[VitalsRead]
    page: int = Field(ge=1)
    limit: int = Field(ge=1, le=100)
    total_pages: int = Field(ge=0)
