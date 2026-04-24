# Research: Phase 0 Locked-Stack Audit

**Date**: 2026-04-19
**Scope**: Confirm pinned versions, flag known CVEs / breaking changes in locked dependencies vs. training-era knowledge. Stack is LOCKED (see plan.md §Technical Context) — this document does not propose alternatives; it surfaces risks the implementer MUST account for.

## Decision summary (per locked item)

### Backend

#### FastAPI 0.115+
- **Decision**: Pin `fastapi>=0.115,<0.117` at project start; refresh at each phase gate.
- **Rationale**: 0.115 stabilized the Pydantic v2 integration and default `openapi_version=3.1`. Aligns with Pydantic v2 requirement (Principle VI).
- **Risk / note**: `app.exception_handler(RequestValidationError)` MUST be overridden to emit the `{error,message}` envelope; the default 422 `{detail:[...]}` body MUST NOT reach clients (NFR-003).

#### Pydantic v2 (`pydantic>=2.7`)
- **Decision**: Use v2 exclusively; `pydantic-settings>=2.2` for env config.
- **Rationale**: Constitution pin. `model_validate` / `model_dump` idioms; strict types by default.
- **Risk / note**: v1 `.dict()` / `.parse_obj()` patterns are removed; any snippet from training-era docs must be translated to v2.

#### SQLAlchemy 2.0 async + asyncpg
- **Decision**: `sqlalchemy>=2.0.30`, `asyncpg>=0.29`.
- **Rationale**: 2.0 async session API is stable; `Mapped[...]` / `mapped_column` are the canonical ORM surface.
- **Risk / note**: Do not mix 1.x `Query` API; use `select()` + `await session.execute()`. Connection URL must be `postgresql+asyncpg://` not `postgresql://`.

#### Alembic (hand-written migrations)
- **Decision**: `alembic>=1.13`. Migrations are hand-written — never `--autogenerate` in P0 (Principle II: every schema change is deliberate, reversible, tested).
- **Risk / note**: For async SQLAlchemy, `env.py` must use `async_engine_from_config` and `run_sync`.

#### PostgreSQL 16
- **Decision**: Official `postgres:16-alpine` image in compose.
- **Risk / note**: Case-insensitive email uniqueness → use `CREATE UNIQUE INDEX ... ON users (lower(email))` in the migration (a plain `UNIQUE` on a lowercased-at-write column also works, but the functional index is preferred and matches spec FR-005).

#### Redis 7
- **Decision**: `redis:7-alpine`; wired in compose, no P0 code touches it (Principle III).
- **Risk / note**: Kept for P1 session / rate-limit / graph state. Do NOT import `redis` client in P0 code.

#### passlib[bcrypt] — cost 12
- **Decision**: `passlib[bcrypt]==1.7.4`, **pin `bcrypt==4.1.3`** (or the latest 4.x).
- **Rationale**: passlib 1.7.4 + bcrypt ≥4.1 emits a startup warning / `AttributeError: module 'bcrypt' has no attribute '__about__'` unless both are aligned. Pinning both avoids surprise.
- **Security note**: bcrypt 4.x backend is maintained (pyca); passlib upstream is quiet but the bcrypt scheme itself has no outstanding CVE at the cost specified. Revisit at P1 if passlib remains unmaintained (candidate successor: `pwdlib`).

#### python-jose[cryptography] — JWT HS256
- **Decision**: `python-jose[cryptography]>=3.3`.
- **Security note**: Historical `python-jose` advisories include **CVE-2024-33664** (JWE "JSON bomb" DoS) and **CVE-2024-33663** (algorithm confusion on ECDH-ES). P0 uses **HS256 only** with a fixed `algorithms=["HS256"]` allowlist on `decode()` — both CVEs require JWE / EC keys and do not apply to our HS256 path, but the allowlist MUST be explicit.
- **Action**: If `python-jose` remains unpatched or unmaintained at P1, swap to `PyJWT>=2.9` (drop-in for HS256 issue/verify). Do not swap pre-emptively in P0.

