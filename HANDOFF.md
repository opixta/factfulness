# Factfulness — Agent Handoff

다른 에이전트가 이어서 작업할 수 있도록, 제품 구상·점수 규칙·현재 구현·백엔드 방향·다음 단계를 정리한 문서입니다.

- **Repo**: `https://github.com/opixta/factfulness.git`
- **Local**: `/home/opixta/work/factfulness`
- **상태**: 정적 UI 프로토타입 (데이터는 브라우저 메모리, 새로고침 시 소실)
- **미리보기**: `cd /home/opixta/work/factfulness && python3 -m http.server 8765` → `http://localhost:8765`

---

## 1. 제품 컨셉

커뮤니티 팩트체크 웹앱.

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
  ├─ 토픽 제안 (dialog)
  └─ 점수 규칙 설명

토픽 상세
  ├─ 세부 명제 목록 (여론/팩트 점수 미리보기)
  └─ 세부 명제 제안 (dialog)

명제 상세
  ├─ True / False 투표 → 여론만 반영
  ├─ 증거 목록 + 신뢰 추천(+1) + 자료 등록
  └─ 댓글 (+ 선택 투표)
```

---

## 3. 점수 규칙 (현재 초안 — 서버로 옮길 때 동일하게)

구현 위치: `app.js` (`FACT_THRESHOLD`, `TRUST_MIN`, `MIN_ELIGIBLE_SAME_DIR`, `factScore()`)

### 상수

| 이름 | 값 | 의미 |
|------|-----|------|
| `TRUST_MIN` | `3` | 증거가 “적격”이 되려면 신뢰 추천 ≥ 3 (C2) |
| `MIN_ELIGIBLE_SAME_DIR` | `2` | 확정하려는 방향의 적격 증거 ≥ 2건 (C3) |
| `FACT_THRESHOLD` | `0.65` | Fact/Lie 확정에 필요한 적격 가중치 비중 ≥ 65% |

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

### 샘플로 이미 검증되는 케이스 (프론트 시드 데이터)

- **c1** (발전량 비중 OECD 평균보다 높다): 여론은 갈리지만 적격 False 2건 → **Lie**
- **c2** (설비용량 비중): 적격 True 우세 → **Fact**
- **c3** (정의 동일): 여론은 False 많아도 적격 부족 → **검증 중**

이 세 fixture는 백엔드 golden test로 그대로 옮기는 것을 권장.

---

## 4. 현재 구현 (프론트 프로토타입)

| 파일 | 역할 |
|------|------|
| `index.html` | 뷰 골격: home / topic / claim / rules + dialogs |
| `styles.css` | 브랜드·레이아웃 (Fraunces + Outfit, teal 톤) |
| `app.js` | 인메모리 state, 라우팅(뷰 전환), 점수 엔진, CRUD UX |

### 이미 되는 것

- 토픽 목록 / 상세 / 예시 데이터
- 토픽 제안
- **세부 명제 제안** (토픽 상세의 “세부 명제 제안” 버튼 + dialog)
- 명제별 True/False 투표
- 증거 등록, 신뢰 추천 +1, 적격/미적격 배지
- 댓글 + 선택 투표
- 여론 vs 팩트 이중 점수 UI + gate 사유 문구
- 점수 규칙 설명 페이지

### 없는 것 / 한계

- 서버·DB 없음 → 새로고침 시 데이터 소실
- 인증·유저당 1표 강제 없음
- 실제 파일 업로드 없음 (URL만)
- 점수 계산이 **클라이언트**에만 있음 (조작 가능 — 프로덕션에서는 서버가 유일한 판정자여야 함)
- 검색, 알림, 모더레이션, 링크 아카이브 없음

---

## 5. 백엔드 권장 (요건 검증 MVP)

목표: “서버 점수가 여론과 분리되어 올바르게 바뀌는가”를 확인.

### 스택 추천

| 층 | 추천 |
|----|------|
| API | **FastAPI (Python)** — 지금 `factScore()` 이식이 쉬움. 대안 NestJS |
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

프론트는 점수를 계산하지 말고 **서버 결과만 표시**.

### scoring 모듈 구조

```
scoring/
  eligibility.py   # C1 URL, C2 trust>=TRUST_MIN
  aggregate.py     # C3, weight, C4, threshold → pending|fact|lie|split
  types.py
  config.py        # TRUST_MIN, MIN_ELIGIBLE_SAME_DIR, FACT_THRESHOLD, RULE_VERSION
```

필수 테스트:

- 유닛: c1→lie, c2→fact, c3→pending (현재 시드와 동일)
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

1. **Backend 스캐폴딩**: FastAPI + Postgres + `schema.sql` + scoring 모듈 + golden tests
2. **시드 데이터**: 현재 `app.js` state의 topics/claims/evidence를 SQL/JSON으로 이전
3. **API 연동**: 정적 프론트를 fetch로 붙이거나, 작은 admin/HTTP 테스트로 규칙만 먼저 검증
4. **Auth**: 유저당 claim 1표, evidence당 trust 1회
5. **규칙 튜닝 UI/설정**: threshold 등을 바꿔가며 시뮬레이션
6. (이후) 파일 업로드, 모더레이션, 링크 아카이브, 검색

---

## 8. 디자인/프론트 메모

- 브랜드명: **Factfulness**
- 폰트: Fraunces (display) + Outfit (UI)
- 색: teal 계열 강조, 연한 그린-그레이 배경, Fact=leaf green / Lie=coral
- 랜딩은 브랜드 히어로 중심; 카드형 남용 지양
- 뷰 전환은 SPA-like (hash/router 없음, `showView()`)

기존 UI를 유지한 채 API만 붙이는 방향이 자연스럽다.

---

## 9. 커밋 시점 파일 목록

```
index.html   # UI shell + dialogs
styles.css   # styles
app.js       # client state + scoring + interactions
HANDOFF.md   # this document
```

이 문서와 프로토타입이 동기화된 시점의 기준선이다. 백엔드 착수 시 `backend/` 또는 별도 패키지를 추가하고, 점수 로직의 SSOT를 서버로 옮긴 뒤 프론트 `factScore()`는 display-only 또는 제거한다.
