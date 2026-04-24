"""slowapi limiter (NFR-002: /auth/login = 5/min/IP)."""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=[])
LOGIN_RATE = "5/minute"
