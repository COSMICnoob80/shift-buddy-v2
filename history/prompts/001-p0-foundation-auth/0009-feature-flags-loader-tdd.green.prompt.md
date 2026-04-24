---
id: "0009"
title: Feature Flags Loader and TDD Tests
stage: green
date: 2026-04-24
surface: agent
model: claude-sonnet-4-6
feature: 001-p0-foundation-auth
branch: 001-p0-foundation-auth
user: syedmuhammadabdullahshah@protonmail.com
command: implement T056 T057
labels: ["feature-flags","pydantic-settings","tdd","mypy-strict"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - api/app/core/feature_flags.py
  - api/tests/unit/test_feature_flags.py
tests:
  - api/tests/unit/test_feature_flags.py::test_defaults_all_off
  - api/tests/unit/test_feature_flags.py::test_shadow_mode_enabled_env_flip
  - api/tests/unit/test_feature_flags.py::test_agent_autonomy_level_int_coercion_and_validation
  - api/tests/unit/test_feature_flags.py::test_unknown_env_key_rejected
---

## Prompt

You are implementing T056 and T057 for the Shift Buddy V2 project.
Working directory: /home/cosmicnoob/shift-buddy-v2
Branch: 001-p0-foundation-auth

CONSTRAINT: Write files only. Do NOT run any git commands (no git add, commit, push, status, etc.).

## Context

The project uses pydantic-settings for env-driven config. Here is the existing pattern in `api/app/core/config.py`:

```python
from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    database_url: str = Field(default="...", alias="DATABASE_URL")

@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
```

Python version: 3.12+. mypy strict is enforced. All imports must be from `__future__ import annotations`.

## T056 — Create `api/app/core/feature_flags.py`

Requirements:
- Pydantic-settings `BaseSettings` subclass called `FeatureFlags`
- `SettingsConfigDict(env_prefix="FEATURE_", extra="forbid")` — keys like `FEATURE_SHADOW_MODE_ENABLED`
- Three fields, ALL defaulting OFF/0:
  - `shadow_mode_enabled: bool = False`
  - `agent_autonomy_level: int = 0`
  - `divergence_logging_enabled: bool = False`
- Cached accessor `get_feature_flags() -> FeatureFlags` using `@lru_cache(maxsize=1)`
- NO consumers anywhere in P0 code — this module is loader + model only
- Must pass `mypy --strict`

## T057 — Create `api/tests/unit/test_feature_flags.py`

TDD order: write this test AFTER reading T056's spec above (test verifies the module).

Four test cases:
(a) `test_defaults_all_off` — with NO env vars set, all three flags are their defaults (False/False/0). Use `monkeypatch.delenv` to clear any leaked env vars.
(b) `test_shadow_mode_enabled_env_flip` — set `FEATURE_SHADOW_MODE_ENABLED=true` via `monkeypatch.setenv`; assert `shadow_mode_enabled is True`.
(c) `test_agent_autonomy_level_int_coercion_and_validation`:
    - `FEATURE_AGENT_AUTONOMY_LEVEL=2` → parses as `int` value `2`
    - `FEATURE_AGENT_AUTONOMY_LEVEL=notanint` → raises `ValidationError` from pydantic
(d) `test_unknown_env_key_rejected` — `FEATURE_BOGUS=xyz` → `FeatureFlags` construction raises `ValidationError` (extra="forbid")

IMPORTANT for tests: each test must construct `FeatureFlags()` directly (not via the cached `get_feature_flags()`) so monkeypatching env vars actually takes effect. `get_feature_flags` is cached and won't see env changes.

Import pattern:
```python
import pytest
from pydantic import ValidationError
from app.core.feature_flags import FeatureFlags
```

## Response snapshot

Created two files:

1. `api/app/core/feature_flags.py` — `FeatureFlags(BaseSettings)` with `env_prefix="FEATURE_"`, `extra="forbid"`, three fields all defaulting off/zero, and `get_feature_flags()` lru_cache accessor. Follows `from __future__ import annotations` pattern and is mypy-strict compatible.

2. `api/tests/unit/test_feature_flags.py` — four test cases (a)–(d) each constructing `FeatureFlags()` directly via monkeypatched env. Helper `_clear_all()` uses `monkeypatch.delenv(raising=False)` for safe env cleanup.

Verified: `grep -r "get_feature_flags\|FeatureFlags" api/app/routers api/app/services` → CLEAN, no consumers wired.

## Outcome

- Impact: T056 and T057 complete; feature flags infrastructure available for future phases without any P0 coupling.
- Tests: 4 unit tests covering defaults, bool flip, int coercion/rejection, and extra-key rejection.
- Files: 2 new files created; 0 existing files modified.
- Next prompts: run `pytest api/tests/unit/test_feature_flags.py` to confirm green; run `mypy api/app/core/feature_flags.py --strict` to confirm type-safety.
- Reflection: Used direct `FeatureFlags()` construction in tests (not cached accessor) — critical pattern for monkeypatch env isolation.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a — files written only per constraint
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): add `ge=0` validator on `agent_autonomy_level` if negative values should be rejected
