# Backend Phase 0 — local development

FastAPI API under `/v1`, Postgres 16, Alembic migrations, Python scoring port (`RULE_VERSION` `2026-11-04-v3`).

## Prerequisites

- Python 3.12+
- Postgres 16 (or use Docker Compose below)

## Quick start (Docker Compose)

From the repo root:

```bash
docker compose up -d postgres
cd backend
cp .env.example .env
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
python scripts/seed_from_json.py
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/docs for OpenAPI.

Optional API container (runs migrate + uvicorn):

```bash
docker compose --profile api up --build
```

## Auth (Phase 0)

| `AUTH_MODE` | Behavior |
|-------------|----------|
| `dev` (default) | Write endpoints auto-use a local dev user; no JWT required. |
| `supabase` | Requires `Authorization: Bearer <JWT>`; set `SUPABASE_JWT_SECRET` from the Supabase project JWT secret. |

Public reads (`GET /v1/topics`, claims) work without auth in both modes.

## Tests

Golden scoring (no DB):

```bash
cd backend && pytest tests/test_scoring_golden.py -q
```

API smoke tests (Postgres required):

```bash
docker compose up -d postgres   # or local Postgres matching DATABASE_URL
cd backend && pytest -q
```

Shared fixtures live in `fixtures/golden_evidence.json` and `fixtures/seed.json` (also used by mobile Vitest).

## Seed data

`fixtures/seed.json` mirrors `mobile/src/data/seed.ts` slug IDs (`t1`, `c1`, …). Regenerate with:

```bash
node scripts/export-seed-fixtures.mjs
```

Load into DB:

```bash
cd backend && python scripts/seed_from_json.py
```

## Out of scope for Phase 0

R2 uploads, ClamAV, staging deploy, and mobile `ApiRepository` wiring are Phase 1+ per `BACKEND.md` §12.
