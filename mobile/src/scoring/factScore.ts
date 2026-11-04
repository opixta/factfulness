import {
  FACT_THRESHOLD,
  MIN_ELIGIBLE_SAME_DIR,
  RULE_VERSION,
  TRUST_MIN,
} from "./config";
import {
  aggregateSourceWeights,
  distinctSourceCount,
} from "./domain";
import { filterEligibleEvidence } from "./eligibility";
import type { EvidenceInput, FactScoreResult } from "./types";

/**
 * Fact gate C3/C4 + threshold — pure function, no framework deps.
 */
export function factScore(evidence: EvidenceInput[]): FactScoreResult {
  const eligible = filterEligibleEvidence(evidence);
  const eligibleDirectional = eligible.filter((e) => e.stance !== "neutral");
  const eligibleTrue = eligibleDirectional.filter((e) => e.stance === "true");
  const eligibleFalse = eligibleDirectional.filter((e) => e.stance === "false");
  const reasons: string[] = [];

  const c2pass = eligibleDirectional.length > 0;
  if (!c2pass) {
    reasons.push(`신뢰 추천 ≥${TRUST_MIN}인 출처 자료가 부족합니다 (C1·C2).`);
  }

  const eligibleTrueDomains = distinctSourceCount(eligibleTrue);
  const eligibleFalseDomains = distinctSourceCount(eligibleFalse);
  const trueOk = eligibleTrueDomains >= MIN_ELIGIBLE_SAME_DIR;
  const falseOk = eligibleFalseDomains >= MIN_ELIGIBLE_SAME_DIR;

  if (!trueOk && !falseOk) {
    reasons.push(
      `동일 방향 서로 다른 출처 도메인 ≥${MIN_ELIGIBLE_SAME_DIR}개 조건을 충족하지 못했습니다 (C3).`,
    );
  }

  const { wTrue, wFalse } = aggregateSourceWeights(eligibleDirectional);
  const wSum = wTrue + wFalse;

  let status: FactScoreResult["status"] = "pending";
  let factPct: number | null = null;

  if (wSum > 0 && (trueOk || falseOk)) {
    const trueShare = wTrue / wSum;
    factPct = Math.round(trueShare * 100);

    const canCallTrue = trueOk && wTrue >= wFalse;
    const canCallFalse = falseOk && wFalse >= wTrue;

    if (!canCallTrue && !canCallFalse) {
      reasons.push(
        "반대 방향 적격 증거가 우세하거나 균형이라 확정할 수 없습니다 (C4).",
      );
      status = "split";
    } else if (canCallTrue && trueShare >= FACT_THRESHOLD) {
      status = "fact";
      reasons.length = 0;
    } else if (canCallFalse && 1 - trueShare >= FACT_THRESHOLD) {
      status = "lie";
      reasons.length = 0;
    } else {
      status = "split";
      reasons.push(
        `적격 증거 비중 ${factPct}% True — 확정 임계값 ${Math.round(FACT_THRESHOLD * 100)}% 미달.`,
      );
    }
  }

  return {
    status,
    factPct,
    eligibleTrue: eligibleTrueDomains,
    eligibleFalse: eligibleFalseDomains,
    wTrue,
    wFalse,
    gatePassed: status === "fact" || status === "lie",
    reasons,
    ruleVersion: RULE_VERSION,
  };
}
