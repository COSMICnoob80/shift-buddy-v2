"""Clinical protocol evaluators — deterministic offline-capable rules (P1b).

AKI staging (aki_staging.py) is async (requires DB baseline lookup).
Hyperkalemia and DKA are pure synchronous functions.
All protocols return ProtocolResult with mandatory source citations (Principle IX).
"""
