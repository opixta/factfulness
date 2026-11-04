# Factfulness — Agent Handoff

다른 에이전트가 이어서 작업할 수 있도록, 제품 구상·점수 규칙·현재 구현·백엔드 방향·다음 단계를 정리한 문서입니다.

- **Repo**: `https://github.com/opixta/factfulness.git`
- **Local**: `/home/opixta/work/factfulness`
- **상태**: **React Native (Expo) 모바일 앱** 1차 구현 + 정적 웹 프로토타입(참조용)
- **모바일 실행**: `cd mobile && npx expo start` (iOS/Android/웹)
- **웹 프로토타입 미리보기**: `cd web-prototype && python3 -m http.server 8765` → `http://localhost:8765`
- **백엔드 구현 가이드**: [`BACKEND.md`](./BACKEND.md) — Expo 앱(`mobile/`) 연동용 API·DB·점수·로드맵 체크리스트

---

## 1. 제품 컨셉

커뮤니티 팩트체크 **모바일 앱** (Expo / React Native).

1. 유저가 **토픽**(큰 주장/이슈)을 제안한다.
2. 토픽 아래 **세부 명제(claim)** 를 여러 개 둔다. 각 명제는 True / False로 판단 가능해야 한다.
3. 사람들은 명제마다:
   - True / False **투표**
   - **증거 자료** 업로드(또는 URL 등록) + 요약 + 지지 방향
   - **댓글** (선택적으로 투표 연동)
4. 점수는 두 축으로 분리한다.
   - **여론 점수 (Opinion)**: 투표 비율
   - **팩트 점수 (Fact / Lie)**: 조건을 통과한 증거만으로 집계·확정

의도: 여론(사람들이 어떻게 느끼나)과 사실 판정(출처·추천·충분성)을 섞지 않는다.

---

## 2. 핵심 UX 흐름

```
홈(탐색)
  ├─ 토픽 목록
  ├─ 토픽 제안 (modal)
  └─ 점수 규칙 설명 (tab)

토픽 상세
  ├─ 세부 명제 목록 (여론/팩트 점수 미리보기)
  └─ 세부 명제 제안 (modal)

명제 상세
  ├─ True / False 투표 → 여론만 반영
  ├─ 증거 목록 + 신뢰 추천(+1) + 자료 등록
  └─ 댓글 (+ 선택 투표)
```

---

## 3. 점수 규칙 (확정 — 서버·모바일 동기화)

**SSOT (모바일)**: `mobile/src/scoring/` — 프레임워크 무관 순수 TypeScript.  
**참조 구현 (웹, 구 규칙)**: `web-prototype/app.js` (갱신 전)

### 상수 (확정)

| 이름 | 값 | 의미 |
|------|-----|------|
| `TRUST_MIN` | `3` | 증거가 “적격”이 되려면 신뢰 추천 ≥ 3 (C2) |
| `MIN_ELIGIBLE_SAME_DIR` | `2` | 확정 방향마다 **서로 다른 출처 도메인** ≥ 2 (C3) |
| `FACT_THRESHOLD` | `0.65` | Fact/Lie 확정에 필요한 적격 가중치 비중 ≥ 65% |
| `RULE_VERSION` | `2026-11-04-v3` | ClamAV file scan gate + 확정 C3/rate limits |

### 여론 점수 (Opinion)

```
Opinion True% = votesTrue / (votesTrue + votesFalse)
```

- 출처 유무 무관
- **댓글 연동 투표** = 해당 유저의 claim **1표** 생성/변경 (`castVote`와 동일)
- 팩트 점수에는 **직접 반영하지 않음**

### 팩트 점수 — 적격 증거 (C1, C2)

증거가 **적격(eligible)** 이려면 **동시에**:

- **C1**: 출처 URL(또는 향후 업로드 파일) 존재 — **파일은 ClamAV `clean` 후에만** C1 충족 (`pending`/`infected`는 미충족)
- **C2**: `trust >= TRUST_MIN` (3)
- **stance**가 `true` 또는 `false` (**`neutral`은 적격·가중치 모두 제외**)

### 팩트 점수 — 확정 게이트 (C3, C4, threshold)

