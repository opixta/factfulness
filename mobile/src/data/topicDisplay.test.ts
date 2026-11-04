import { describe, expect, it } from "vitest";

import { isTopicNew, topicDisplayTags } from "@/data/topicDisplay";
import type { Topic } from "@/data/types";

const baseTopic: Topic = {
  id: "t",
  title: "x",
  summary: "y",
  tags: ["에너지"],
  participants: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("topicDisplay", () => {
  it("shows derived 신규 for 7 days after creation", () => {
    const now = Date.parse("2026-01-10T12:00:00Z");
    const topic = {
      ...baseTopic,
      createdAt: "2026-01-08T12:00:00Z",
    };
    expect(isTopicNew(topic, now)).toBe(true);
    expect(topicDisplayTags(topic, now)).toContain("신규");
  });

  it("does not show 신규 after 7 days", () => {
    const now = Date.parse("2026-01-20T12:00:00Z");
    const topic = {
      ...baseTopic,
      createdAt: "2026-01-01T12:00:00Z",
    };
    expect(isTopicNew(topic, now)).toBe(false);
    expect(topicDisplayTags(topic, now)).not.toContain("신규");
  });
});
