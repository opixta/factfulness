import { describe, expect, it } from "vitest";

import { needsNicknameOnboarding } from "@/auth/nicknameOnboardingPolicy";

describe("needsNicknameOnboarding server flag", () => {
  it("trusts server nicknameConfirmed over local empty nickname", () => {
    expect(
      needsNicknameOnboarding(
        { userId: "u1", nickname: "" },
        {
          profileReady: true,
          supabaseEnabled: true,
          hasSession: true,
          remoteProfileLoaded: true,
          serverNicknameConfirmed: true,
          apiMode: true,
        },
      ),
    ).toBe(false);
  });
});
