import { describe, expect, it } from "vitest";

import {
  findBannedWord,
  isCommentAllowed,
  normalizeModerationText,
  normalizedTextMatchesTerm,
  termUsesWordBoundary,
} from "@/moderation/bannedWords";

describe("bannedWords", () => {
  it("normalizes case and unicode", () => {
    expect(normalizeModerationText("  Hello\u200BWorld  ")).toBe("helloworld");
  });

  it("uses word boundaries for ASCII-only terms", () => {
    expect(termUsesWordBoundary("fuck")).toBe(true);
    expect(termUsesWordBoundary("개새끼")).toBe(false);
    expect(normalizedTextMatchesTerm("class assignment", "ass")).toBe(false);
    expect(normalizedTextMatchesTerm("what the fuck", "fuck")).toBe(true);
  });

  it("uses substring match for Korean terms", () => {
    expect(normalizedTextMatchesTerm("이건 개새끼 같은 말이야", "개새끼")).toBe(true);
  });

  it("detects LDNOOBW English term in comment", () => {
    expect(findBannedWord("please fuck off")?.matched).toBe("fuck");
  });

  it("allows clean Korean discussion", () => {
    expect(isCommentAllowed("발전량 기준으로 보면 False 쪽이 설득력 있어요.")).toBe(true);
  });

  it("uses custom list when provided", () => {
    expect(findBannedWord("badterm", ["badterm"])).not.toBeNull();
    expect(findBannedWord("ok", ["badterm"])).toBeNull();
  });
});
