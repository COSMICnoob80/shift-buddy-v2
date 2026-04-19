# Quickstart: Phase 0 — Foundation & Auth Floor

**Audience**: Any engineer joining the `001-p0-foundation-auth` branch.
**Prereqs**: Docker ≥ 24, Python 3.12+, Node 20+, `pnpm` 9+, `uv` (or `pip`), `git`.
**Principle XII**: everything below runs fully offline once images and deps are cached.

## 1. Clone and branch

```bash
git clone git@github.com:<org>/shift-buddy-v2.git
cd shift-buddy-v2
git checkout 001-p0-foundation-auth
```

## 2. Environment

```bash
cp .env.example .env
# Defaults are dev-safe; DO NOT commit .env. Required keys:
#   DATABASE_URL=postgresql+asyncpg://sb:sb@localhost:5432/shiftbuddy
#   REDIS_URL=redis://localhost:6379/0
#   JWT_SECRET=<generate: python -c "import secrets;print(secrets.token_urlsafe(48))">
#   JWT_ISSUER=shift-buddy
#   JWT_ACCESS_TTL_SECONDS=900
#   APP_VERSION=0.1.0
#   CLINICAL_* thresholds — see api/app/core/clinical_config.py (loader fails fast on missing/invalid)
```

## 3. Start infrastructure

```bash
docker compose up -d db redis
# Ollama is behind `profiles: ["inference"]` and MUST remain OFF in P0 (Principle V).
```

## 4. Install backend + run migrations

```bash
cd api
uv venv && source .venv/bin/activate          # or: python -m venv .venv && source .venv/bin/activate
uv pip install -e ".[dev]"                    # or: pip install -e ".[dev]"
alembic upgrade head                          # applies 0001_users
```

## 5. Run the API test suite (TDD order)

```bash
pytest -q
# Expected green set (see plan.md §TDD Order):
#   tests/unit/test_redactor.py
#   tests/unit/test_clinical_config.py
#   tests/unit/test_password_policy.py
#   tests/unit/test_pmdc_regex.py
#   tests/unit/test_jwt_claims.py
#   tests/contract/test_health.py
#   tests/contract/test_register.py
#   tests/contract/test_login.py
#   tests/integration/test_auth_middleware.py
#   tests/integration/test_router_allowlist.py
```

## 6. Run the API

```bash
uvicorn app.main:app --reload --port 8000
# Liveness check:
curl -s http://localhost:8000/api/v1/health    # → {"status":"alive","version":"0.1.0"}
```

## 7. Install and run the web shell

```bash
cd ../web
pnpm install
pnpm dev                                       # http://localhost:3000
```

Smoke-test the flow manually:

1. Visit `http://localhost:3000/register`, submit a valid HO profile → redirected to `/board`.
2. Log out (clear storage), visit `/board` → redirected to `/login`.
3. Open DevTools → Network; confirm **zero** requests to `fonts.googleapis.com` (SC-007).

## 8. Run web tests

```bash
pnpm lint
pnpm typecheck
pnpm test                                      # Playwright smoke
```

## 9. Lint + type gates (mirror CI)

```bash
# api/
ruff check . && ruff format --check . && mypy --strict app/ && pytest -q
# web/
pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter web test
# repo root
bash scripts/ci/check_router_allowlist.sh      # Principle III / NFR-009
```

## 10. Teardown

```bash
docker compose down       # keep volumes
docker compose down -v    # nuke volumes (wipes DB)
```

## Troubleshooting

- **`passlib` `AttributeError: module 'bcrypt' has no attribute '__about__'`** — ensure both `passlib==1.7.4` and `bcrypt==4.1.3` are installed (see research.md).
- **Migration `current revision` mismatch** — `alembic downgrade base && alembic upgrade head` on dev DBs; never on anything shared.
- **Playwright 403 from dev Next** — confirm `pnpm dev` is running before `pnpm test`.
- **Next.js middleware bypass warnings** — ensure `next>=14.2.21` is installed (CVE-2025-29927).
- **PostgreSQL URL errors** — the URL MUST start with `postgresql+asyncpg://`, not `postgresql://`.

## Next steps

- `/sp.tasks` — generate the dependency-ordered task list matching the 10-step TDD sequence in plan.md.
- Do NOT begin implementation until tasks.md is reviewed against the Constitution Check.
