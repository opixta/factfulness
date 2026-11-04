# Factfulness — Backend 구현 가이드

모바일 앱(`mobile/`)이 **로컬 저장소(`LocalFactfulnessRepository`)** 대신 **원격 API**를 사용할 수 있도록 필요한 백엔드 작업을 정리한 문서입니다.  
점수 규칙·**확정된** 제품 결정은 [`HANDOFF.md`](./HANDOFF.md) §3·§6을 따르고, 여기서는 **실제 앱 코드**(`data/types`, `repository/*`, `scoring/*`, 화면 흐름)에 맞춘 **구체적인 구현 체크리스트**를 다룹니다.

- **Repo**: `https://github.com/opixta/factfulness.git`
- **모바일 SSOT (점수 참조)**: `mobile/src/scoring/` (`RULE_VERSION`: `2026-11-04-decisions`)
- **시드 데이터**: `mobile/src/data/seed.ts`

---

## 1. 목표와 원칙

| 원칙 | 설명 |
|------|------|
| **서버가 판정자** | Fact/Lie·여론 집계는 클라이언트가 조작할 수 없어야 함. 앱은 `claim_scores`(또는 동등 DTO)만 표시. |
| **Repository 경계 유지** | `FactfulnessRepository`(`mobile/src/repository/types.ts`) 메서드 ↔ REST 1:1 매핑을 1차 목표로 한다. |
| **규칙 버전 보존** | `rule_version`을 `claim_scores`에 저장해 과거 확정을 재현 가능하게 한다. |
| **점진적 전환** | MVP는 동기 재계산 + 단순 REST. 오프라인·실시간은 후순위. |

**현재 앱에서 서버로 옮겨야 하는 것**

- `votesTrue` / `votesFalse` 집계 (`castVote` + 댓글 `linked_vote`는 **동일 1표 UPSERT** — `LocalRepository.addComment` → `castVote`)
- `evidence.trust` 집계 (`addTrust`)
- `eligibleTrue` / `eligibleFalse` — UI에 표시되는 값은 **서로 다른 출처 도메인 수** (C3)
- `factScore()` 결과 전부 (`status`, `factPct`, `wTrue`, `wFalse`, `eligible*`, `reasons`, `gatePassed`, `ruleVersion`)
- `Claim.userVote` — 로그인 유저의 `votes` row 반환

**현재 앱에서 클라이언트에 남아도 되는 것 (초기)**

- 상대 시간 UI (`updatedAt`: `"2시간 전"`, `"방금"`) — 서버는 `timestamptz` 저장, 앱에서 포맷
- 적격 배지 미리보기 — 서버가 `eligible` 플래그를 내려주면 클라이언트 계산 제거 가능

---

## 2. 권장 스택 및 프로젝트 레이아웃

### 2.1 스택 (HANDOFF 권장과 동일, MVP 기준)

| 층 | 추천 | 작업 항목 |
|----|------|-----------|
| API | **FastAPI (Python 3.12+)** | OpenAPI 스키마, Pydantic v2, `uvicorn` |
| DB | **PostgreSQL 16+** | JSONB(`gate_reasons`), UUID PK |
| 마이그레이션 | **Alembic** | `backend/alembic/` |
| Auth | **Supabase Auth** (확정) | JWT(`Authorization: Bearer`), `users.supabase_sub` 매핑 — §6 |
| 객체 저장 (2단계) | **S3 / R2** | presigned upload |
| 배포 | Railway / Fly.io / Render + Managed Postgres | staging + production |

**확정 (HANDOFF §6 요약)**: 임계값 유지 · C3 도메인 distinct · 중립 제외 · 확정 후 재계산 · 즉시 공개+신고 숨김 · 읽기 public / 쓰기 로그인 · Supabase · 댓글 vote=1표.

### 2.2 레포 디렉터리 (제안)

