import { describe, expect, it } from "vitest";

import type { Claim, Topic } from "@/data/types";
import {
  normalizeSearchQuery,
  searchTopicsAndClaims,
  titleMatchesText,
} from "@/search/titleSearch";

const topics: Topic[] = [
  {
    id: "t1",
    title: "재생에너지 OECD",
    summary: "s",
    tags: [],
    participants: 1,
    createdAt: "",
    updatedAt: "",
  },
];

const claims: Record<string, Claim[]> = {
  t1: [
    {
      id: "c1",
      text: "2023년 OECD 평균보다 높다",
      votesTrue: 0,
      votesFalse: 0,
    },
  ],
};

describe("titleSearch", () => {
  it("normalizes unicode for matching", () => {
    expect(normalizeSearchQuery("  OECD  ")).toBe("oecd");
  });

  it("matches topic title and claim text", () => {
    expect(titleMatchesText(topics[0].title, "oecd")).toBe(true);
    const hits = searchTopicsAndClaims(topics, claims, "OECD");
    expect(hits.some((h) => h.topic.id === "t1" && !h.claim)).toBe(true);
    expect(hits.some((h) => h.claim?.id === "c1")).toBe(true);
  });

  it("returns empty when query blank", () => {
    expect(searchTopicsAndClaims(topics, claims, "   ")).toEqual([]);
  });
});
