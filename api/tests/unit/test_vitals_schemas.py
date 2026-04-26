"""T067 RED — VitalsCreate Pydantic v2 schema validators.

Exercises: future recorded_at rejection, all-null measurement rejection,
partial valid set, temperature range bounds.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest


def _now_utc() -> datetime:
    return datetime.now(UTC)


def test_future_recorded_at_rejected() -> None:
    from pydantic import ValidationError

    from app.schemas.vitals import VitalsCreate

    future = _now_utc() + timedelta(minutes=1)
    with pytest.raises(ValidationError, match="recorded_at"):
        VitalsCreate(heart_rate=88, recorded_at=future)


def test_all_null_measurement_fields_rejected() -> None:
    from pydantic import ValidationError

    from app.schemas.vitals import VitalsCreate

    with pytest.raises(ValidationError, match="At least one measurement field required"):
        VitalsCreate(recorded_at=_now_utc() - timedelta(minutes=1))


def test_partial_valid_set_accepted() -> None:
    from app.schemas.vitals import VitalsCreate

    v = VitalsCreate(
        heart_rate=88,
        spo2=97,
        recorded_at=_now_utc() - timedelta(minutes=1),
    )
    assert v.heart_rate == 88
    assert v.spo2 == 97
    assert v.systolic_bp is None


def test_temperature_below_range_rejected() -> None:
    from pydantic import ValidationError

    from app.schemas.vitals import VitalsCreate

    with pytest.raises(ValidationError):
        VitalsCreate(
            temperature=29.9,
            recorded_at=_now_utc() - timedelta(minutes=1),
        )


def test_temperature_above_range_rejected() -> None:
    from pydantic import ValidationError

    from app.schemas.vitals import VitalsCreate

    with pytest.raises(ValidationError):
        VitalsCreate(
            temperature=45.1,
            recorded_at=_now_utc() - timedelta(minutes=1),
        )


def test_temperature_at_boundary_accepted() -> None:
    from app.schemas.vitals import VitalsCreate

    v = VitalsCreate(
        temperature=37.2,
        recorded_at=_now_utc() - timedelta(minutes=1),
    )
    assert v.temperature == 37.2
