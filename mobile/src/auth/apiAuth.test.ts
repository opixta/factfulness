import { describe, expect, it, vi } from "vitest";

import { canPerformWriteActions, resolveApiAuth } from "@/auth/apiAuth";

describe("resolveApiAuth", () => {
  it("prefers bearer when supabase enabled", () => {
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    const auth = resolveApiAuth(() => "jwt-token", () => ({
      externalId: "dev",
      displayName: "Dev",
    }));
    expect(auth.bearerToken).toBe("jwt-token");
    expect(auth.dev).toBeNull();
    vi.unstubAllEnvs();
  });

  it("uses dev headers when supabase not configured", () => {
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", "");
    const auth = resolveApiAuth(
      () => null,
      () => ({ externalId: "u1", displayName: "Nick" }),
    );
    expect(auth.bearerToken).toBeNull();
    expect(auth.dev?.displayName).toBe("Nick");
    vi.unstubAllEnvs();
  });
});

describe("canPerformWriteActions", () => {
  it("requires session for api+supabase", () => {
    expect(canPerformWriteActions(true, true, false, true)).toBe(false);
    expect(canPerformWriteActions(true, true, true, false)).toBe(true);
  });

  it("allows local mode with profile", () => {
    expect(canPerformWriteActions(false, false, false, true)).toBe(true);
  });
});
