import { describe, expect, it } from "vitest";

import { TITLE_SEARCH_DEBOUNCE_MS } from "@/search/searchConstants";

describe("title search API debounce", () => {
  it("uses ~300ms debounce", () => {
    expect(TITLE_SEARCH_DEBOUNCE_MS).toBe(300);
  });
});
