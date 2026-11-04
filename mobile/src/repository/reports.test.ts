import { describe, expect, it } from "vitest";

import { cloneSeedData } from "@/data/seed";
import { REPORT_AUTO_HIDE_THRESHOLD } from "@/config/moderation";
import { LocalFactfulnessRepository } from "@/repository/LocalRepository";

describe("LocalRepository reportContent", () => {
  it(`auto-hides claim after ${REPORT_AUTO_HIDE_THRESHOLD} distinct reporters`, () => {
    const data = cloneSeedData();
    const repo = LocalFactfulnessRepository.createFromData(data);
    const claimId = "c1";

    for (let i = 0; i < REPORT_AUTO_HIDE_THRESHOLD - 1; i++) {
      repo.setLocalUser(`user_${i}`, `u${i}`);
      const r = repo.reportContent({ targetType: "claim", targetId: claimId });
      expect(r.autoHidden).toBe(false);
      expect(repo.getClaims("t1").some((c) => c.id === claimId)).toBe(true);
    }

    repo.setLocalUser(`user_${REPORT_AUTO_HIDE_THRESHOLD - 1}`, "last");
    const final = repo.reportContent({ targetType: "claim", targetId: claimId });
    expect(final.distinctReports).toBe(REPORT_AUTO_HIDE_THRESHOLD);
    expect(final.autoHidden).toBe(true);
    expect(repo.getClaims("t1").some((c) => c.id === claimId)).toBe(false);
    expect(repo.getData().claims.t1.find((c) => c.id === claimId)?.hiddenAt).toBeTruthy();
  });

  it("does not double-count the same reporter", () => {
    const data = cloneSeedData();
    const repo = LocalFactfulnessRepository.createFromData(data);
    repo.setLocalUser("u1", "one");
    repo.reportContent({ targetType: "claim", targetId: "c2" });
    repo.reportContent({ targetType: "claim", targetId: "c2" });
    expect(repo.getData().contentReports["claim:c2"]?.length).toBe(1);
  });
});
