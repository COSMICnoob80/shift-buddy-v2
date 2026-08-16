"""Locked error envelope schema (NFR-003)."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class ErrorEnvelope(BaseModel):
    model_config = ConfigDict(extra="forbid")
    error: str
    message: str
