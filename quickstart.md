# Shift Buddy V2 — Quickstart

> **Estimated time to first login: < 60 seconds** (SC-001)

## Prerequisites

- Docker + Docker Compose v2
- Python 3.12+ with [uv](https://github.com/astral-sh/uv) installed
- Node.js 20 + [pnpm](https://pnpm.io/) v10+
- Git

## 1 — Clone and configure environment

```bash
git clone <repo-url> shift-buddy-v2
cd shift-buddy-v2
cp .env.example .env
# Edit .env: set JWT_SECRET to a strong random string (required).
```

## 2 — Start database + Redis

```bash
docker compose up -d db redis
# Wait for healthy status (≈ 5 s):
docker compose ps
```

## 3 — Run migrations

```bash
cd api
uv sync --all-extras
uv run alembic upgrade head
cd ..
```

Expected output: `INFO  [alembic.runtime.migration] Running upgrade  -> 0001_users`

## 4 — Run the API test suite

```bash
cd api
uv run pytest -q
cd ..
```

All tests must pass before starting the server.

## 5 — Start the API

```bash
cd api
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Verify: `curl http://localhost:8000/api/v1/health` → `{"status":"alive","version":"0.1.0"}`

## 6 — Start the web app

In a new terminal:

```bash
cd web
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000/register](http://localhost:3000/register).

## 7 — End-to-end smoke (optional)

```bash
cd web
pnpm exec playwright install chromium
pnpm test:e2e
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `connection refused` on alembic | DB not healthy yet | Wait for `docker compose ps` to show `healthy` |
| `JWT_SECRET` validation error | Empty/placeholder secret | Set a real value in `.env` |
| `pnpm install` fails | pnpm version mismatch | `npm i -g pnpm@10` |

## Tearing down

```bash
docker compose down          # stop containers, keep volumes
docker compose down -v       # stop containers AND delete data
```
