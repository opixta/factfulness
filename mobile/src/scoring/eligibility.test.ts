import { describe, expect, it } from "vitest";

import { seedData } from "@/data/seed";
import { factScore, isEvidenceEligible } from "@/scoring";

function evidenceForClaim(claimId: string) {
  return (seedData.evidence[claimId] ?? []).map((e) => ({
    id: e.id,
    url: e.url,
    stance: e.stance,
    trust: e.trust,
  }));
}

describe("file scan status (C1)", () => {
  it("pending file does not satisfy C1", () => {
    expect(
      isEvidenceEligible({
        id: "f1",
        fileId: "f1",
        fileScanStatus: "pending",
        stance: "true",
        trust: 10,
      }),
    ).toBe(false);
  });

  it("infected file does not satisfy C1", () => {
    expect(
      isEvidenceEligible({
        id: "f1",
        fileId: "f1",
        fileScanStatus: "infected",
        stance: "false",
        trust: 10,
      }),
    ).toBe(false);
  });

  it("clean file satisfies C1 with sufficient trust", () => {
    expect(
      isEvidenceEligible({
        id: "f1",
        fileId: "f1",
        fileScanStatus: "clean",
        stance: "true",
        trust: 3,
      }),
    ).toBe(true);
  });

  it("golden fixtures unchanged (URL-only seed)", () => {
    expect(factScore(evidenceForClaim("c1")).status).toBe("lie");
    expect(factScore(evidenceForClaim("c2")).status).toBe("fact");
    expect(factScore(evidenceForClaim("c3")).status).toBe("pending");
  });
});