1. 적격 증거를 True / False로 분류 (중립 제외)
2. **C3**: 확정하려는 방향에서 **서로 다른 출처 도메인** ≥ 2  
   - URL `hostname` 기준 (`www.` 제거, 소문자)  
   - 같은 도메인의 증거 2건 → C3 카운트 **1**
3. **가중치**: 방향·도메인별로 해당 증거들의 `trust`를 **합산**한 뒤, 도메인 버킷들을 다시 합산  
   - `wTrue`, `wFalse`  
   - `trueShare = wTrue / (wTrue + wFalse)`  
   - (같은 도메인 다건은 C3에는 1개로 세지만, 가중치는 합쳐져 반영)
4. **C4**: 이기려는 쪽 가중치가 반대보다 작으면 안 됨
5. 이긴 쪽 비중 ≥ `FACT_THRESHOLD` (0.65)

**확정 후 변경**: Fact/Lie 확정 후에도 새 증거·trust가 들어오면 **항상 재계산**하며 판정은 바뀔 수 있다.

### 판정 상태

| status | 의미 |
|--------|------|
| `pending` | 적격 부족 또는 C3 미달 — Fact/Lie 미확정, 여론만 의미 있음 |
| `fact` | True 쪽으로 확정 |
| `lie` | False 쪽으로 확정 |
| `split` | 적격은 있으나 우세/65% 미달 등으로 경합 |

`rule_version`을 백엔드에 둘 것 — 임계값을 바꿔도 “그때 무슨 규칙으로 확정했는지” 남겨야 함.

### 샘플로 이미 검증되는 케이스 (시드 데이터)

- **c1** … 적격 False **도메인 2개** → **Lie**
- **c2** … 적격 True **도메인 2개** → **Fact**
- **c3** … 적격 False **도메인 1개** → **검증 중** (시드 URL은 서로 다른 도메인 유지)

유닛 테스트: `cd mobile && npm test` (`mobile/src/scoring/factScore.test.ts`)

---

## 4. 현재 구현

### 레포 구조

| 경로 | 역할 |
|------|------|
| `mobile/` | **Expo SDK 58** 앱 (TypeScript, expo-router, AsyncStorage) |
| `mobile/src/scoring/` | 순수 점수 엔진 + Vitest golden tests |
| `mobile/src/repository/` | `LocalFactfulnessRepository` — 향후 FastAPI로 교체 가능한 인터페이스 |
| `mobile/src/data/seed.ts` | 웹 프로토타입과 동일한 시드 |
| `web-prototype/` | 정적 HTML/CSS/JS 참조 UI (`index.html`, `styles.css`, `app.js`) |
| `HANDOFF.md` | this document |

### 모바일에서 되는 것

- 토픽 목록 / 상세 / 시드 데이터
- 토픽 제안 (첫 명제 포함)
- 세부 명제 제안
- True/False 투표 (로컬 1인 1표 시뮬레이션)
- 증거 등록, 신뢰 추천 +1, 적격/미적격 배지
- 댓글 + 선택 투표 (여론 반영)
- 여론 vs 팩트 이중 점수 UI + gate 사유
- 점수 규칙 탭
- AsyncStorage로 앱 재시작 후 데이터 유지

### 아직 없는 것 / 한계

- **백엔드·DB·인증** 없음 — 프로덕션 판정은 서버가 해야 함
- 실제 파일 업로드 없음 (URL만)
- 유저당 1표·evidence당 trust 1회 **서버 강제** 없음
- 검색, 알림, 모더레이션, 링크 아카이브 없음
- 웹 프로토타입은 더 이상 주력 UI가 아님 (동작/카피 참조용)

### 개발 명령

```bash
cd mobile
npm install
npm run typecheck
npm test
npx expo start          # QR / 시뮬레이터 / w 키로 웹
```

---

## 5. 백엔드 권장 (요건 검증 MVP)

> **상세 작업 목록**: 모바일 Repository·화면·점수 모듈에 맞춘 엔드포인트/스키마/단계별 로드맵은 [`BACKEND.md`](./BACKEND.md)를 참고한다.

