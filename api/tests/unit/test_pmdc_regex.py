"""T021 RED — PMDC regex ^\\d{4,6}-[A-Z]$ (NFR-002)."""

from __future__ import annotations

import pytest

from app.services.password import validate_pmdc


@pytest.mark.parametrize("value", ["12345-S", "1234-A", "123456-Z"])
def test_pmdc_accepted(value: str) -> None:
    assert validate_pmdc(value) is True


@pytest.mark.parametrize(
    "value",
    ["12345", "123-AA", "12345-s", "1234567-A", "", "12345-1", "ABCDE-A", " 12345-A"],
)
def test_pmdc_rejected(value: str) -> None:
    assert validate_pmdc(value) is False
