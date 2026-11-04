import { describe, expect, it, vi } from "vitest";

import { FactfulnessApiClient, buildAuthFromGetter } from "@/api/client";

describe("FactfulnessApiClient auth headers", () => {
  it("sends Authorization bearer when token present", async () => {
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", "anon");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new FactfulnessApiClient(
      "http://127.0.0.1:8000",
      buildAuthFromGetter(() => "access-abc", () => null),
    );
    await client.request("/v1/bootstrap");
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit?][];
    const headers = calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer access-abc");
    expect(headers["X-Dev-User-External-Id"]).toBeUndefined();
    vi.unstubAllEnvs();
  });

  it("sends dev headers when no bearer", async () => {
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", "");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new FactfulnessApiClient(
      "http://127.0.0.1:8000",
      buildAuthFromGetter(() => null, () => ({ externalId: "u1", displayName: "n1" })),
    );
    await client.request("/v1/bootstrap");
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit?][];
    const headers = calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers["X-Dev-User-External-Id"]).toBe("u1");
    expect(headers.Authorization).toBeUndefined();
    vi.unstubAllEnvs();
  });
});
