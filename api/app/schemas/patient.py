"""Patient Pydantic v2 schemas (P1a).

Validates: future date_of_admission, whitespace trimming on targeted fields,
enum values, active_problems item length, age bounds.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ── Enums (plain string literals validated by Pydantic) ──────────────────────

PATIENT_SEX = {"male", "female"}
PATIENT_ACUITY = {"critical", "urgent", "stable", "discharge_ready"}
PATIENT_WARD = {"ortho", "surgical_itc", "family", "officer", "child", "emergency"}
PATIENT_STATUS = {"admitted", "discharged", "transferred", "expired"}
MEDICATION_ROUTE = {"iv", "im", "sc", "po", "pr", "nebulized", "topical", "sublingual"}


def _trim(v: str) -> str:
    return v.strip()


def _validate_enum(v: str, allowed: set[str], field: str) -> str:
    if v not in allowed:
        raise ValueError(f"{field}: must be one of {sorted(allowed)}")
    return v


# ── MedicationSchema ──────────────────────────────────────────────────────────

class MedicationSchema(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    dose: str = Field(min_length=1, max_length=50)
    route: str
    frequency: str = Field(min_length=1, max_length=20)
    start_date: str
    end_date: str | None = None
    notes: str | None = None

    @field_validator("route")
    @classmethod
    def _validate_route(cls, v: str) -> str:
        return _validate_enum(v, MEDICATION_ROUTE, "route")


# ── PatientCreate ─────────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=False)

    bed_number: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=100)
    age: int = Field(ge=0, le=150)
    sex: str
    rank_title: str | None = None
    date_of_admission: date
    provisional_diagnosis: str = Field(min_length=1, max_length=500)
    active_problems: list[str] = Field(default_factory=list, max_length=20)
    current_medications: list[MedicationSchema] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    acuity: str
    ward: str
    assigned_ho: uuid.UUID | None = None

    @field_validator("name", "bed_number", "provisional_diagnosis", mode="before")
    @classmethod
    def _trim_targeted_fields(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("active_problems", mode="before")
    @classmethod
    def _validate_active_problems(cls, v: Any) -> Any:
        if isinstance(v, list):
            for item in v:
                if isinstance(item, str) and len(item) > 200:
                    raise ValueError("active_problems: each item must be ≤ 200 chars")
        return v

    @field_validator("sex")
    @classmethod
    def _validate_sex(cls, v: str) -> str:
        return _validate_enum(v, PATIENT_SEX, "sex")

    @field_validator("acuity")
    @classmethod
    def _validate_acuity(cls, v: str) -> str:
        return _validate_enum(v, PATIENT_ACUITY, "acuity")

    @field_validator("ward")
    @classmethod
    def _validate_ward(cls, v: str) -> str:
        return _validate_enum(v, PATIENT_WARD, "ward")

    @field_validator("date_of_admission", mode="after")
    @classmethod
    def _reject_future_admission(cls, v: date) -> date:
        today = datetime.now(UTC).date()
        if v > today:
            raise ValueError("date_of_admission: cannot be a future date")
        return v


# ── PatientRead ───────────────────────────────────────────────────────────────

class PatientRead(PatientCreate):
    id: uuid.UUID
    status: str
    discharged_at: datetime | None = None
    condition_at_discharge: str | None = None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=False)

    @field_validator("status")
    @classmethod
    def _validate_status(cls, v: str) -> str:
        return _validate_enum(v, PATIENT_STATUS, "status")


# ── PatientPatch ──────────────────────────────────────────────────────────────

class PatientPatch(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=False)

    bed_number: str | None = Field(default=None, min_length=1, max_length=20)
    name: str | None = Field(default=None, min_length=1, max_length=100)
    age: int | None = Field(default=None, ge=0, le=150)
    sex: str | None = None
    rank_title: str | None = None
    date_of_admission: date | None = None
    provisional_diagnosis: str | None = Field(default=None, min_length=1, max_length=500)
    active_problems: list[str] | None = None
    current_medications: list[MedicationSchema] | None = None
    allergies: list[str] | None = None
    acuity: str | None = None
    ward: str | None = None
    assigned_ho: uuid.UUID | None = None

    @field_validator("name", "bed_number", "provisional_diagnosis", mode="before")
    @classmethod
    def _trim_targeted_fields(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("sex")
    @classmethod
    def _validate_sex(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return _validate_enum(v, PATIENT_SEX, "sex")

    @field_validator("acuity")
    @classmethod
    def _validate_acuity(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return _validate_enum(v, PATIENT_ACUITY, "acuity")

    @field_validator("ward")
    @classmethod
    def _validate_ward(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return _validate_enum(v, PATIENT_WARD, "ward")


# ── PatientSummary ────────────────────────────────────────────────────────────

class PatientSummary(BaseModel):
    total: int = Field(ge=0)
    critical: int = Field(ge=0)
    urgent: int = Field(ge=0)
    stable: int = Field(ge=0)
    discharge_ready: int = Field(ge=0)


# ── PatientListResponse ───────────────────────────────────────────────────────

class PatientListResponse(BaseModel):
    patients: list[PatientRead]
    summary: PatientSummary
    page: int = Field(ge=1)
    limit: int = Field(ge=1, le=100)
    total_pages: int = Field(ge=0)


# ── PatientDetailResponse ─────────────────────────────────────────────────────

class PatientDetailResponse(PatientRead):
    vitals: list[Any] = Field(default_factory=list)
    labs: list[Any] = Field(default_factory=list)


# ── DischargeRequest / DischargeResponse ─────────────────────────────────────

class DischargeRequest(BaseModel):
    condition_at_discharge: str = Field(min_length=1)


class DischargeResponse(BaseModel):
    status: str = "discharged"
    discharged_at: datetime
