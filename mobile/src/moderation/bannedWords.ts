/**
 * PLACEHOLDER — not production moderation.
 * Server loads the real list from repo config (see BACKEND.md §11).
 * Keep roughly in sync for client-side UX hints only; server always re-checks.
 */
export const PLACEHOLDER_BANNED_WORDS: readonly string[] = [
  "spamword",
  "욕설예시",
  "hateword",
];

export function normalizeModerationText(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface BannedWordMatch {
  matched: string;
}

/** Returns first banned substring hit, or null if clean. */
export function findBannedWord(
  text: string,
  wordList: readonly string[] = PLACEHOLDER_BANNED_WORDS,
): BannedWordMatch | null {
  const normalized = normalizeModerationText(text);
  if (!normalized) return null;
  for (const word of wordList) {
    const w = normalizeModerationText(word);
    if (w && normalized.includes(w)) {
      return { matched: word };
    }
  }
  return null;
}

export function isCommentAllowed(text: string): boolean {
  return findBannedWord(text) === null;
}
