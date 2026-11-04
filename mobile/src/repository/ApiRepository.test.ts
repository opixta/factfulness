import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiFactfulnessRepository } from "@/repository/ApiRepository";
import { setDevProfileGetter } from "@/auth/devProfileBridge";

const bootstrapPayload = {
  topics: [
    {
      id: "t-1",
      title: "Topic",
      summary: "Sum",
      tags: [],
      participants: 1,
      updatedAt: "2026-01-01T00:00:00Z",
      claimCount: 1,
      settledCount: 0,
    },
  ],
  claims: {
    "t-1": [
      {
        id: "c-1",
        text: "Claim text",
        scores: {
          opinionPct: 50,
          votesTrue: 1,
          votesFalse: 1,
          userVote: null,
          fact: {
            status: "pending",
            factPct: null,
            wTrue: 0,
            wFalse: 0,
            eligibleTrue: 0,
            eligibleFalse: 0,
            gatePassed: false,
            reasons: [],
            ruleVersion: "2026-11-04-v3",
          },
        },
      },
    ],
  },
  evidence: { "c-1": [] },
  comments: { "c-1": [] },
  notificationPrefs: { notifyVerdictChange: true },
};

describe("ApiFactfulnessRepository", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads bootstrap into getData()", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/v1/bootstrap")) {
        return new Response(JSON.stringify(bootstrapPayload), { status: 200 });
      }
      throw new Error(`unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const repo = await ApiFactfulnessRepository.create("http://127.0.0.1:8000");
    expect(repo.getTopics()).toHaveLength(1);
    expect(repo.findClaim("c-1")?.claim.text).toBe("Claim text");
  });

  it("sends dev auth headers on writes", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/v1/bootstrap")) {
        return new Response(JSON.stringify(bootstrapPayload), { status: 200 });
      }
      if (url.endsWith("/v1/claims/c-1/vote") && init?.method === "PUT") {
        return new Response(
          JSON.stringify({
            scores: {
              opinionPct: 100,
              votesTrue: 2,
              votesFalse: 1,
              userVote: "true",
              fact: bootstrapPayload.claims["t-1"][0].scores.fact,
            },
          }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const repo = await ApiFactfulnessRepository.create("http://127.0.0.1:8000", () => null);
    setDevProfileGetter(() => ({ externalId: "u_test", displayName: "Tester" }));
    repo.setLocalUser("u_test", "Tester");
    repo.castVote("c-1", "true");

    await vi.waitFor(() => {
      const voteCall = fetchMock.mock.calls.find((c) =>
        String(c[0]).endsWith("/v1/claims/c-1/vote"),
      );
      expect(voteCall).toBeTruthy();
      const headers = voteCall?.[1]?.headers as Record<string, string>;
      expect(headers["X-Dev-User-External-Id"]).toBe("u_test");
      expect(headers["X-Dev-Display-Name"]).toBe("Tester");
    });
  });

  it("uploads file evidence via presigned flow", async () => {
    let scanPending = true;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/v1/bootstrap")) {
        return new Response(JSON.stringify(bootstrapPayload), { status: 200 });
      }
      if (String(url).includes("/file/upload-url") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            evidenceId: "ev-file-1",
            uploadUrl: "https://minio/upload",
            uploadHeaders: { "Content-Type": "application/pdf" },
          }),
          { status: 201 },
        );
      }
      if (url === "https://minio/upload" && init?.method === "PUT") {
        return new Response("", { status: 200 });
      }
      if (String(url).includes("/file/complete")) {
        return new Response(JSON.stringify({ scanStatus: "pending" }), { status: 200 });
      }
      if (String(url).endsWith("/v1/evidence/ev-file-1/file/scan-status")) {
        if (scanPending) {
          scanPending = false;
          return new Response(
            JSON.stringify({
              scanStatus: "pending",
              evidence: {
                id: "ev-file-1",
                title: "f",
                url: "",
                stance: "true",
                summary: "s",
                trust: 0,
                fileMime: "application/pdf",
                scanStatus: "pending",
              },
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            scanStatus: "clean",
            evidence: {
              id: "ev-file-1",
              title: "f",
              url: "",
              stance: "true",
              summary: "s",
              trust: 0,
              fileMime: "application/pdf",
              scanStatus: "clean",
            },
          }),
          { status: 200 },
        );
      }
      if (String(url).startsWith("file://local")) {
        return new Response(new Blob(["pdf-bytes"], { type: "application/pdf" }), {
          status: 200,
        });
      }
      return new Response("{}", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const repo = await ApiFactfulnessRepository.create("http://127.0.0.1:8000");
    const item = await repo.addEvidence("c-1", {
      title: "f",
      url: "",
      stance: "true",
      summary: "s",
      fileName: "doc.pdf",
      fileMime: "application/pdf",
      localFileUri: "file://local/doc.pdf",
    });
    expect(item.fileScanStatus).toBe("clean");
  });
});
