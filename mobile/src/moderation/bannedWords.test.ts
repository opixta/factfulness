import { describe, expect, it } from "vitest";

import {
  findBannedWord,
  isCommentAllowed,
  normalizeModerationText,
  PLACEHOLDER_BANNED_WORDS,
} from "@/moderation/bannedWords";

describe("bannedWords", () => {
  it("normalizes case and unicode", () => {
    expect(normalizeModerationText("  Hello\u200BWorld  ")).toBe("helloworld");
  });

  it("detects placeholder banned substring", () => {
    expect(findBannedWord("please spamword here")?.matched).toBe("spamword");
  });

  it("allows clean comment", () => {
    expect(isCommentAllowed("발전량 기준으로 보면 False 쪽이 설득력 있어요.")).toBe(true);
  });

  it("uses custom list when provided", () => {
    expect(findBannedWord("badterm", ["badterm"])).not.toBeNull();
    expect(findBannedWord("ok", PLACEHOLDER_BANNED_WORDS)).toBeNull();
  });
});
