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

### Mobile app (Expo) + local API

1. Start API bound to all interfaces (required for emulators and LAN devices):

   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. Copy `mobile/.env.example` → `mobile/.env` and set `EXPO_PUBLIC_API_URL`:

   | Client | Typical base URL |
   |--------|------------------|
   | Android emulator | `http://10.0.2.2:8000` |
   | iOS simulator | `http://127.0.0.1:8000` |
   | Physical phone (same Wi‑Fi) | `http://<PC-LAN-IP>:8000` |

3. Restart Expo after changing env (`npx expo start`).

**Dev auth:** with `AUTH_MODE=dev`, the app sends `X-Dev-User-External-Id` and `X-Dev-Display-Name` (from the nickname profile) on mutating requests. Without those headers, reads still work but `userVote` is omitted until profile is set.

#### Windows + WSL2 (Ubuntu) notes

- Run Postgres + uvicorn **inside WSL**; use the WSL IP from Windows (`hostname -I` in Ubuntu) when testing from a **physical device** on the LAN, or use **mirrored networking** / port forwarding so `localhost:8000` on Windows reaches WSL.
- Bind uvicorn to `0.0.0.0`, not `127.0.0.1`, so the emulator bridge (`10.0.2.2`) and forwarded ports work.
- Optional: `netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=<WSL-IP>` (Admin PowerShell) then point the phone at the Windows PC IP.

**API mode limitations (still local-only in the app):** file evidence upload (R2/ClamAV), claim score history bulk export, and offline AsyncStorage app-data cache — see `mobile/README.md`.

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

## Phase 1 — file evidence (quarantine → ClamAV → clean)

### Local stack (MinIO + ClamAV)

From repo root:

```bash
docker compose up -d postgres minio minio-init clamav
cd backend && cp .env.example .env
# For presigned PUT from a phone/emulator, point S3 at MinIO:
# STORAGE_BACKEND=s3
# S3_ENDPOINT_URL=http://127.0.0.1:9000  (or host LAN IP on WSL2 — see below)
pip install -e ".[dev]"
alembic upgrade head && python scripts/seed_from_json.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or `docker compose --profile api up --build` (API + Postgres + MinIO + ClamAV).

**WSL2:** bind uvicorn to `0.0.0.0`. From Windows/Android emulator use `http://10.0.2.2:8000` for API and ensure MinIO port `9000` is reachable (mirrored networking or `netsh portproxy` from Windows → WSL IP for physical devices uploading via presigned URLs).

### Production Cloudflare R2 (later)

Create **two** buckets (`factfulness-quarantine`, `factfulness-evidence`), R2 API token with Object Read & Write, set `STORAGE_BACKEND=s3` and `S3_ENDPOINT_URL=https://<account_id>.r2.cloudflarestorage.com`. Enable CORS on the quarantine bucket for mobile presigned PUT origins.

### API flow

1. `POST /v1/claims/{id}/evidence/file/upload-url` → presigned PUT to quarantine  
2. Client PUT file  
3. `POST .../file/complete` → background ClamAV scan  
4. `GET /v1/evidence/{id}/file/scan-status` — poll until `clean` / `infected`  
5. `GET /v1/evidence/{id}/download-url` — presigned GET from clean bucket only  

Tests use `STORAGE_BACKEND=memory` and `SCANNER_BACKEND=fake` (default in code).

## Out of scope for Phase 0

R2 uploads, ClamAV, and staging deploy remain Phase 1+ per `BACKEND.md` §12. Mobile can use `EXPO_PUBLIC_API_URL` to talk to this API (see above).
