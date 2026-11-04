import { describe, expect, it } from "vitest";

import {
  hasLinkPreview,
  simulateLinkPreview,
} from "@/linkPreview/simulatePreview";
import type { Evidence } from "@/data/types";

describe("simulateLinkPreview", () => {
  it("derives site name and preview fields from URL", () => {
    const p = simulateLinkPreview("https://www.iea.org/report", "IEA report");
    expect(p.previewStatus).toBe("success");
    expect(p.ogSiteName).toBe("iea.org");
    expect(p.ogTitle).toBe("IEA report");
    expect(p.ogImageUrl).toContain("iea.org");
  });

  it("detects preview-ready evidence", () => {
    const e: Evidence = {
      id: "e1",
      title: "t",
      url: "https://x.com",
      stance: "true",
      summary: "s",
      trust: 0,
      ogTitle: "t",
      ogSiteName: "x.com",
      previewStatus: "success",
    };
    expect(hasLinkPreview(e)).toBe(true);
  });
});
