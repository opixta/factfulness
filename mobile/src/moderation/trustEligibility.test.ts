import { describe, expect, it } from "vitest";

import {
  canEndorseTrustEvidence,
  trustEndorsementBlockReason,
} from "@/moderation/trustEligibility";
import type { Evidence } from "@/data/types";

const urlEvidence: Evidence = {
  id: "e1",
  title: "t",
  url: "https://example.com",
  stance: "true",
  summary: "s",
  trust: 0,
};

describe("trustEligibility", () => {
  it("allows trust on URL-only evidence", () => {
    expect(canEndorseTrustEvidence(urlEvidence)).toBe(true);
  });

  it("denies trust when file scan pending", () => {
    const file: Evidence = {
      ...urlEvidence,
      id: "f1",
      url: "",
      fileName: "a.pdf",
      fileScanStatus: "pending",
    };
    expect(canEndorseTrustEvidence(file)).toBe(false);
    expect(trustEndorsementBlockReason(file)).toMatch(/스캔/);
  });

  it("denies trust when file infected", () => {
    const file: Evidence = {
      ...urlEvidence,
      id: "f2",
      url: "",
      fileName: "bad.pdf",
      fileScanStatus: "infected",
    };
    expect(canEndorseTrustEvidence(file)).toBe(false);
  });

  it("allows trust when file clean", () => {
    const file: Evidence = {
      ...urlEvidence,
      id: "f3",
      url: "",
      fileName: "ok.pdf",
      fileScanStatus: "clean",
    };
    expect(canEndorseTrustEvidence(file)).toBe(true);
  });
});
