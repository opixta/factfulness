import { describe, expect, it } from "vitest";

import { cloneSeedData } from "@/data/seed";
import { LocalFactfulnessRepository } from "@/repository/LocalRepository";

describe("notification prefs", () => {
  it("persists notifyVerdictChange toggle", () => {
    const repo = LocalFactfulnessRepository.createFromData(cloneSeedData());
    expect(repo.getNotificationPrefs().notifyVerdictChange).toBe(true);
    repo.setNotificationPrefs({ notifyVerdictChange: false });
    expect(repo.getNotificationPrefs().notifyVerdictChange).toBe(false);
    expect(repo.getData().notificationPrefs.notifyVerdictChange).toBe(false);
  });
});