목표: “서버 점수가 여론과 분리되어 올바르게 바뀌는가”를 확인.

### 스택 추천

| 층 | 추천 |
|----|------|
| API | **FastAPI (Python)** — `mobile/src/scoring` 로직을 Python으로 미러 또는 공유 패키지화 |
| DB | **PostgreSQL** |
| Auth | **Supabase Auth** (확정) — Expo `@supabase/supabase-js`, FastAPI JWT 검증 |
| 파일 | **Cloudflare R2** (quarantine → ClamAV → clean bucket) — [`BACKEND.md`](./BACKEND.md) §7.3 |
| 배포 | Railway / Fly.io / Render + Managed Postgres |

모놀리식 하나면 충분. 점수 재계산은 MVP에서 **동기**가 디버깅에 유리.

### 도메인 테이블 (초안)

```
users
topics          (id, title, summary, created_by, status, created_at)
claims          (id, topic_id, text, reason, status, created_by, created_at)
votes           (claim_id, user_id, value: true|false)  UNIQUE(claim_id, user_id)
evidence        (id, claim_id, user_id, title, url, stance, summary, created_at)
evidence_trust  (evidence_id, user_id)                 UNIQUE(evidence_id, user_id)
comments        (id, claim_id, user_id, body, linked_vote?, created_at)
claim_scores    (claim_id, opinion_pct, fact_status, fact_pct,
                 w_true, w_false, eligible_true, eligible_false,
                 gate_reasons jsonb, computed_at, rule_version)
```

### API 스케치

```
POST   /topics
GET    /topics
GET    /topics/:id
POST   /topics/:id/claims
GET    /claims/:id          # opinion + fact + gate_reasons 포함
POST   /claims/:id/votes    # body: { value: true|false }
POST   /claims/:id/evidence
POST   /evidence/:id/trust
POST   /claims/:id/comments
POST   /claims/:id/recompute  # 또는 evidence/trust 변경 시 자동
```

모바일 앱은 점수를 계산하지 말고 **서버 결과만 표시** (현재는 오프라인 MVP로 클라이언트 계산).

### scoring 모듈 구조 (백엔드)

```
scoring/
  eligibility.py   # C1 URL, C2 trust>=TRUST_MIN
  aggregate.py     # C3, weight, C4, threshold → pending|fact|lie|split
  types.py
  config.py        # TRUST_MIN, MIN_ELIGIBLE_SAME_DIR, FACT_THRESHOLD, RULE_VERSION
```

필수 테스트:

- 유닛: c1→lie, c2→fact, c3→pending (시드와 동일)
- fixture JSON을 repo에 두고 assert
- 설정값 변경 실험이 쉽도록 env/DB로 상수 분리

---

## 6. 확정된 제품·규칙 결정

### 2026-11-04 (점수·인증·공개)

- **임계값**: `TRUST_MIN=3`, `MIN_ELIGIBLE_SAME_DIR=2`, `FACT_THRESHOLD=0.65` 유지
- **C3 출처**: 동일 방향 **서로 다른 URL 도메인** ≥ 2; 가중치 = **도메인별 trust 합** 후 방향 합산
- **중립 증거**: 팩트 점수 **적격·가중치 모두 제외**
- **재오픈**: Fact/Lie 확정 후에도 증거/trust 변경 시 **자동 재계산**
- **공개**: 토픽·claim **즉시 published**; 신고 → 숨김
- **인증**: 투표·trust **로그인 필수**; **읽기 public**
- **Auth**: **Supabase Auth**
- **댓글 투표**: claim당 유저 **1표** (댓글 linked_vote = `votes` UPSERT)

### 2026-11-04 (운영·UX·백엔드)

