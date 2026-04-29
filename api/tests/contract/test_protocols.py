"""T102 RED (schema import guard) — Protocol contract tests (T119 added later).

Asserts that ProtocolEvaluateRequest, ProtocolEvaluateResponse, Recommendation
are importable from app.schemas.protocols. Fails until T103 creates them.
"""

from __future__ import annotations


def test_protocol_schemas_importable() -> None:
    from app.schemas.protocols import (  # noqa: F401
        ProtocolEvaluateRequest,
        ProtocolEvaluateResponse,
        Recommendation,
    )

    assert ProtocolEvaluateRequest is not None
    assert ProtocolEvaluateResponse is not None
    assert Recommendation is not None
