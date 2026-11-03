/**
 * Factfulness — interactive draft
 * Opinion score: all votes
 * Fact/Lie score: only evidence that passes C1–C4
 */

const FACT_THRESHOLD = 0.65;
const TRUST_MIN = 3;
const MIN_ELIGIBLE_SAME_DIR = 2;

const state = {
  currentView: "home",
  currentTopicId: null,
  currentClaimId: null,
  topics: [
    {
      id: "t1",
      title: "한국의 재생에너지 비중은 OECD 평균을 이미 넘었다",
      summary:
        "언론·SNS에서 반복되는 주장입니다. 발전량 기준인지 설비 용량 기준인지에 따라 결론이 달라질 수 있어 세부 명제로 나눕니다.",
      tags: ["에너지", "통계", "정책"],
      participants: 128,
      updatedAt: "2시간 전",
    },
    {
      id: "t2",
      title: "도심 자전거 도로 확장이 교통 체증을 악화시킨다",
      summary:
        "특정 구간 공사 전후 체증 증가가 ‘전체 도시’ 효과처럼 일반화되고 있습니다. 측정 구간과 시간대를 분리해 검증합니다.",
      tags: ["교통", "도시"],
      participants: 76,
      updatedAt: "어제",
    },
  ],
  claims: {
    t1: [
      {
        id: "c1",
        text: "2023년 기준 한국 전력 생산량 중 재생에너지 비중은 OECD 평균보다 높다.",
        votesTrue: 41,
        votesFalse: 67,
      },
      {
        id: "c2",
        text: "한국 재생에너지 ‘설비용량’ 비중은 2023년 OECD 평균을 상회한다.",
        votesTrue: 38,
        votesFalse: 29,
      },
      {
        id: "c3",
        text: "정부 공식 통계와 IEA 통계의 재생에너지 정의는 동일하다.",
        votesTrue: 12,
        votesFalse: 54,
      },
    ],
    t2: [
      {
        id: "c4",
        text: "서울시 A구간 자전거 도로 개통 후 해당 구간 평균 통행속도가 개통 전 대비 10% 이상 감소했다.",
        votesTrue: 22,
        votesFalse: 18,
      },
    ],
  },
  evidence: {
    c1: [
      {
        id: "e1",
        title: "IEA Electricity 2024 — OECD average renewables share",
        url: "https://www.iea.org/",
        stance: "false",
        summary: "OECD 평균 재생 전력 비중이 한국 수치보다 높게 제시됨.",
        trust: 14,
      },
      {
        id: "e2",
        title: "한국전력통계 2023 발전량 구성",
        url: "https://www.kpx.or.kr/",
        stance: "false",
        summary: "국내 발전량 기준 재생 비중이 OECD 평균 아래로 나타남.",
        trust: 11,
      },
      {
        id: "e3",
        title: "블로그 요약: ‘이미 앞질렀다’ 주장",
        url: "https://example.com/blog",
        stance: "true",
        summary: "설비용량과 발전량을 혼용해 비중을 높게 해석.",
        trust: 2,
      },
    ],
    c2: [
      {
        id: "e4",
        title: "IRENA Capacity Statistics 2024",
        url: "https://www.irena.org/",
        stance: "true",
        summary: "설비용량 기준으로는 한국이 일부 OECD 국가 평균을 상회할 수 있음.",
        trust: 9,
      },
      {
        id: "e5",
        title: "산업부 재생에너지 보급통계",
        url: "https://www.motie.go.kr/",
        stance: "true",
        summary: "설비 기준 지표를 별도로 공표.",
        trust: 7,
      },
      {
        id: "e6",
        title: "반론 칼럼: 용량≠발전",
        url: "https://example.com/op-ed",
        stance: "false",
        summary: "용량 비중으로 ‘이미 넘었다’고 말하기엔 오해의 소지가 큼.",
        trust: 4,
      },
    ],
    c3: [
      {
        id: "e7",
        title: "통계 정의 비교표 (커뮤니티 정리)",
        url: "https://example.com/defs",
        stance: "false",
        summary: "폐기물·양수 포함 여부 등 정의 차이 정리.",
        trust: 5,
      },
    ],
    c4: [
      {
        id: "e8",
        title: "서울시 교통정보시스템 구간 속도",
        url: "https://topis.seoul.go.kr/",
        stance: "true",
        summary: "개통 직후 3개월 평균 속도 하락.",
        trust: 6,
      },
      {
        id: "e9",
        title: "동일 기간 우회도로 속도 상승 데이터",
        url: "https://example.com/detour",
        stance: "neutral",
        summary: "본선 체증이 네트워크 전체 악화를 의미하진 않을 수 있음.",
        trust: 3,
      },
    ],
  },
  comments: {
    c1: [
      {
        id: "cm1",
        author: "mira",
        body: "발전량 기준으로 보면 False 쪽이 설득력 있어요. 용량 지표와 섞이면 안 됩니다.",
        vote: "false",
        at: "1시간 전",
      },
      {
        id: "cm2",
        author: "jun",
        body: "SNS 그래프는 출처가 불명확해서 여론만 흔드는 중.",
        vote: "",
        at: "3시간 전",
      },
    ],
    c2: [
      {
        id: "cm3",
        author: "sora",
        body: "설비용량이라면 True 가능성이 있습니다. 다만 주장 문장에 ‘비중’이 모호해요.",
        vote: "true",
        at: "5시간 전",
      },
    ],
    c3: [],
    c4: [
      {
        id: "cm4",
        author: "lee",
        body: "공사 기간 겹침을 통제했는지가 핵심.",
        vote: "",
        at: "어제",
      },
    ],
  },
};

