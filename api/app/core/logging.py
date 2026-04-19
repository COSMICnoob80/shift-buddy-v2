"""Structured logging with PHI redaction (Principle IV — commit #1).

Every log event passes through :class:`RedactingProcessor` before serialization.
Any key in :data:`SENSITIVE_KEYS` — top-level, nested-dict, or list-of-dicts — is
replaced with the literal string ``"[REDACTED]"``. PHI MUST NEVER appear in logs.
"""

from __future__ import annotations

import logging
from typing import Any

import structlog
from structlog.types import EventDict, Processor, WrappedLogger

REDACTED: str = "[REDACTED]"

SENSITIVE_KEYS: frozenset[str] = frozenset(
    {
        "name",
        "email",
        "pmdc",
        "pmdc_number",
        "mrn",
        "dob",
        "phone",
        "password",
        "token",
        "authorization",
    }
)


class RedactingProcessor:
    """structlog processor that walks the event dict and redacts PHI keys."""

    def __init__(self, sensitive_keys: frozenset[str] = SENSITIVE_KEYS) -> None:
        self._sensitive = sensitive_keys

    def __call__(
        self, logger: WrappedLogger | None, method_name: str, event_dict: EventDict
    ) -> EventDict:
        return self._redact_mapping(dict(event_dict))

    def _redact_mapping(self, mapping: dict[str, Any]) -> dict[str, Any]:
        out: dict[str, Any] = {}
        for key, value in mapping.items():
            if key in self._sensitive:
                out[key] = REDACTED
            else:
                out[key] = self._redact_value(value)
        return out

    def _redact_value(self, value: Any) -> Any:
        if isinstance(value, dict):
            return self._redact_mapping(value)
        if isinstance(value, list):
            return [self._redact_value(item) for item in value]
        if isinstance(value, tuple):
            return tuple(self._redact_value(item) for item in value)
        return value


def configure_logging(level: str = "INFO") -> None:
    """Configure structlog to emit redacted JSON events."""
    logging.basicConfig(format="%(message)s", level=level)
    processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        RedactingProcessor(),
        structlog.processors.JSONRenderer(),
    ]
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(logging.getLevelName(level)),
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
