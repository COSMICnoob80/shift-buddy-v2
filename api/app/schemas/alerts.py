"""Alert Pydantic v2 schemas (P1b).

AlertCreate is an internal DTO for building Alert ORM rows — not exposed via API.
AlertRead maps 1:1 to the alerts ORM model.
AlertListResponse wraps paginated alerts.
AcknowledgeResponse is returned by POST /alerts/{id}/acknowledge.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


@dataclass
class AlertCreate:
    """Internal DTO passed from pure evaluators to the transaction coordinator."""

    patient_id: uuid.UUID
    alert_type: Literal["critical", "warning"]
    trigger_source: Literal["vital", "lab", "protocol"]
    trigger_parameter: str
    trigger_value: float
    message: str
    protocol_link: str | None = field(default=None)


class AlertRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    alert_type: Literal["critical", "warning"]
    trigger_source: Literal["vital", "lab", "protocol"]
    trigger_parameter: str
    trigger_value: float
    message: str
    protocol_link: str | None = None
    acknowledged: bool
    acknowledged_by: uuid.UUID | None = None
    acknowledged_at: datetime | None = None
    created_at: datetime


class AlertListResponse(BaseModel):
    alerts: list[AlertRead]
    page: int = Field(ge=1)
    limit: int = Field(ge=1, le=100)
    total_pages: int = Field(ge=0)


class AcknowledgeResponse(BaseModel):
    acknowledged: bool
    acknowledged_by: uuid.UUID
    acknowledged_at: datetime
