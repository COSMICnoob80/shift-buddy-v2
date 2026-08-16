"""Shadow event service — writes protocol evaluation telemetry to shadow_events (P1b).

record_protocol_evaluation does NOT call db.commit() — the caller (router) owns
the transaction boundary per the plan.md contract.

Payload is explicitly de-identified: only {protocol, severity, actions_count}.
No patient_id, name, or raw clinical values (FR-017 / Principle IV).
"""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.shadow_event import ShadowEvent


async def record_protocol_evaluation(
    ho_user_id: uuid.UUID,
    protocol: str,
    severity: str,
    actions_count: int,
    db: AsyncSession,
) -> None:
    """Add a ShadowEvent row for a protocol evaluation.

    Does NOT commit — caller owns the transaction.
    Payload contains no PHI: only {protocol, severity, actions_count}.
    """
    event = ShadowEvent(
        event_type="protocol_evaluation",
        ho_user_id=ho_user_id,
        payload={
            "protocol": protocol,
            "severity": severity,
            "actions_count": actions_count,
        },
        divergence_score=None,
        shift_id=None,
    )
    db.add(event)