- **`participants`**: 토픽 내 **임의 claim**에서 vote / evidence / comment / trust 한 번이라도 한 **고유 유저 수**
- **`updated_at`**: 위 활동 **전부**(투표 포함)마다 토픽 갱신
- **`claim_score_history`**: recompute마다 **이력 row** (`rule_version`, status, pct, weights, gate_reasons, `computed_at`)
- **파일 증거 C1**: **url OR file**; **이미지+PDF만**, **max 10MB**; **ClamAV** 스캔 후 `clean`만 적격
- **파일 C3 출처**: **`file:{evidence_id}`** — 업로드 **파일마다** distinct (확정)
- **댓글**: **평문만**; 표시 시 URL **auto-link** (markdown 없음)
- **CAPTCHA**: 초기 **없음**; **rate limit** — **`mobile/src/config/rateLimits.ts` 값 = 프로덕션** (확정)
- **닉네임**: Supabase 로그인 **후 온보딩**에서 **자가 설정** (로컬: 2–20자, 한글/영문/숫자/`_`; 서버: **전역 unique** 예정)
- **「신규」 태그**: 생성 후 **7일** — `createdAt` 기준 **파생** (tags 배열에 수동 저장하지 않음)

### 2026-11-04 (라운드 3 — 보안·운영 확정)

- **바이러스 스캔**: 업로드 파일 **서버-side ClamAV** — `pending` → `clean`|`infected`; **C1/C3 미반영** when not clean
- **파일 C3**: **`file:{evidence_id}`** per upload (확정)
- **Rate limits**: `mobile/src/config/rateLimits.ts` = **프로덕션** (확정)

### 2026-11-04 (라운드 4 — 저장·모더레이션·오프라인·trust)

- **객체 저장**: **Cloudflare R2** (S3-compatible). Quarantine + clean evidence **버킷**; presigned upload/download. Clean 파일 MVP는 **presigned URL** (공개 CDN/custom domain은 후보).
- **댓글 모더레이션**: **금지어 목록** 자동 차단 (KO+EN, normalize 후 substring). 서버 SSOT `backend/config/banned_words.txt`; API `422 COMMENT_BANNED`. 모바일 `mobile/src/moderation/bannedWords.ts`는 placeholder + 즉시 UX. **신고/`hidden_at`**은 2차.
- **오프라인 mutation queue**: **MVP 제외** — 오프라인 시 쓰기 실패, **에러/재시도** (queue 없음).
- **Trust on pending/infected file evidence**: **금지** — `canEndorseTrustEvidence`; UI 비활성 + 안내.

## 7. 아직 열린 결정

- R2 clean 파일 **공개 CDN** vs presigned-only (MVP: presigned)
- 금지어 목록 **운영·확장** (누가/어떻게 갱신)
- (기타) Admin 모더레이션 UI, 링크 아카이브 등 — [`BACKEND.md`](./BACKEND.md) §14

---

## 8. 권장 다음 작업 순서

1. **Backend 스캐폴딩**: FastAPI + Postgres + `schema.sql` + scoring 모듈 + golden tests (`mobile/src/scoring`과 동일 fixture)
2. **시드 데이터**: `mobile/src/data/seed.ts` → SQL/JSON 이전
3. **API 연동**: `FactfulnessRepository`의 HTTP 구현체로 교체, 클라이언트 `factScore`는 표시용 fallback만
4. **Auth**: 유저당 claim 1표, evidence당 trust 1회
5. **규칙 튜닝 UI/설정**: threshold 등을 바꿔가며 시뮬레이션
6. (이후) 파일 업로드, 모더레이션, 링크 아카이브, 검색, 푸시 알림

---

## 9. 디자인/프론트 메모

- 브랜드명: **Factfulness**
- 폰트: Fraunces (display) + Outfit (UI) — `@expo-google-fonts/*`
- 색: teal 계열 강조, 연한 그린-그레이 배경, Fact=leaf green / Lie=coral
- 모바일: 카드·탭·모달 중심, 웹 프로토타입의 정보 구조 유지

---

## 10. 커밋 시점 파일 목록 (기준선)

```
mobile/                 # Expo app (primary product)
web-prototype/          # static reference (index.html, styles.css, app.js)
HANDOFF.md              # product + scoring + handoff
BACKEND.md              # backend implementation guide for mobile/
```

백엔드 착수 시 `backend/` 추가. 점수 SSOT는 서버로 옮긴 뒤 모바일 `scoring/`은 테스트·오프라인 미리보기용으로 유지하거나 공유 패키지로 승격.
