"""Protocol Pydantic v2 schemas (P1b).

Recommendation.source enforces min_length=1 per Principle IX (Agent Accountability).
ProtocolEvaluateRequest.values is a free dict; each protocol module validates
its own required fields and raises ValueError for missing/invalid inputs.
"""

from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, Field


class Recommendation(BaseModel):
    action: str
    priority: int = Field(ge=1)
    rationale: str
    source: str = Field(min_length=1)


class ProtocolEvaluateRequest(BaseModel):
    protocol: str  # validated in router; unknown value → 400 protocol_not_found
    patient_id: uuid.UUID
    values: dict[str, Any]


class ProtocolEvaluateResponse(BaseModel):
    protocol: str
    severity: str
    recommendations: list[Recommendation]
    escalation: str | None = None
    alert_generated: bool
