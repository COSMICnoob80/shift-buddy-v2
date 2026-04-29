"""Protocols router stub (T097 P1b scope guard — routes added in T120)."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/protocols", tags=["protocols"])
