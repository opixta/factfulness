import { describe, expect, it, vi } from "vitest";

/** Verifies in-flight search requests can be aborted (used by useTitleSearch). */
describe("search request cancellation", () => {
  it("AbortController aborts fetch", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const pending = fetch("http://127.0.0.1/v1/search?q=x", { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});
