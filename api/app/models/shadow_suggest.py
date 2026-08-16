"""ShadowSuggestResponse — Pydantic v2 schema for the shadow suggest endpoint (P1c T140)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class ShadowSuggestResponse(BaseModel):
    """Response schema for GET /api/v1/shadow/suggest.

    confidence is always "deterministic" in P1c — no generative model is wired.
    disclaimer MUST match verbatim per Principle XIII.
    """

    model_config = {"extra": "forbid"}

    suggestion: str
    confidence: Literal["deterministic"]
    source: Literal["protocol_engine"]
    disclaimer: Literal["SHADOW MODE — advisory only"]
    protocol: str | None = None
    severity: str | None = None