#### slowapi
- **Decision**: `slowapi>=0.1.9` using the in-memory limiter for P0 (Redis backend wired at P1).
- **Risk / note**: In-memory limiter is per-process; for dev/CI that is fine. Document the P1 swap to `RedisLimiter` in the P1 plan.

#### structlog
- **Decision**: `structlog>=24.1`. JSON renderer to stdout; custom `RedactingProcessor` first in the processor chain (FR-008).
- **Risk / note**: Processor ordering matters — the redactor MUST run before any renderer that stringifies the event dict.

#### pytest + pytest-asyncio + httpx
- **Decision**: `pytest>=8`, `pytest-asyncio>=0.23` with `asyncio_mode = "auto"`, `httpx>=0.27` using `ASGITransport(app=...)` for in-process testing.
- **Risk / note**: `httpx.AsyncClient(app=...)` shorthand was deprecated in 0.27+; use `AsyncClient(transport=ASGITransport(app=app), base_url="http://test")`.

#### ruff + mypy --strict
- **Decision**: `ruff>=0.5`, `mypy>=1.10` with `--strict`. Line length 100 per AGENTS.md.

### Frontend

#### Next.js 14 App Router
- **Decision**: `next@14.2.x` (latest 14.x patch).
- **Security note**: **CVE-2024-34351** (SSRF via server actions) and **CVE-2025-29927** (middleware-auth bypass) were patched in 14.2.15 and later. **Pin `next>=14.2.21`** to clear both advisories.
- **Risk / note**: Do not rely on middleware alone for route protection; `/board` guard must also verify token server-side on the page (Story 3 AC2).

#### TypeScript strict
- **Decision**: `typescript>=5.4`, `strict: true`, `noUncheckedIndexedAccess: true`.

#### Inter self-hosted
- **Decision**: Ship `.woff2` files from `rsms.me/inter` (or Google Fonts export) into `web/public/fonts/`; use `next/font/local`. Prevents any `fonts.googleapis.com` request (SC-007, Principle XII).

#### Tailwind CSS
- **Decision**: `tailwindcss>=3.4`. Design tokens emitted as CSS custom properties in `globals.css` matching spec §5.

#### Playwright
- **Decision**: `@playwright/test>=1.45`. Smoke-only in P0: login→board round-trip, unauth redirect, network trace asserting no third-party font fetch.

### Infra

#### Docker Compose
- **Decision**: Services `api`, `db` (postgres:16-alpine), `redis` (redis:7-alpine). Optional `ollama` service behind `profiles: ["inference"]` — disabled by default (Principle V: no inference in P0).

#### GitHub Actions CI
- **Decision**: Single `ci.yml` on PR to `dev`. Matrix not needed in P0. Steps ordered per plan.md §CI Gates.

## Alternatives explicitly rejected

| Candidate | Why rejected |
|---|---|
| `PyJWT` instead of `python-jose` | Stack is locked; jose is sufficient for HS256 with algorithm allowlist. Swap is a P1 option if advisories emerge. |
| `argon2-cffi` instead of bcrypt | Constitution VIII pins bcrypt cost 12. Any change requires an amendment. |
| Redis-backed slowapi in P0 | Redis client usage is P1 scope; in-memory limiter meets NFR-002 for P0 scale. |
| `next/font/google` | Makes a build-time Google Fonts request; violates Principle XII offline-first posture and SC-007. |

## Open items

_None._ No NEEDS CLARIFICATION remain; spec and checklist are plan-ready.

## Action items flowing into tasks.md

- Pin `next>=14.2.21` in `web/package.json`.
- Pin `python-jose[cryptography]>=3.3` and restrict `jwt.decode(..., algorithms=["HS256"])`.
- Pin both `passlib==1.7.4` and `bcrypt==4.1.3` in `api/pyproject.toml`.
- Document the P1 follow-ups: Redis-backed rate limiter, passlib successor review, optional PyJWT swap.
