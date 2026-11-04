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

## 3. 점수 규칙 (현재 초안 — 서버로 옮길 때 동일하게)

**SSOT (모바일)**: `mobile/src/scoring/` — 프레임워크 무관 순수 TypeScript.  
**참조 구현 (웹)**: `web-prototype/app.js`

### 상수

| 이름 | 값 | 의미 |
|------|-----|------|
| `TRUST_MIN` | `3` | 증거가 “적격”이 되려면 신뢰 추천 ≥ 3 (C2) |
| `MIN_ELIGIBLE_SAME_DIR` | `2` | 확정하려는 방향의 적격 증거 ≥ 2건 (C3) |
| `FACT_THRESHOLD` | `0.65` | Fact/Lie 확정에 필요한 적격 가중치 비중 ≥ 65% |
| `RULE_VERSION` | `2026-03-24-draft` | 규칙/상수 변경 시 bump (백엔드 `claim_scores.rule_version`과 동기화 예정) |

### 여론 점수 (Opinion)

```
Opinion True% = votesTrue / (votesTrue + votesFalse)
```

- 출처 유무 무관
- 댓글에 연동된 투표도 여론에 포함 가능
- 팩트 점수에는 **직접 반영하지 않음**

### 팩트 점수 — 적격 증거 (C1, C2)

증거가 **적격(eligible)** 이려면:

- **C1**: 출처 URL(또는 향후 업로드 파일) 존재
- **C2**: `trust >= TRUST_MIN` (기본 3)

`stance === "neutral"` 인 자료는 적격 후보에는 포함될 수 있으나, True/False **가중치 합산에서는 제외**.

### 팩트 점수 — 확정 게이트 (C3, C4, threshold)

1. 적격 증거를 True / False로 분류
2. **C3**: True 쪽 적격 ≥ 2 **또는** False 쪽 적격 ≥ 2 (확정하려는 쪽이 이 조건을 만족해야 함)
3. 가중치: 각 적격 증거의 `trust` 합  
   - `wTrue`, `wFalse`  
   - `trueShare = wTrue / (wTrue + wFalse)`
4. **C4**: 이기려는 쪽 가중치가 반대보다 작으면 안 됨 (`wTrue >= wFalse` 또는 반대)
5. 이긴 쪽 비중 ≥ `FACT_THRESHOLD` (0.65)

### 판정 상태

| status | 의미 |
|--------|------|
| `pending` | 적격 부족 또는 C3 미달 — Fact/Lie 미확정, 여론만 의미 있음 |
| `fact` | True 쪽으로 확정 |
| `lie` | False 쪽으로 확정 |
| `split` | 적격은 있으나 우세/65% 미달 등으로 경합 |

`rule_version`을 백엔드에 둘 것 — 임계값을 바꿔도 “그때 무슨 규칙으로 확정했는지” 남겨야 함.

### 샘플로 이미 검증되는 케이스 (시드 데이터)

- **c1** (발전량 비중 OECD 평균보다 높다): 여론은 갈리지만 적격 False 2건 → **Lie**
- **c2** (설비용량 비중): 적격 True 우세 → **Fact**
- **c3** (정의 동일): 여론은 False 많아도 적격 부족 → **검증 중**

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
| Auth | Clerk / Supabase Auth / Auth.js (직접 구현 비권장) |
| 파일 | 1단계는 URL만, 이후 S3/R2 |
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

## 6. 제품/규칙에서 열린 결정 (아직 미정)

에이전트가 임의로 굳히지 말고, 구현 시 기본값을 쓰되 문서/설정으로 노출할 것.

- 신뢰 추천 3, 동일 방향 2건, 65%가 너무 빡센가/느슨한가
- “서로 다른 출처”를 URL 도메인 단위로 강제할지
- 중립 증거를 적격 카운트에 넣을지
- Fact/Lie 확정 후 새 증거가 들어오면 자동 재오픈할지
- 토픽/명제 제안이 즉시 공개인지, 모더레이션 큐인지
- 익명 투표 허용 여부 (요건 검증 단계에선 로그인 강제 권장)

---

## 7. 권장 다음 작업 순서

1. **Backend 스캐폴딩**: FastAPI + Postgres + `schema.sql` + scoring 모듈 + golden tests (`mobile/src/scoring`과 동일 fixture)
2. **시드 데이터**: `mobile/src/data/seed.ts` → SQL/JSON 이전
3. **API 연동**: `FactfulnessRepository`의 HTTP 구현체로 교체, 클라이언트 `factScore`는 표시용 fallback만
4. **Auth**: 유저당 claim 1표, evidence당 trust 1회
5. **규칙 튜닝 UI/설정**: threshold 등을 바꿔가며 시뮬레이션
6. (이후) 파일 업로드, 모더레이션, 링크 아카이브, 검색, 푸시 알림

---

## 8. 디자인/프론트 메모

- 브랜드명: **Factfulness**
- 폰트: Fraunces (display) + Outfit (UI) — `@expo-google-fonts/*`
- 색: teal 계열 강조, 연한 그린-그레이 배경, Fact=leaf green / Lie=coral
- 모바일: 카드·탭·모달 중심, 웹 프로토타입의 정보 구조 유지

---

## 9. 커밋 시점 파일 목록 (기준선)

```
mobile/                 # Expo app (primary product)
web-prototype/          # static reference (index.html, styles.css, app.js)
HANDOFF.md              # product + scoring + handoff
BACKEND.md              # backend implementation guide for mobile/
```

백엔드 착수 시 `backend/` 추가. 점수 SSOT는 서버로 옮긴 뒤 모바일 `scoring/`은 테스트·오프라인 미리보기용으로 유지하거나 공유 패키지로 승격.
