/**
 * Client-side comment moderation (UX). Server reloads backend/config/banned_words.txt.
 * Word list: LDNOOBW en+ko (CC BY 4.0) — see third_party/ldnoobw/ATTRIBUTION.md
 */
import { BANNED_WORDS } from "@/moderation/bannedWords.generated";

export { BANNED_WORDS };

export function normalizeModerationText(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Latin-script terms use word boundaries; Hangul/mixed terms use substring (see BACKEND §11.1). */
export function termUsesWordBoundary(term: string): boolean {
  const w = normalizeModerationText(term);
  return /^[\x00-\x7F]+$/.test(w);
}

export function normalizedTextMatchesTerm(
  normalizedText: string,
  term: string,
): boolean {
  const w = normalizeModerationText(term);
  if (!w) return false;
  if (termUsesWordBoundary(w)) {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(normalizedText);
  }
  if (w.length < 2) return false;
  return normalizedText.includes(w);
}

export interface BannedWordMatch {
  matched: string;
}

/** Returns first banned hit, or null if clean. */
export function findBannedWord(
  text: string,
  wordList: readonly string[] = BANNED_WORDS,
): BannedWordMatch | null {
  const normalized = normalizeModerationText(text);
  if (!normalized) return null;
  for (const word of wordList) {
    if (normalizedTextMatchesTerm(normalized, word)) {
      return { matched: word };
    }
  }
  return null;
}

export function isCommentAllowed(text: string): boolean {
  return findBannedWord(text) === null;
}