```
backend/
  app/
    main.py                 # FastAPI app, CORS, lifespan
    config.py               # env: DATABASE_URL, JWT, SCORING_*
    deps.py                 # DB session, current_user
    models/                 # SQLAlchemy ORM
    schemas/                # Pydantic request/response (mobile DTO와 정렬)
    routers/
      topics.py
      claims.py
      evidence.py
      comments.py
      health.py
    services/
      topics.py             # proposeTopic, list, detail
      votes.py
      scoring.py            # recompute wrapper
    scoring/                # SSOT — mobile/src/scoring 미러
      config.py             # TRUST_MIN, FACT_THRESHOLD, RULE_VERSION
      eligibility.py
      domain.py             # source_domain, distinct counts, domain weight buckets
      types.py
  tests/
    test_scoring_golden.py  # c1/c2/c3 fixtures
    test_api_smoke.py
  alembic/
  scripts/
    seed_from_json.py       # mobile seed export
  pyproject.toml            # or requirements.txt
fixtures/
  seed.json                 # mobile/src/data/seed.ts에서 생성 (CI 공유)
```

**작업 항목**

- [ ] `backend/` 패키지 스캐폴딩 + `docker compose` (Postgres + API)
- [ ] `mobile/src/scoring/config.py` 상수와 **동일 값** 문서화 + CI에서 cross-check (선택: TS export → JSON → Python load)
- [ ] OpenAPI `/docs` — 모바일 `ApiRepository` 구현 시 타입 생성 참고

---

## 3. 데이터 모델: 앱 타입 ↔ DB 스키마

`mobile/src/data/types.ts`는 **UI/로컬 집계용** shape이다. 서버는 정규화 테이블 + **집계/스냅샷** 테이블을 둔다.

### 3.1 필드 매핑

| 앱 (`types.ts`) | DB | 비고 |
|-----------------|-----|------|
| `Topic.id` | `topics.id` UUID | 시드 `t1` 등은 migration seed에서 UUID 고정 또는 slug |
| `Topic.title`, `summary` | `topics.title`, `topics.summary` | |
| `Topic.tags[]` | `topics.tags` text[] 또는 `topic_tags` | 로컬 `"신규"` 태그 — 제안 시 기본값 정책 **미결정** |
| `Topic.participants` | 집계 또는 `topics.participant_count` | 로컬: `proposeClaim` 시 +1 — 서버 규칙 정의 필요 **미결정** |
| `Topic.updatedAt` | `topics.updated_at` timestamptz | API는 ISO8601, 앱에서 상대 시간 변환 |
| `Claim.id` | `claims.id` UUID | |
| `Claim.text`, `reason?` | `claims.text`, `claims.reason` | |
| `Claim.votesTrue/False` | `claim_scores` 또는 실시간 COUNT | **캐시 컬럼** 권장 (목록 N+1 방지) |
| `Claim.userVote?` | `votes` row for `(claim_id, user_id)` | GET claim 시 join |
| `Evidence.*` | `evidence` + `trust_count` 집계 | `trust`는 `COUNT(evidence_trust)` |
| `Comment.*` | `comments` | `author` → `users.display_name` |
| `Comment.vote` | `comments.linked_vote` nullable enum | `true`/`false`/null |
| (없음) | `claim_scores` | opinion_pct, fact_status, fact_pct, weights, gate_reasons, rule_version |

### 3.2 DDL 초안 (작업용)

