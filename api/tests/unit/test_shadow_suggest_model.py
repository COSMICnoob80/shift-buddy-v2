"""T140 RED — ShadowSuggestResponse Pydantic v2 model unit tests."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.models.shadow_suggest import ShadowSuggestResponse


def test_valid_shadow_suggest_response() -> None:
    r = ShadowSuggestResponse(
        suggestion="IV Calcium Gluconate — STAT",
        confidence="deterministic",
        source="protocol_engine",
        disclaimer="SHADOW MODE — advisory only",
        protocol="hyperkalemia",
        severity="severe",
    )
    assert r.suggestion == "IV Calcium Gluconate — STAT"
    assert r.confidence == "deterministic"
    assert r.source == "protocol_engine"
    assert r.disclaimer == "SHADOW MODE — advisory only"
    assert r.protocol == "hyperkalemia"
    assert r.severity == "severe"


def test_optional_fields_default_none() -> None:
    r = ShadowSuggestResponse(
        suggestion="No findings",
        confidence="deterministic",
        source="protocol_engine",
        disclaimer="SHADOW MODE — advisory only",
    )
    assert r.protocol is None
    assert r.severity is None


def test_wrong_confidence_rejected() -> None:
    with pytest.raises(ValidationError):
        ShadowSuggestResponse(
            suggestion="x",
            confidence="llm",  # type: ignore[arg-type]
            source="protocol_engine",
            disclaimer="SHADOW MODE — advisory only",
        )


def test_wrong_disclaimer_rejected() -> None:
    with pytest.raises(ValidationError):
        ShadowSuggestResponse(
            suggestion="x",
            confidence="deterministic",
            source="protocol_engine",
            disclaimer="wrong disclaimer",  # type: ignore[arg-type]
        )


def test_extra_fields_rejected() -> None:
    with pytest.raises(ValidationError):
        ShadowSuggestResponse(
            suggestion="x",
            confidence="deterministic",
            source="protocol_engine",
            disclaimer="SHADOW MODE — advisory only",
            unknown_field="value",  # type: ignore[call-arg]
        )
