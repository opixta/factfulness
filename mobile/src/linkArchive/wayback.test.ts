import { describe, expect, it } from "vitest";

import { buildWaybackArchiveUrl } from "@/linkArchive/wayback";

describe("wayback", () => {
  it("builds archive.org snapshot URL", () => {
    const url = buildWaybackArchiveUrl(
      "https://example.com/page",
      new Date("2026-11-04T12:00:00.000Z"),
    );
    expect(url).toContain("web.archive.org/web/");
    expect(url).toContain("https://example.com/page");
  });
});