```sql
-- users: auth provider subject와 매핑
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id   TEXT NOT NULL UNIQUE,  -- Clerk/Supabase sub
  display_name  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE topics (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  summary            TEXT NOT NULL,
  tags               TEXT[] NOT NULL DEFAULT '{}',
  created_by         UUID REFERENCES users(id),
  status             TEXT NOT NULL DEFAULT 'published',  -- 즉시 공개; hidden은 moderation
  hidden_at          TIMESTAMPTZ,
  participant_count  INT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE claims (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id    UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  reason      TEXT,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE votes (
  claim_id    UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value       BOOLEAN NOT NULL,  -- true/false
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (claim_id, user_id)
);

CREATE TABLE evidence (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id    UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  url         TEXT,              -- C1; file upload 시 file_key + url nullable 정책 미결정
  file_key    TEXT,              -- 2단계
  stance      TEXT NOT NULL CHECK (stance IN ('true','false','neutral')),
  summary     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE evidence_trust (
  evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (evidence_id, user_id)
);

CREATE TABLE comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id     UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id),
  body         TEXT NOT NULL,
  linked_vote  BOOLEAN,          -- NULL = 없음; true/false
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE content_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type  TEXT NOT NULL,  -- topic|claim|evidence|comment
  target_id    UUID NOT NULL,
  reporter_id  UUID NOT NULL REFERENCES users(id),
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ,
  action       TEXT              -- hide|dismiss — MVP: hide hook
);

CREATE TABLE claim_scores (
  claim_id         UUID PRIMARY KEY REFERENCES claims(id) ON DELETE CASCADE,
  opinion_pct      INT NOT NULL,           -- mobile opinionScore.pct
  votes_true       INT NOT NULL,
  votes_false      INT NOT NULL,
  fact_status      TEXT NOT NULL,          -- pending|fact|lie|split
  fact_pct         INT,                    -- nullable when pending
  w_true           INT NOT NULL DEFAULT 0,
  w_false          INT NOT NULL DEFAULT 0,
  eligible_true    INT NOT NULL DEFAULT 0,
  eligible_false   INT NOT NULL DEFAULT 0,
  gate_reasons     JSONB NOT NULL DEFAULT '[]',
  gate_passed      BOOLEAN NOT NULL DEFAULT false,
  rule_version     TEXT NOT NULL,
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**작업 항목**

- [ ] Alembic revision 위 스키마 반영
- [ ] 인덱스: `claims(topic_id)`, `evidence(claim_id)`, `comments(claim_id)`, `votes(claim_id)`
- [ ] `claim_scores`를 claim 생성 시 empty row로 insert할지, lazy compute할지 결정 (MVP: **쓰기 시 동기 recompute**)

### 3.3 로컬 동작과 서버에서 맞출 규칙

| 동작 | `LocalRepository` 동작 | 서버 구현 시 |
|------|-------------------------|--------------|
| `castVote` | 이전 표 취소 후 새 표 반영 | `votes` UPSERT; opinion 재집계 |
| `addComment` + `vote` | `castVote`와 동일 (1인 1표 UPSERT) | `comments` insert + `linked_vote` 있으면 `votes` UPSERT; opinion 재집계 |
| `addTrust` | 무제한 +1 (로컬) | **로그인 필수**; 유저당 evidence 1 trust (UNIQUE PK) |
| `proposeTopic` / `proposeClaim` | 즉시 목록 반영 | `status=published`로 insert; 신고 시 hide |
| 홈 settled 수 | 클라이언트 `factScore()` | topic list API에 claim별 `fact_status` 포함 |

---

## 4. REST API: Repository · 화면 ↔ 엔드포인트

Base URL 예: `https://api.factfulness.example/v1`  
**읽기**: `GET /topics`, `GET /topics/{id}`, `GET /claims/{id}` — **인증 불필요** (hidden 콘텐츠 제외).  
**쓰기** (투표·trust·제안·댓글·증거): `Authorization: Bearer <Supabase access JWT>` **필수**.

### 4.1 공통 DTO (응답)

모바일이 기대하는 nested shape에 가깝게 **TopicDetail**, **ClaimDetail** DTO를 정의한다.

```typescript
// 개념적 TypeScript — 실제는 Pydantic schemas
interface ClaimScoresDto {
  opinionPct: number;
  votesTrue: number;
  votesFalse: number;
  userVote?: "true" | "false";
  fact: {
    status: "pending" | "fact" | "lie" | "split";
    factPct: number | null;
    wTrue: number;
    wFalse: number;
    eligibleTrue: number;
    eligibleFalse: number;
    gatePassed: boolean;
    reasons: string[];
    ruleVersion: string;
  };
}

interface EvidenceDto {
  id: string;
  title: string;
  url: string;
  stance: "true" | "false" | "neutral";
  summary: string;
  trust: number;
  eligible: boolean;       // C1+C2+non-neutral; mobile isEvidenceEligible
  userHasTrusted?: boolean;
}

interface CommentDto {
  id: string;
  author: string;
  body: string;
  vote?: "" | "true" | "false";
  at: string;              // ISO8601 → 앱에서 포맷
}
```

### 4.2 Read API ↔ `FactfulnessRepository` getter

