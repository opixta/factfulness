import { describe, expect, it } from "vitest";

import { cloneSeedData } from "@/data/seed";
import { LocalFactfulnessRepository } from "@/repository/LocalRepository";

describe("LocalRepository addTrust", () => {
  it("does not increment trust on pending file evidence", () => {
    const data = cloneSeedData();
    data.evidence.c1.push({
      id: "fp",
      title: "pending pdf",
      url: "",
      fileName: "x.pdf",
      fileScanStatus: "pending",
      stance: "true",
      summary: "s",
      trust: 2,
    });
    const repo = LocalFactfulnessRepository.createFromData(data);
    repo.setLocalUser("u1", "tester");
    repo.addTrust("c1", "fp");
    expect(repo.getEvidence("c1").find((e) => e.id === "fp")?.trust).toBe(2);
  });

  it("does not increment trust on infected file evidence", () => {
    const data = cloneSeedData();
    data.evidence.c1.push({
      id: "fi",
      title: "bad pdf",
      url: "",
      fileName: "x.pdf",
      fileScanStatus: "infected",
      stance: "true",
      summary: "s",
      trust: 1,
    });
    const repo = LocalFactfulnessRepository.createFromData(data);
    repo.addTrust("c1", "fi");
    expect(repo.getEvidence("c1").find((e) => e.id === "fi")?.trust).toBe(1);
  });
});
