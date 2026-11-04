from app.scoring.config import (
    FACT_THRESHOLD,
    MIN_ELIGIBLE_SAME_DIR,
    RULE_VERSION,
    TRUST_MIN,
)
from app.scoring.domain import aggregate_source_weights, distinct_source_count
from app.scoring.eligibility import filter_eligible_evidence
from app.scoring.types import EvidenceInput, FactScoreResult


def fact_score(evidence: list[EvidenceInput]) -> FactScoreResult:
    eligible = filter_eligible_evidence(evidence)
    eligible_directional = [e for e in eligible if e.get("stance") != "neutral"]
    eligible_true = [e for e in eligible_directional if e.get("stance") == "true"]
    eligible_false = [e for e in eligible_directional if e.get("stance") == "false"]
    reasons: list[str] = []

    c2pass = len(eligible_directional) > 0
    if not c2pass:
        reasons.append(f"신뢰 추천 ≥{TRUST_MIN}인 출처 자료가 부족합니다 (C1·C2).")

    eligible_true_domains = distinct_source_count(eligible_true)
    eligible_false_domains = distinct_source_count(eligible_false)
    true_ok = eligible_true_domains >= MIN_ELIGIBLE_SAME_DIR
    false_ok = eligible_false_domains >= MIN_ELIGIBLE_SAME_DIR

    if not true_ok and not false_ok:
        reasons.append(
            f"동일 방향 서로 다른 출처 도메인 ≥{MIN_ELIGIBLE_SAME_DIR}개 조건을 충족하지 못했습니다 (C3).",
        )

    w_true, w_false = aggregate_source_weights(eligible_directional)
    w_sum = w_true + w_false

    status: FactScoreResult["status"] = "pending"
    fact_pct: int | None = None

    if w_sum > 0 and (true_ok or false_ok):
        true_share = w_true / w_sum
        fact_pct = round(true_share * 100)

        can_call_true = true_ok and w_true >= w_false
        can_call_false = false_ok and w_false >= w_true

        if not can_call_true and not can_call_false:
            reasons.append(
                "반대 방향 적격 증거가 우세하거나 균형이라 확정할 수 없습니다 (C4).",
            )
            status = "split"
        elif can_call_true and true_share >= FACT_THRESHOLD:
            status = "fact"
            reasons.clear()
        elif can_call_false and (1 - true_share) >= FACT_THRESHOLD:
            status = "lie"
            reasons.clear()
        else:
            status = "split"
            reasons.append(
                f"적격 증거 비중 {fact_pct}% True — 확정 임계값 {round(FACT_THRESHOLD * 100)}% 미달.",
            )

    return {
        "status": status,
        "factPct": fact_pct,
        "eligibleTrue": eligible_true_domains,
        "eligibleFalse": eligible_false_domains,
        "wTrue": w_true,
        "wFalse": w_false,
        "gatePassed": status in ("fact", "lie"),
        "reasons": reasons,
        "ruleVersion": RULE_VERSION,
    }
