# P1 Redactor Hardening (Post-MEP Launch)

Filed from CP1 redactor review. Non-blocking for P0.

## R-1: Case-insensitive key matching
Current: exact match on `SENSITIVE_KEYS`.
Risk: `{"Email": "..."}` bypasses redaction.
Fix: lowercase key before set lookup.
Test: add parametrized case with mixed-case keys.

## R-2: Value-pattern redaction
Current: redacts by key name only.
Risk: `{"msg": "user ho@example.com logged in"}` leaks.
Fix: regex pass on string values matching email, phone,
PMDC patterns.
Test: payload with PHI embedded in free-text value.

## R-3: Exception traceback redaction
Current: untested against structlog.processors.format_exc_info.
Risk: traceback strings may contain PHI from local vars.
Fix: ensure redactor runs AFTER format_exc_info, or add
dedicated traceback scrubber.
Test: raise exception with PHI in locals, assert log clean.
