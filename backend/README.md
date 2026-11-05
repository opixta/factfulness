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

## Auth

| `AUTH_MODE` | Behavior |
|-------------|----------|
| `dev` (default) | No JWT. Optional `X-Dev-User-External-Id` + `X-Dev-Display-Name` on requests; if omitted, mutating routes still use the configured dev fallback user. |
| `supabase` | Requires `Authorization: Bearer <Supabase access JWT>`. Validates `iss`, `aud`, `exp`; upserts `users` row on first sight of JWT `sub`. |

Public reads (`GET /v1/topics`, claims, bootstrap) work without auth in both modes. Unauthenticated mutating requests in `supabase` mode return **401** with `detail` `AUTH_REQUIRED` or `AUTH_INVALID` and `WWW-Authenticate: Bearer`.

JWT verification supports:

- **Asymmetric signing keys (recommended):** set `SUPABASE_URL`; JWKS is fetched from `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` (cached ~10 minutes).
- **Legacy HS256:** set `SUPABASE_JWT_SECRET` to the project JWT secret (Dashboard → Project Settings → API → JWT Settings). Can be used together with JWKS for older tokens.

Expected claims: `iss` = `{SUPABASE_URL}/auth/v1`, `aud` = `authenticated`.

### Create your Supabase project (authentication only)

Factfulness keeps **FastAPI + Postgres + R2** for data; Supabase is used **only for sign-in**. You can develop without a Supabase project (`AUTH_MODE=dev`, no Supabase env vars).

When you are ready:

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) → **New project** → pick org, name, database password, region → **Create**.
2. **Project Settings** (gear) → **API**:
   - Copy **Project URL** → `SUPABASE_URL` in `backend/.env` and `EXPO_PUBLIC_SUPABASE_URL` in `mobile/.env`.
   - Copy **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `mobile/.env` (never put the service role key in the app).
3. **Authentication** → **Providers** → enable **Email** (enabled by default). For Expo Go, **email OTP (6-digit code)** works without custom redirect URLs.
4. **Authentication** → **Email Templates** → **Magic Link** (used for OTP emails): ensure the template includes `{{ .Token }}` so users receive a numeric code. Supabase docs call this “Email OTP”.
5. Optional **password** sign-in: **Authentication** → **Providers** → Email → allow sign-ups / confirm email per your policy.
6. **JWT signing keys:** newer projects use asymmetric keys automatically (backend uses JWKS). If your project still shows a **JWT secret** under API → JWT Settings, you may set `SUPABASE_JWT_SECRET` for HS256 tokens during migration.
7. Backend: set `AUTH_MODE=supabase`, restart uvicorn. Mobile: set both `EXPO_PUBLIC_SUPABASE_*` vars, restart Expo (`npx expo start -c`).
8. After first login, the app prompts for a **nickname** and calls `PATCH /v1/users/me`. The server sets `nickname_confirmed_at`; `GET /v1/users/me` and bootstrap `me` expose `nicknameConfirmed: true` after that (used to skip onboarding on reinstall / new devices).

**Redirect URLs:** not required for email OTP in Expo Go. If you later add magic links or OAuth, add your app’s deep link under **Authentication** → **URL Configuration**.

### Nickname confirmation (server)

- New users (JWT upsert or dev headers) start with `nicknameConfirmed: false` until `PATCH /v1/users/me` with a display name.
- Bootstrap includes `me` when the request is authenticated (dev headers or Bearer).

### Verdict push (Expo)

When a claim’s `fact_status` changes after recompute, the API notifies **participants** (vote, evidence, comment, trust) who have `notify_verdict_change` enabled and a stored Expo push token.

- Register token: `POST /v1/users/me/push-token` (mobile does this when the settings toggle is on).
- Clear tokens: `DELETE /v1/users/me/push-token` when notifications are disabled.
- Env: `PUSH_SENDER=fake` (default, tests/CI) or `PUSH_SENDER=expo` to call `https://exp.host/--/api/v2/push/send`.
- Invalid tokens (`DeviceNotRegistered`) are removed from `push_tokens`.

**Local testing:** run API with `PUSH_SENDER=expo`, use Expo Go on a **physical device**, enable **판정 변경 알림**, vote on a claim, then trigger a verdict change (add evidence until scoring flips). Simulators do not receive remote pushes reliably.

**Production builds (later):** configure FCM/APNs credentials in EAS; Expo Go uses Expo’s shared project — not for store builds.

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

**Dev auth (no Supabase):** with `AUTH_MODE=dev`, leave Supabase env vars empty on mobile. After nickname onboarding, the app sends `X-Dev-User-External-Id` and `X-Dev-Display-Name` on API writes. Browsing works without a profile; votes and comments require a nickname (and thus dev headers).

**Supabase auth:** when `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set, the app uses Supabase session tokens (`Authorization: Bearer …`) and prompts for login before writes. Sign out from **Settings**.

See **Create your Supabase project** in [`../backend/README.md`](../backend/README.md#auth) for dashboard steps and which keys go where.

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
