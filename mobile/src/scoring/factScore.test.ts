import { describe, expect, it } from "vitest";

import { seedData } from "@/data/seed";
import {
  FACT_THRESHOLD,
  factScore,
  isEvidenceEligible,
  MIN_ELIGIBLE_SAME_DIR,
  TRUST_MIN,
} from "@/scoring";

function evidenceForClaim(claimId: string) {
  return (seedData.evidence[claimId] ?? []).map((e) => ({
    id: e.id,
    url: e.url,
    stance: e.stance,
    trust: e.trust,
  }));
}

describe("golden fixtures", () => {
  it("c1 → lie (eligible False evidence dominates)", () => {
    const result = factScore(evidenceForClaim("c1"));
    expect(result.status).toBe("lie");
    expect(result.gatePassed).toBe(true);
    expect(result.eligibleFalse).toBeGreaterThanOrEqual(MIN_ELIGIBLE_SAME_DIR);
  });

  it("c2 → fact (eligible True evidence dominates)", () => {
    const result = factScore(evidenceForClaim("c2"));
    expect(result.status).toBe("fact");
    expect(result.gatePassed).toBe(true);
    expect(result.eligibleTrue).toBeGreaterThanOrEqual(MIN_ELIGIBLE_SAME_DIR);
  });

  it("c3 → pending (not enough eligible same-direction evidence)", () => {
    const result = factScore(evidenceForClaim("c3"));
    expect(result.status).toBe("pending");
    expect(result.gatePassed).toBe(false);
  });
});

describe("edge cases", () => {
  it("returns pending when no evidence", () => {
    const result = factScore([]);
    expect(result.status).toBe("pending");
    expect(result.reasons.some((r) => r.includes("C1·C2"))).toBe(true);
  });

  it("trust below TRUST_MIN is not eligible", () => {
    expect(
      isEvidenceEligible({
        id: "x",
        url: "https://example.com",
        stance: "true",
        trust: TRUST_MIN - 1,
      }),
    ).toBe(false);
  });

  it("neutral stance is never eligible for fact scoring", () => {
    expect(
      isEvidenceEligible({
        id: "n",
        url: "https://example.com",
        stance: "neutral",
        trust: 10,
      }),
    ).toBe(false);
  });

  it("split when eligible but below FACT_THRESHOLD", () => {
    const result = factScore([
      { id: "a", url: "https://a.com", stance: "true", trust: 3 },
      { id: "b", url: "https://b.com", stance: "true", trust: 3 },
      { id: "c", url: "https://c.com", stance: "false", trust: 3 },
      { id: "d", url: "https://d.com", stance: "false", trust: 3 },
    ]);
    expect(result.status).toBe("split");
    expect(result.factPct).not.toBeNull();
    expect((result.factPct ?? 0) / 100).toBeLessThan(FACT_THRESHOLD);
  });

  it("C3 counts distinct domains only (same domain twice = one toward MIN)", () => {
    const result = factScore([
      { id: "a", url: "https://www.example.com/a", stance: "false", trust: 10 },
      { id: "b", url: "https://example.com/b", stance: "false", trust: 10 },
      { id: "c", url: "https://other.org", stance: "true", trust: 3 },
    ]);
    expect(result.eligibleFalse).toBe(1);
    expect(result.status).toBe("pending");
  });

  it("same-domain trust sums into one weight bucket", () => {
    const result = factScore([
      { id: "a", url: "https://a.com/1", stance: "true", trust: 8 },
      { id: "b", url: "https://a.com/2", stance: "true", trust: 7 },
      { id: "c", url: "https://b.com", stance: "false", trust: 3 },
      { id: "d", url: "https://c.com", stance: "false", trust: 3 },
    ]);
    expect(result.wTrue).toBe(15);
    expect(result.eligibleTrue).toBe(1);
    expect(result.status).toBe("split");
  });

  it("neutral does not contribute to weights or domain counts", () => {
    const result = factScore([
      { id: "n", url: "https://n.com", stance: "neutral", trust: 50 },
      { id: "t1", url: "https://t1.com", stance: "true", trust: 10 },
      { id: "t2", url: "https://t2.com", stance: "true", trust: 10 },
    ]);
    expect(result.status).toBe("fact");
    expect(result.wTrue).toBe(20);
    expect(result.wFalse).toBe(0);
  });
});
