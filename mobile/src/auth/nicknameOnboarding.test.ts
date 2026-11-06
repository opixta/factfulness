import { describe, expect, it } from "vitest";

import { needsNicknameOnboarding } from "@/auth/nicknameOnboardingPolicy";

describe("needsNicknameOnboarding", () => {
  const base = {
    profileReady: true,
    supabaseEnabled: false,
    hasSession: false,
    remoteProfileLoaded: true,
  };

  it("requires nickname when local profile missing", () => {
    expect(needsNicknameOnboarding(null, base)).toBe(true);
  });

  it("passes when local nickname valid", () => {
    expect(
      needsNicknameOnboarding({ userId: "u1", nickname: "checker" }, base),
    ).toBe(false);
  });

  it("waits for remote profile when Supabase session active", () => {
    expect(
      needsNicknameOnboarding(
        { userId: "u1", nickname: "" },
        {
          ...base,
          supabaseEnabled: true,
          hasSession: true,
          remoteProfileLoaded: false,
        },
      ),
    ).toBe(false);
  });

  it("requires nickname after Supabase login when unset", () => {
    expect(
      needsNicknameOnboarding(
        { userId: "u1", nickname: "" },
        {
          ...base,
          supabaseEnabled: true,
          hasSession: true,
          remoteProfileLoaded: true,
        },
      ),
    ).toBe(true);
  });

  it("skips onboarding when server confirmed nickname", () => {
    expect(
      needsNicknameOnboarding(
        { userId: "u1", nickname: "nick", nicknameConfirmed: true },
        {
          ...base,
          apiMode: true,
          serverNicknameConfirmed: true,
        },
      ),
    ).toBe(false);
  });

  it("requires nickname when server says not confirmed", () => {
    expect(
      needsNicknameOnboarding(
        { userId: "u1", nickname: "" },
        {
          ...base,
          apiMode: true,
          remoteProfileLoaded: true,
          serverNicknameConfirmed: false,
        },
      ),
    ).toBe(true);
  });

  it("skips when logged out with Supabase configured", () => {
    expect(needsNicknameOnboarding(null, { ...base, supabaseEnabled: true })).toBe(
      false,
    );
  });
});
