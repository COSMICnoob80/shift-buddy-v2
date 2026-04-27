"""T067 RED — LabCreate Pydantic v2 schema validators.

Exercises: is_critical field rejection from client, test_name min-length,
recorded_at required.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest


def _past() -> datetime:
    return datetime.now(UTC) - timedelta(minutes=5)


def test_is_critical_from_client_rejected() -> None:
    from pydantic import ValidationError

    from app.schemas.labs import LabCreate

    with pytest.raises(ValidationError, match="field_not_allowed"):
        LabCreate(
            test_name="K+",
            value=6.2,
            unit="mEq/L",
            recorded_at=_past(),
            is_critical=True,
        )


def test_test_name_min_length_enforced() -> None:
    from pydantic import ValidationError

    from app.schemas.labs import LabCreate

    with pytest.raises(ValidationError):
        LabCreate(
            test_name="",
            value=6.2,
            unit="mEq/L",
            recorded_at=_past(),
        )


def test_recorded_at_missing_raises() -> None:
    from pydantic import ValidationError

    from app.schemas.labs import LabCreate

    with pytest.raises(ValidationError):
        LabCreate(
            test_name="K+",
            value=6.2,
            unit="mEq/L",
        )


def test_valid_lab_create_accepted() -> None:
    from app.schemas.labs import LabCreate

    lab = LabCreate(
        test_name="K+",
        value=6.2,
        unit="mEq/L",
        reference_low=3.5,
        reference_high=5.0,
        recorded_at=_past(),
    )
    assert lab.test_name == "K+"
    assert lab.value == 6.2
