"""Lab result Pydantic v2 schemas (P1a).

LabCreate rejects is_critical from client via model_validator(mode="before").
is_critical is server-computed and must not be supplied by the caller.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.vitals import _future_datetime_check


class LabCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=False)

    test_name: str = Field(min_length=1, max_length=100)
    value: float
    unit: str = Field(min_length=1, max_length=50)
    reference_low: float | None = None
    reference_high: float | None = None
    recorded_at: datetime

    @model_validator(mode="before")
    @classmethod
    def _reject_is_critical(cls, data: Any) -> Any:
        if isinstance(data, dict) and "is_critical" in data:
            raise ValueError("field_not_allowed")
        return data

    @field_validator("recorded_at", mode="after")
    @classmethod
    def _check_future(cls, v: datetime) -> datetime:
        return _future_datetime_check(v)


class LabRead(LabCreate):
    id: uuid.UUID
    patient_id: uuid.UUID
    is_critical: bool

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=False)


class LabListResponse(BaseModel):
    labs: list[LabRead]
    page: int = Field(ge=1)
    limit: int = Field(ge=1, le=100)
    total_pages: int = Field(ge=0)