| Repository | 화면 | Method & Path | Response |
|------------|------|---------------|----------|
| `getTopics()` | `(tabs)/index` | `GET /topics` | `{ topics: TopicListItem[] }` — 각 item에 `claimCount`, `settledCount`, `tags`, `participants`, `updatedAt` |
| `getTopic(id)` | `topic/[id]` | `GET /topics/{topicId}` | `{ topic, claims: ClaimSummary[] }` — ClaimSummary = text + `scores` (ClaimScoresDto 축약) |
| `getClaims(topicId)` | ↑ (동일) | ↑ | topic detail에 포함 가능 |
| `findClaim` + evidence + comments | `claim/[id]` | `GET /claims/{claimId}` | `{ topicId, claim, scores, evidence[], comments[] }` |
| `getEvidence` | claim | ↑ | detail에 포함 |
| `getComments` | claim | ↑ | detail에 포함 |
| `getData()` | (로컬 전용 bulk) | **제공 안 함** 또는 `GET /bootstrap` (admin/dev only) | 프로덕션 앱은 granular GET + mutation 후 invalidate |

**TopicListItem 예시**

```json
{
  "id": "uuid",
  "title": "...",
  "summary": "...",
  "tags": ["에너지"],
  "participants": 128,
  "updatedAt": "2026-03-24T10:00:00Z",
  "claimCount": 3,
  "settledCount": 2
}
```

**작업 항목**

- [ ] 목록/상세에서 **클라이언트 factScore 호출 제거**할 수 있도록 scores 항상 포함
- [ ] 페이지네이션: `GET /topics?cursor=` (초기는 offset 허용)

### 4.3 Write API ↔ mutation · 화면

| Repository | 화면 | Method & Path | Request body | Response |
|------------|------|---------------|--------------|----------|
| `proposeTopic` | `new-topic` | `POST /topics` | `{ title, summary, firstClaimText }` | `{ topic, firstClaim }` → `router.replace(/topic/:id)` |
| `proposeClaim` | `new-claim/[topicId]` | `POST /topics/{topicId}/claims` | `{ text, reason? }` | `{ claim }` + topic `updatedAt` 갱신 |
| `castVote` | `claim/[id]` True/False | `PUT /claims/{claimId}/vote` | `{ value: "true" \| "false" }` | `{ scores: ClaimScoresDto }` |
| `addEvidence` | claim form | `POST /claims/{claimId}/evidence` | `{ title, url, stance, summary }` | `{ evidence: EvidenceDto, scores }` |
| `addTrust` | claim 추천 +1 | `POST /evidence/{evidenceId}/trust` | `{}` | `{ evidence: EvidenceDto, scores }` — 409 if already trusted |
| `addComment` | claim 댓글 | `POST /claims/{claimId}/comments` | `{ body, vote?: "" \| "true" \| "false" }` | `{ comment, scores }` — `vote` set 시 **동일** `PUT /vote` 처리 |

**Validation (서버)**

- `url`: http(s) scheme, max length, **선택** SSRF fetch 금지 (링크만 저장)
- `stance`: enum
- `text`/`body`: max length, 기본 profanity hook **미결정**

**작업 항목**

- [ ] 모든 write 후 `claim_scores` 동기 recompute (해당 claim)
- [ ] topic `updated_at` — evidence/trust/comment/vote 시 갱신 여부 **미결정** (UX: “활동 있음”)

### 4.4 점수 규칙 설명 화면

| 화면 | API 필요 |
|------|----------|
| `(tabs)/rules` | **없음** (정적 카피 + `GET /config/scoring` optional — 상수 노출용) |

Optional `GET /config/scoring`:

```json
{
  "trustMin": 3,
  "minEligibleSameDir": 2,
  "factThreshold": 0.65,
  "ruleVersion": "2026-11-04-decisions"
}
```

---

## 5. 서버 점수 엔진 (SSOT)

### 5.1 포팅 소스

| TS (`mobile/src/scoring/`) | Python (`backend/app/scoring/`) |
|----------------------------|----------------------------------|
| `config.py` | 동일 상수 + `RULE_VERSION` |
| `eligibility.ts` | `is_evidence_eligible`, `filter_eligible` |
| `opinion.ts` | `opinion_score(votes_true, votes_false)` |
| `domain.ts` | `source_domain`, `distinct_domain_count`, `aggregate_domain_weights` |
| `factScore.ts` | `fact_score(evidence: list[EvidenceInput])` |

