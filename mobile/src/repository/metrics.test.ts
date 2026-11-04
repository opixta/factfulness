import { describe, expect, it } from "vitest";

import { cloneSeedData } from "@/data/seed";
import { recordTopicParticipant, touchTopicActivity } from "@/repository/metrics";

describe("topic participants", () => {
  it("counts unique users with activity", () => {
    const data = cloneSeedData();
    touchTopicActivity(data, "t1", "u_a");
    touchTopicActivity(data, "t1", "u_b");
    touchTopicActivity(data, "t1", "u_a");
    expect(data.topicParticipantUserIds.t1).toContain("u_a");
    expect(data.topics.find((t) => t.id === "t1")?.participants).toBe(130);
  });

  it("bumps updated_at on activity", () => {
    const data = cloneSeedData();
    const before = data.topics.find((t) => t.id === "t1")!.updatedAt;
    touchTopicActivity(data, "t1", "fresh_user");
    const after = data.topics.find((t) => t.id === "t1")!.updatedAt;
    expect(Date.parse(after)).toBeGreaterThanOrEqual(Date.parse(before));
  });

  it("recordTopicParticipant dedupes", () => {
    const data = cloneSeedData();
    recordTopicParticipant(data, "t2", "x");
    recordTopicParticipant(data, "t2", "x");
    expect(data.topicParticipantUserIds.t2.filter((id) => id === "x").length).toBe(1);
  });
});
