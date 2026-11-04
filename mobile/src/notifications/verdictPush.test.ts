import { describe, expect, it } from "vitest";

import { DEFAULT_NOTIFICATION_PREFS } from "@/config/notifications";
import {
  shouldRegisterForVerdictPush,
  shouldSendVerdictChangePush,
} from "@/notifications/verdictPush";

describe("verdictPush prefs", () => {
  it("allows push when notifyVerdictChange is true", () => {
    expect(shouldSendVerdictChangePush(DEFAULT_NOTIFICATION_PREFS)).toBe(true);
    expect(shouldRegisterForVerdictPush(DEFAULT_NOTIFICATION_PREFS)).toBe(true);
  });

  it("blocks push when user opts out", () => {
    const off = { notifyVerdictChange: false };
    expect(shouldSendVerdictChangePush(off)).toBe(false);
    expect(shouldRegisterForVerdictPush(off)).toBe(false);
  });
});