**규칙 (확정)**:

- `neutral`: 적격·가중치 **제외** (`eligibility.ts`와 동일)
- **C3**: `eligibleTrue`/`eligibleFalse` DTO = 방향별 **distinct domain count**
- **가중치**: 같은 도메인 내 여러 증거의 `trust` **합산** 후 방향별 합 (`aggregate_domain_weights`)
- 상수: `TRUST_MIN=3`, `MIN_ELIGIBLE_SAME_DIR=2`, `FACT_THRESHOLD=0.65`

### 5.2 `rule_version` 및 재계산

**트리거 (MVP — 동기)**

| 이벤트 | recompute |
|--------|-----------|
| vote upsert | opinion + fact |
| comment + linked_vote | `votes` UPSERT + opinion (+ fact unchanged) |
| evidence create | fact |
| trust create | fact |
| evidence delete (미래) | fact |

**`recompute_claim(claim_id)` 알고리즘**

1. Load votes → `votes_true`, `votes_false` (**댓글 linked_vote는 votes row로만** 반영 — 별도 +1 없음)
2. Load evidence + trust counts (non-neutral only for fact)
3. `fact = fact_score(...)` → `claim_scores` upsert with `rule_version=RULE_VERSION`
4. Return DTO

**확정 후 새 증거/trust**: **항상 재계산** — `fact_status`는 `pending|fact|lie|split`로 **덮어쓰기** (판정 변경 가능). 스냅샷 history 테이블은 **미결정** (HANDOFF §7).

### 5.3 Golden tests (c1 / c2 / c3)

**작업 항목**

- [ ] `fixtures/seed.json`에서 evidence만 추출한 `c1`, `c2`, `c3` 배열 고정
- [ ] Python: `assert fact_score(c1) == lie`, `c2 == fact`, `c3 == pending`
- [ ] CI: `mobile npm test` + `pytest backend/tests/test_scoring_golden.py` 병렬
- [ ] (선택) TS/Python 상수 diff gate in CI

참조: `mobile/src/scoring/factScore.test.ts`

---

## 6. 인증 및 per-user 제약

### 6.1 필수 제약 (MVP)

| 제약 | DB | API 오류 |
|------|-----|----------|
| claim당 1 vote | `votes` PK `(claim_id, user_id)` | UPSERT only |
| evidence당 1 trust | `evidence_trust` PK | `409 Conflict` |
| write 시 로그인 | JWT middleware | `401` |

### 6.2 Supabase Auth — 모바일

**작업 항목 (앱)**

- [ ] `@supabase/supabase-js` + `expo-secure-store` (session persist)
- [ ] 로그인 UI (magic link / OAuth — Supabase dashboard 설정 따름)
- [ ] `castVote`, `addTrust`, `addEvidence`, `addComment`(write), `proposeTopic`, `proposeClaim` 호출 전 session 확인; 없으면 로그인 유도
- [ ] `ApiFactfulnessRepository`: `Authorization: Bearer ${session.access_token}`

**작업 항목 (서버 — FastAPI)**

