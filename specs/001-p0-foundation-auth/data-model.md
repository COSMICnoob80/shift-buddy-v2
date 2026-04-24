# Data Model: Phase 0 — Foundation & Auth Floor

**Date**: 2026-04-19
**Scope**: One entity — `User`. Patient, vital, lab, alert, protocol entities are BLOCKED until the P1 gate (Principle III).

## Entity: `User`

SQLAlchemy 2.0 async ORM (`Mapped[...]` / `mapped_column`); Pydantic v2 DTOs live in `api/app/schemas/auth.py` and are distinct from the ORM model.

### Fields

| Field | DB Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | `UUID` | No | `uuid4()` (app-side) | PK, immutable | Used as JWT `sub` (FR-004). Never exposed where an int would suffice. |
| `name` | `VARCHAR(100)` | No | — | length 1–100 after trim | PHI — redacted from logs (FR-008). |
| `email` | `VARCHAR(254)` | No | — | lowercased at write; unique via `LOWER(email)` functional index | PHI — redacted. RFC 5322 validated at schema layer. |
| `password_hash` | `VARCHAR(60)` | No | — | bcrypt cost 12 (passlib) | Never returned by any API. |
| `pmdc_number` | `VARCHAR(10)` | No | — | matches `^\d{4,6}-[A-Z]$`; `UNIQUE` | PHI — redacted. |
| `hospital_code` | `VARCHAR(20)` | No | — | length 1–20 | e.g., `"FSL"`. |
| `department` | `VARCHAR(100)` | No | — | length 1–100 | e.g., `"General Surgery"`. |
| `role` | `ENUM('ho','senior_resident','consultant')` | No | `'ho'` | Postgres enum `user_role` | P0 always writes `'ho'`. |
| `failed_login_count` | `INTEGER` | No | `0` | `>= 0` | Incremented on bad password; reset on success. |
| `locked_until` | `TIMESTAMPTZ` | Yes | `NULL` | UTC | Set when `failed_login_count` hits 5 (= now + 15 min). |
| `created_at` | `TIMESTAMPTZ` | No | `now()` UTC | immutable | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` UTC | refreshed on mutation (app-side) | |

### Indexes

- `users_pkey` — PRIMARY KEY (`id`).
- `ix_users_email_lower` — `UNIQUE INDEX ON users (LOWER(email))` — enforces case-insensitive uniqueness and supports login lookup.
- `ux_users_pmdc_number` — `UNIQUE INDEX ON users (pmdc_number)`.

### Relationships

None in P0. (Patient / vital / lab / admission entities are Phase-1 scope.)

### State transitions (lockout)

```text
        +-------------------+    fail++    +--------------------+
        | failed_login=0    |  ---------->  | failed_login=1..4 |
        | locked_until=NULL |                | locked_until=NULL |
        +-------------------+                +--------------------+
                  ^                                    |
          success |                                    | 5th fail
          resets  |                                    v
                  |                          +----------------------+
                  |                          | failed_login=5       |
                  +--------------------------| locked_until=now+15m |
                       successful auth       +----------------------+
                       after lockout expires           |
                                                       | 15m elapsed,
                                                       v next login
                                              (treated as fresh; on
                                               correct pwd → reset)
```

- On any failed login: `failed_login_count += 1`; if it reaches 5, `locked_until = now_utc() + 15 min`.
- On any login attempt where `locked_until > now_utc()`: return `401 account_locked` regardless of credential correctness (Story 2 AC3).
- On successful login when `locked_until <= now_utc()` (or NULL): reset `failed_login_count = 0`, `locked_until = NULL`.

### Validation rules (enforced at Pydantic schema layer, re-enforced in service)

- `name`: trim whitespace; reject empty → `400 invalid_name`.
- `email`: RFC 5322; lowercased before persistence / lookup; casing-only variants MUST collide (edge case in spec).
- `password`: ≥12 chars, 3-of-4 classes (lower/upper/digit/symbol); top-10k breach match → `400 breached_password`; else `400 weak_password`.
- `pmdc_number`: regex `^\d{4,6}-[A-Z]$`; else `400 invalid_pmdc`.
- `hospital_code`: 1–20 chars; else `400 invalid_hospital_code`.
- `department`: 1–100 chars; else `400 invalid_department`.
- Duplicate `email` (case-insensitive) OR `pmdc_number` → `409 already_registered` (message MUST NOT disclose which field collided — FR-002 / Story 1 AC5).

### Migration strategy (Alembic, hand-written — Principle II)

- **Filename**: `alembic/versions/0001_users.py` (revision id `0001_users`, `down_revision = None`).
- **Upgrade** creates the `user_role` Postgres enum, the `users` table with all columns above, then both indexes (`ix_users_email_lower` via `op.execute("CREATE UNIQUE INDEX ...")`, `ux_users_pmdc_number` via `op.create_index`).
- **Downgrade** drops the indexes, drops the table, drops the enum — reversible.
- **Idempotency**: `alembic upgrade head` on an already-migrated DB is a no-op; migration is not re-run. CI asserts `alembic upgrade head && alembic downgrade base && alembic upgrade head` succeeds (migration round-trip smoke test).
- **No `--autogenerate`** in P0 — every DDL statement is reviewed.

## DTO boundary (Pydantic v2)

Names only — full shapes live in contracts/openapi.yaml:

- `RegisterRequest`, `LoginRequest`, `TokenResponse`, `UserPublic`, `ErrorEnvelope`.
- `UserPublic` MUST NOT include `password_hash`, `failed_login_count`, or `locked_until`.

## Time

All timestamps are `TIMESTAMPTZ` stored in UTC (NFR-004). Frontend performs PKT display conversion only.
