import { describe, expect, it } from "vitest";

import { evidenceSourceKey } from "@/scoring/sourceKey";
import { distinctSourceCount } from "@/scoring/domain";

describe("evidenceSourceKey / C3 file default", () => {
  it("uses hostname for URL evidence", () => {
    expect(
      evidenceSourceKey({
        id: "e1",
        url: "https://www.Example.com/path",
        stance: "true",
        trust: 3,
      }),
    ).toBe("example.com");
  });

  it("each file id is its own distinct source (PO default)", () => {
    const count = distinctSourceCount([
      { id: "f1", fileId: "f1", stance: "false", trust: 5 },
      { id: "f2", fileId: "f2", stance: "false", trust: 5 },
    ]);
    expect(count).toBe(2);
  });

  it("two files same uploader still count as two sources", () => {
    const keys = [
      evidenceSourceKey({ id: "a", fileId: "a", stance: "true", trust: 3 }),
      evidenceSourceKey({ id: "b", fileId: "b", stance: "true", trust: 3 }),
    ];
    expect(new Set(keys).size).toBe(2);
  });
});