- [ ] Env: `SUPABASE_URL`, `SUPABASE_JWT_SECRET` (또는 JWKS: `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
- [ ] `python-jose` / PyJWT로 JWT 검증: `aud`=`authenticated`, `iss`=`{SUPABASE_URL}/auth/v1`, `sub` → `users.external_id`
- [ ] Dependency `get_current_user`: Bearer 필수 (write); `get_optional_user` (public GET)
- [ ] 첫 write 시 `users` row upsert (`display_name` from `user_metadata` — **미결정** 필드명)

```python
# 개념 스케치 — HS256 프로젝트 secret 사용 시
from jose import jwt

def verify_supabase_token(token: str, secret: str, project_url: str) -> dict:
    return jwt.decode(
        token,
        secret,
        algorithms=["HS256"],
        audience="authenticated",
        issuer=f"{project_url}/auth/v1",
    )
```

### 6.3 댓글·투표 (확정)

- [x] claim당 유저 **1표** — `POST /comments` with `vote` executes same UPSERT as `PUT /claims/{id}/vote`
- [x] 투표·trust **로그인 필수**; topic/claim **읽기 public**

---

## 7. 증거 URL · 파일 업로드

### 7.1 1단계 (현재 앱과 동일)

앱: `addEvidence({ title, url, stance, summary })` — URL 필수 UI.

**서버 작업**

- [ ] URL normalize (strip, scheme allowlist)
- [ ] C1: `url IS NOT NULL AND url != ''`
- [ ] C1: `url` required (1단계); `neutral` never eligible
- [ ] `source_domain(url)` — scoring과 동일 로직 Python 포팅

### 7.2 2단계 (파일)

**작업 항목**

- [ ] `POST /claims/{id}/evidence/upload-url` → presigned PUT
- [ ] evidence row with `file_key` + public CDN URL
- [ ] C1: `url OR file_key` — **미결정** (mobile `Evidence.url` 단일 필드 → `mediaUrl` 추가 가능)
- [ ] MIME/size limit, 바이러스 스캔 hook **미결정**

---

## 8. 시드 · 마이그레이션

**작업 항목**

- [ ] `mobile/src/data/seed.ts` → `fixtures/seed.json` export 스크립트 (`scripts/export-seed.ts`)
- [ ] `backend/scripts/seed_from_json.py`: idempotent insert (dev/staging)
- [ ] 시드 trust: JSON의 `trust: 14` → **`evidence_trust` 14 rows** 또는 **집계 컬럼 + synthetic users** — MVP는 **trust_count denormalized column + seed script**가 단순 (golden test는 evidence input list로 직접 주입)
- [ ] production seed: **하지 않음** (staging only)

**주의**: golden test c1/c2/c3는 **evidence trust 합**이 중요; DB 시드 시 trust row 수가 TS `trust` 필드와 일치해야 UI·서버 점수가 맞음.

---

## 9. 모바일: `LocalRepository` → `ApiRepository`

### 9.1 교체 지점

- `mobile/src/context/FactfulnessContext.tsx`: `LocalFactfulnessRepository.create()` → env 기반 factory
- 새 파일: `mobile/src/repository/ApiRepository.ts` implements `FactfulnessRepository`

### 9.2 `ApiRepository` 구현 체크리스트

| Method | HTTP | 캐시/상태 |
|--------|------|-----------|
| `getTopics` | GET /topics | React Query / SWR 권장 |
| `getTopic` + claims | GET /topics/:id | |
| `findClaim` | GET /claims/:id | topicId from response |
| `getEvidence/Comments` | detail 포함 | |
| mutations | POST/PUT | optimistic UI optional; **점수는 서버 응답으로 덮어쓰기** |
| `subscribe` | polling or event emitter | mutation 후 `refresh()`; WebSocket **후순위** |

### 9.3 오프라인 · 캐싱 (우선순위 낮음)

- [ ] Read-through cache (AsyncStorage) for topic list
- [ ] Mutation queue offline — **미결정** (복잡도 큼)
- [ ] Stale scores UI에 “연결 없음” 배지

### 9.4 환경 변수 (앱)

```
EXPO_PUBLIC_API_URL=https://...
EXPO_PUBLIC_AUTH_...=...
```

**작업 항목**

- [ ] `app.config.ts` extra fields
- [ ] EAS build profiles: dev / staging / production API URL

---

## 10. 배포 · 환경 · 설정

| Env | 용도 | Config |
|-----|------|--------|
| local | docker compose | `DATABASE_URL`, hot reload |
| staging | QA + seed | staging DB, test auth tenant |
| production | 실사용 | managed Postgres, secrets manager |

**서버 env (예)**

```
DATABASE_URL=
JWT_ISSUER=
JWT_AUDIENCE=
CORS_ORIGINS=https://...,exp://...
TRUST_MIN=3
MIN_ELIGIBLE_SAME_DIR=2
FACT_THRESHOLD=0.65
RULE_VERSION=2026-03-24-draft
RATE_LIMIT_PER_MIN=60
```

**작업 항목**

- [ ] Health: `GET /health`, DB ping
- [ ] Migrations on deploy (Alembic upgrade head)
- [ ] Structured logging (request id, user id)
- [ ] Error shape: `{ code, message, details? }` — 앱 i18n **후순위**

---

## 11. 보안 · 남용 · 모더레이션

| 위험 | 완화 (작업 항목) |
|------|------------------|
| trust/vote spam | Rate limit per IP + per user; CAPTCHA **미결정** |
| 악성 URL | scheme allowlist; optional domain blocklist |
| XSS in comments | escape on display; markdown **미결정** |
| mass topic/claim | throttle `POST /topics`; **신고 → hide** (`content_reports` + `hidden_at`) |
| score manipulation | 클라이언트 factScore **제거**, server-only |
| JWT theft | SecureStore, short TTL, refresh rotation |

**Moderation hooks (스키마 준비)**

- [ ] `topics.status`, `claims.status`, `evidence.hidden_at`
- [ ] Admin API **후순위** — `PATCH /admin/claims/:id/hide`

---

## 12. 단계별 로드맵 (우선순위)

### Phase 0 — 검증 가능한 코어 (최우선)

- [ ] Postgres schema + Alembic
- [ ] Python scoring + golden c1/c2/c3
- [ ] `GET /topics`, `GET /topics/:id`, `GET /claims/:id` (scores embedded)
- [ ] `POST` topic, claim, evidence, trust, vote, comment
- [ ] 동기 recompute + `rule_version`
- [ ] Staging deploy + mobile `ApiRepository` behind feature flag

### Phase 1 — 신뢰할 수 있는 커뮤니티 MVP

- [ ] Auth 벤더 연동 + 401 UX in app
- [ ] Rate limits
- [ ] Seed on staging; 제품 결정 반영 (댓글 vote, moderation)
- [ ] 클라이언트 `factScore` / home settled 계산 제거

### Phase 2 — 운영 · 확장

- [ ] File upload evidence
- [ ] Admin/moderation
- [ ] Link archive / preview (OpenGraph)
- [ ] Search, notifications
- [ ] (선택) score history table, websocket live scores

---

## 13. 확정된 제품 결정 (2026-11-04)

HANDOFF §6과 동일. 구현 시 이 기본값을 따른다.

- [x] `TRUST_MIN=3`, `MIN_ELIGIBLE_SAME_DIR=2`, `FACT_THRESHOLD=0.65`
- [x] C3: **distinct URL domain** per direction; weights = **sum trust per domain**, then sum domains
- [x] `neutral`: not eligible, not in weights
- [x] After Fact/Lie: **always recompute** on new evidence/trust (verdict may change)
- [x] Topics/claims **published immediately**; **report → hide** moderation hook
- [x] **Login required** for vote & trust; **public read** for GET feeds/detail
- [x] **Supabase Auth** + FastAPI JWT verification
- [x] Comment `linked_vote` = same single vote per user per claim

## 14. 아직 열린 결정

- [ ] `participants` 집계 정의
- [ ] topic `updated_at` 갱신 트리거
- [ ] `claim_scores` history / audit rows
- [ ] 파일 업로드 세부 (MIME, size, scan)
- [ ] 댓글 markdown, CAPTCHA, rate limit 숫자
- [ ] `users.display_name` Supabase metadata 필드

---

## 15. 관련 파일 빠른 참조

| 경로 | 역할 |
|------|------|
| `mobile/src/repository/types.ts` | API가 구현할 interface |
| `mobile/src/repository/LocalRepository.ts` | 현재 비즈니스 규칙 참조 |
| `mobile/src/data/types.ts` | DTO 필드 |
| `mobile/src/data/seed.ts` | 시드·golden fixture |
| `mobile/src/scoring/*` | 서버 포팅 원본 |
| `mobile/src/app/*` | 화면별 repo 호출 |
| [`HANDOFF.md`](./HANDOFF.md) | 제품·규칙·확정/열린 결정 |

---

*이 문서는 모바일 MVP(`main`의 `mobile/`) 기준으로 작성되었다. API 구현 PR마다 OpenAPI diff와 본 문서 §4 테이블 동기화를 권장한다.*
