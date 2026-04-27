"""Shared pagination dependency (T082)."""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Query


@dataclass
class PaginationParams:
    page: int = Query(1, ge=1)
    limit: int = Query(20, ge=1, le=100)