function $(sel, root = document) {
  return root.querySelector(sel);
}

function $all(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

function findClaim(claimId) {
  for (const [topicId, list] of Object.entries(state.claims)) {
    const claim = list.find((c) => c.id === claimId);
    if (claim) return { topicId, claim };
  }
  return null;
}

function opinionScore(claim) {
  const total = claim.votesTrue + claim.votesFalse;
  if (!total) return { pct: 0, total, trueShare: 0 };
  const trueShare = claim.votesTrue / total;
  return { pct: Math.round(trueShare * 100), total, trueShare };
}

/** Eligible evidence: C1 (has url — always in draft) + C2 trust >= TRUST_MIN */
function eligibleEvidence(claimId) {
  return (state.evidence[claimId] || []).filter((e) => e.url && e.trust >= TRUST_MIN);
}

/**
 * Fact gate C3/C4 + threshold
 * Returns { status, factPct, eligibleTrue, eligibleFalse, gatePassed, reasons }
 */
function factScore(claimId) {
  const eligible = eligibleEvidence(claimId);
  const eligibleTrue = eligible.filter((e) => e.stance === "true");
  const eligibleFalse = eligible.filter((e) => e.stance === "false");
  const reasons = [];

  const c2pass = eligible.length > 0;
  if (!c2pass) reasons.push(`신뢰 추천 ≥${TRUST_MIN}인 출처 자료가 부족합니다 (C1·C2).`);

  const trueOk = eligibleTrue.length >= MIN_ELIGIBLE_SAME_DIR;
  const falseOk = eligibleFalse.length >= MIN_ELIGIBLE_SAME_DIR;

  if (!trueOk && !falseOk) {
    reasons.push(`동일 방향 적격 증거 ≥${MIN_ELIGIBLE_SAME_DIR}건 조건을 충족하지 못했습니다 (C3).`);
  }

  // weight = trust count
  const wTrue = eligibleTrue.reduce((s, e) => s + e.trust, 0);
  const wFalse = eligibleFalse.reduce((s, e) => s + e.trust, 0);
  const wSum = wTrue + wFalse;

  let status = "pending";
  let factPct = null;

  if (wSum > 0 && (trueOk || falseOk)) {
    // C4: opposing side must not strictly dominate before calling a winner
    const trueShare = wTrue / wSum;
    factPct = Math.round(trueShare * 100);

    const canCallTrue = trueOk && wTrue >= wFalse;
    const canCallFalse = falseOk && wFalse >= wTrue;

    if (!canCallTrue && !canCallFalse) {
      reasons.push("반대 방향 적격 증거가 우세하거나 균형이라 확정할 수 없습니다 (C4).");
      status = "split";
    } else if (canCallTrue && trueShare >= FACT_THRESHOLD) {
      status = "fact";
      reasons.length = 0;
    } else if (canCallFalse && 1 - trueShare >= FACT_THRESHOLD) {
      status = "lie";
      reasons.length = 0;
    } else {
      status = "split";
      reasons.push(`적격 증거 비중 ${factPct}% True — 확정 임계값 ${Math.round(FACT_THRESHOLD * 100)}% 미달.`);
    }
  }

  return {
    status,
    factPct,
    eligibleTrue: eligibleTrue.length,
    eligibleFalse: eligibleFalse.length,
    wTrue,
    wFalse,
    gatePassed: status === "fact" || status === "lie",
    reasons,
  };
}

function statusBadge(status) {
  const map = {
    pending: ["pending", "검증 중"],
    fact: ["fact", "Fact"],
    lie: ["lie", "Lie"],
    split: ["split", "경합"],
  };
  const [cls, label] = map[status] || map.pending;
  return `<span class="badge ${cls}">${label}</span>`;
}

function stanceBadge(stance) {
  const label = stance === "true" ? "True 지지" : stance === "false" ? "False 지지" : "중립";
  return `<span class="badge stance-${stance}">${label}</span>`;
}

function showView(name) {
  state.currentView = name;
  $all(".view").forEach((v) => v.classList.remove("is-visible"));
  const el = $(`#view-${name}`);
  if (el) el.classList.add("is-visible");

  $all(".nav-link").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === name || (name !== "rules" && name !== "home" ? false : btn.dataset.view === name));
  });
  if (name === "home" || name === "rules") {
    $all(".nav-link").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.view === name);
    });
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderHome() {
  const list = $("#topic-list");
  list.innerHTML = state.topics
    .map((t) => {
      const claims = state.claims[t.id] || [];
      const statuses = claims.map((c) => factScore(c.id).status);
      const settled = statuses.filter((s) => s === "fact" || s === "lie").length;
      return `
        <article class="topic-item" role="button" tabindex="0" data-open-topic="${t.id}">
          <div class="meta-row">
            ${t.tags.map((tag) => `<span class="pill">${tag}</span>`).join("")}
            <span>${t.participants}명 참여</span>
            <span>업데이트 ${t.updatedAt}</span>
          </div>
          <h3>${escapeHtml(t.title)}</h3>
          <p class="hint">${escapeHtml(t.summary)}</p>
          <div class="meta-row">
            <span>세부 명제 ${claims.length}개</span>
            <span>Fact/Lie 확정 ${settled}/${claims.length}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTopic(topicId) {
  state.currentTopicId = topicId;
  const topic = state.topics.find((t) => t.id === topicId);
  if (!topic) return;

  $("#topic-hero").innerHTML = `
    <p class="eyebrow">Topic</p>
    <h1>${escapeHtml(topic.title)}</h1>
    <p class="lede">${escapeHtml(topic.summary)}</p>
    <div class="meta-row">
      ${topic.tags.map((tag) => `<span class="pill">${tag}</span>`).join("")}
      <span>${topic.participants}명 참여</span>
    </div>
  `;

  const claims = state.claims[topicId] || [];
  $("#claim-list").innerHTML = claims
    .map((c) => {
      const op = opinionScore(c);
      const fact = factScore(c.id);
      const factLabel =
        fact.status === "pending"
          ? "미확정"
          : fact.status === "fact"
            ? `Fact ${fact.factPct}%`
            : fact.status === "lie"
              ? `Lie ${100 - fact.factPct}%`
              : `경합 ${fact.factPct}% True`;
      const barClass =
        fact.status === "fact" ? "fact" : fact.status === "lie" ? "lie" : "pending";
      const barWidth = fact.factPct == null ? 0 : fact.status === "lie" ? 100 - fact.factPct : fact.factPct;

      return `
        <article class="claim-item" role="button" tabindex="0" data-open-claim="${c.id}">
          <div class="meta-row">${statusBadge(fact.status)}</div>
          <h3>${escapeHtml(c.text)}</h3>
          ${c.reason ? `<p class="hint">${escapeHtml(c.reason)}</p>` : ""}
          <div class="score-pair">
            <div class="score-box">
              <span class="label">여론 점수</span>
              <div class="value">${op.pct}% True</div>
              <div class="score-bar"><span style="width:${op.pct}%"></span></div>
              <p class="hint">${c.votesTrue} True · ${c.votesFalse} False</p>
            </div>
            <div class="score-box">
              <span class="label">팩트 점수</span>
              <div class="value">${factLabel}</div>
              <div class="score-bar ${barClass}"><span style="width:${barWidth}%"></span></div>
              <p class="hint">적격 증거 T${fact.eligibleTrue} / F${fact.eligibleFalse}</p>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  showView("topic");
}

function renderClaim(claimId) {
  const found = findClaim(claimId);
  if (!found) return;
  state.currentClaimId = claimId;
  state.currentTopicId = found.topicId;
  const { claim } = found;
  const op = opinionScore(claim);
  const fact = factScore(claimId);

  const factLabel =
    fact.status === "pending"
      ? "미확정"
      : fact.status === "fact"
        ? `Fact로 집계 중 (${fact.factPct}% True 적격)`
        : fact.status === "lie"
          ? `Lie로 집계 중 (${100 - fact.factPct}% False 적격)`
          : `경합 (${fact.factPct}% True 적격)`;

  const gateClass = fact.gatePassed ? "pass" : "";
  const gateText = fact.gatePassed
    ? "조건 C1–C4를 충족해 Fact/Lie 점수에 반영되고 있습니다."
    : fact.reasons.join(" ");

  $("#claim-panel").innerHTML = `
    <p class="eyebrow">Claim · True / False</p>
    <div class="meta-row">${statusBadge(fact.status)}</div>
    <h1>${escapeHtml(claim.text)}</h1>
    <div class="claim-actions">
      <button type="button" class="btn btn-true ${claim._userVote === "true" ? "is-selected" : ""}" data-vote="true">True 투표</button>
      <button type="button" class="btn btn-false ${claim._userVote === "false" ? "is-selected" : ""}" data-vote="false">False 투표</button>
    </div>
    <div class="score-pair">
      <div class="score-box">
        <span class="label">여론 점수</span>
        <div class="value">${op.pct}% True</div>
        <div class="score-bar"><span style="width:${op.pct}%"></span></div>
        <p class="hint">전체 투표 ${op.total}표 · 출처 없어도 반영</p>
      </div>
      <div class="score-box">
        <span class="label">팩트 점수</span>
        <div class="value" style="font-size:1.1rem">${factLabel}</div>
        <div class="score-bar ${fact.status === "fact" ? "fact" : fact.status === "lie" ? "lie" : "pending"}">
          <span style="width:${fact.factPct == null ? 0 : fact.status === "lie" ? 100 - fact.factPct : fact.factPct}%"></span>
        </div>
        <p class="hint">가중치 T${fact.wTrue} / F${fact.wFalse}</p>
      </div>
    </div>
    <p class="gate-note ${gateClass}">${escapeHtml(gateText || "조건을 확인하세요.")}</p>
  `;

  const evidence = state.evidence[claimId] || [];
  $("#evidence-list").innerHTML = evidence.length
    ? evidence
        .map((e) => {
          const eligible = e.url && e.trust >= TRUST_MIN;
          return `
            <article class="evidence-item">
              <h4>${escapeHtml(e.title)}</h4>
              <div class="meta-row">
                ${stanceBadge(e.stance)}
                ${eligible ? '<span class="badge eligible">적격 (팩트 반영)</span>' : '<span class="badge pending">미적격</span>'}
              </div>
              <p>${escapeHtml(e.summary)}</p>
              <a href="${escapeAttr(e.url)}" target="_blank" rel="noopener">${escapeHtml(e.url)}</a>
              <div class="trust-row">
                <span class="hint">신뢰 추천 ${e.trust}</span>
                <button type="button" class="btn btn-ghost" data-trust="${e.id}" style="padding:0.35rem 0.7rem;font-size:0.85rem">추천 +1</button>
              </div>
            </article>
          `;
        })
        .join("")
    : '<p class="hint">아직 등록된 자료가 없습니다.</p>';

  const comments = state.comments[claimId] || [];
  $("#comment-list").innerHTML = comments.length
    ? comments
        .map(
          (c) => `
        <article class="comment-item">
          <div class="author"><strong>${escapeHtml(c.author)}</strong> · ${escapeHtml(c.at)}${
            c.vote ? ` · <span class="pill">${c.vote.toUpperCase()}</span>` : ""
          }</div>
          <p>${escapeHtml(c.body)}</p>
        </article>
      `
        )
        .join("")
    : '<p class="hint">첫 댓글을 남겨 토론을 시작하세요.</p>';

  showView("claim");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("'", "&#39;");
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function bind() {
  document.body.addEventListener("click", (e) => {
    const viewBtn = e.target.closest("[data-view]");
    if (viewBtn) {
      e.preventDefault();
      const v = viewBtn.dataset.view;
      if (v === "home") {
        renderHome();
        showView("home");
      } else if (v === "rules") {
        showView("rules");
      }
      return;
    }

    const openTopic = e.target.closest("[data-open-topic]");
    if (openTopic) {
      renderTopic(openTopic.dataset.openTopic);
      return;
    }

    const openClaim = e.target.closest("[data-open-claim]");
    if (openClaim) {
      renderClaim(openClaim.dataset.openClaim);
      return;
    }

    const voteBtn = e.target.closest("[data-vote]");
    if (voteBtn && state.currentClaimId) {
      const found = findClaim(state.currentClaimId);
      if (!found) return;
      const { claim } = found;
      const next = voteBtn.dataset.vote;
      if (claim._userVote === next) return;
      if (claim._userVote === "true") claim.votesTrue = Math.max(0, claim.votesTrue - 1);
      if (claim._userVote === "false") claim.votesFalse = Math.max(0, claim.votesFalse - 1);
      if (next === "true") claim.votesTrue += 1;
      if (next === "false") claim.votesFalse += 1;
      claim._userVote = next;
      renderClaim(state.currentClaimId);
      return;
    }

    const trustBtn = e.target.closest("[data-trust]");
    if (trustBtn && state.currentClaimId) {
      const list = state.evidence[state.currentClaimId] || [];
      const item = list.find((x) => x.id === trustBtn.dataset.trust);
      if (item) {
        item.trust += 1;
        renderClaim(state.currentClaimId);
      }
      return;
    }

    if (e.target.id === "back-to-topic" || e.target.closest("#back-to-topic")) {
      if (state.currentTopicId) renderTopic(state.currentTopicId);
      return;
    }

    if (e.target.id === "btn-new-topic" || e.target.closest("#btn-new-topic")) {
      $("#topic-dialog").showModal();
      return;
    }

    if (e.target.id === "btn-new-claim" || e.target.closest("#btn-new-claim")) {
      if (!state.currentTopicId) return;
      const topic = state.topics.find((t) => t.id === state.currentTopicId);
      $("#claim-dialog-topic").textContent = topic
        ? `토픽: ${topic.title}`
        : "";
      $("#claim-dialog").showModal();
    }
  });

  document.body.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const openTopic = e.target.closest("[data-open-topic]");
    if (openTopic) {
      e.preventDefault();
      renderTopic(openTopic.dataset.openTopic);
    }
    const openClaim = e.target.closest("[data-open-claim]");
    if (openClaim) {
      e.preventDefault();
      renderClaim(openClaim.dataset.openClaim);
    }
  });

  $("#evidence-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.currentClaimId) return;
    const fd = new FormData(e.target);
    const item = {
      id: uid("e"),
      title: fd.get("title"),
      url: fd.get("url"),
      stance: fd.get("stance"),
      summary: fd.get("summary"),
      trust: 0,
    };
    if (!state.evidence[state.currentClaimId]) state.evidence[state.currentClaimId] = [];
    state.evidence[state.currentClaimId].unshift(item);
    e.target.reset();
    renderClaim(state.currentClaimId);
  });

  $("#comment-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.currentClaimId) return;
    const fd = new FormData(e.target);
    const vote = fd.get("vote") || "";
    const item = {
      id: uid("cm"),
      author: "you",
      body: fd.get("body"),
      vote,
      at: "방금",
    };
    if (!state.comments[state.currentClaimId]) state.comments[state.currentClaimId] = [];
    state.comments[state.currentClaimId].unshift(item);

    if (vote === "true" || vote === "false") {
      const found = findClaim(state.currentClaimId);
      if (found) {
        if (vote === "true") found.claim.votesTrue += 1;
        else found.claim.votesFalse += 1;
      }
    }

    e.target.reset();
    renderClaim(state.currentClaimId);
  });

  $("#new-topic-form").addEventListener("submit", (e) => {
    const submitter = e.submitter;
    if (submitter && submitter.value === "cancel") return;
    e.preventDefault();
    const fd = new FormData(e.target);
    if (submitter && submitter.value === "ok") {
      const tid = uid("t");
      const cid = uid("c");
      state.topics.unshift({
        id: tid,
        title: String(fd.get("title")),
        summary: String(fd.get("summary")),
        tags: ["신규"],
        participants: 1,
        updatedAt: "방금",
      });
      state.claims[tid] = [
        {
          id: cid,
          text: String(fd.get("claim")),
          votesTrue: 0,
          votesFalse: 0,
        },
      ];
      state.evidence[cid] = [];
      state.comments[cid] = [];
      e.target.reset();
      $("#topic-dialog").close();
      renderTopic(tid);
    }
  });

  $("#new-claim-form").addEventListener("submit", (e) => {
    const submitter = e.submitter;
    if (submitter && submitter.value === "cancel") return;
    e.preventDefault();
    if (!(submitter && submitter.value === "ok")) return;
    if (!state.currentTopicId) return;

    const fd = new FormData(e.target);
    const text = String(fd.get("text") || "").trim();
    if (!text) return;

    const cid = uid("c");
    if (!state.claims[state.currentTopicId]) state.claims[state.currentTopicId] = [];
    state.claims[state.currentTopicId].push({
      id: cid,
      text,
      reason: String(fd.get("reason") || "").trim(),
      votesTrue: 0,
      votesFalse: 0,
    });
    state.evidence[cid] = [];
    state.comments[cid] = [];

    const topic = state.topics.find((t) => t.id === state.currentTopicId);
    if (topic) {
      topic.updatedAt = "방금";
      topic.participants += 1;
    }

    e.target.reset();
    $("#claim-dialog").close();
    renderTopic(state.currentTopicId);
  });
}

bind();
renderHome();
showView("home");
