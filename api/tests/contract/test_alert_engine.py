"""T102 RED (schema import guard) — Alert engine contract tests (T108 added later).

Asserts that AlertRead, AlertListResponse, AcknowledgeResponse are importable
from app.schemas.alerts. Fails until T103 creates those schemas.
"""

from __future__ import annotations

import pytest


def test_alert_schemas_importable() -> None:
    from app.schemas.alerts import AcknowledgeResponse, AlertListResponse, AlertRead  # noqa: F401

    assert AlertRead is not None
    assert AlertListResponse is not None
    assert AcknowledgeResponse is not None
