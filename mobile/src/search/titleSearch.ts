import type { Claim, Topic } from "@/data/types";

export function normalizeSearchQuery(query: string): string {
  return query.normalize("NFKC").trim().toLowerCase();
}

export function titleMatchesText(text: string, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  return normalizeSearchQuery(text).includes(normalizedQuery);
}

export interface TitleSearchHit {
  topic: Topic;
  claim?: Claim;
}

export function searchTopicsAndClaims(
  topics: Topic[],
  claimsByTopic: Record<string, Claim[]>,
  query: string,
): TitleSearchHit[] {
  const q = normalizeSearchQuery(query);
  if (!q) return [];

  const hits: TitleSearchHit[] = [];
  const seenClaim = new Set<string>();

  for (const topic of topics) {
    if (titleMatchesText(topic.title, q)) {
      hits.push({ topic });
    }
    const claims = claimsByTopic[topic.id] ?? [];
    for (const claim of claims) {
      if (titleMatchesText(claim.text, q) && !seenClaim.has(claim.id)) {
        seenClaim.add(claim.id);
        hits.push({ topic, claim });
      }
    }
  }
  return hits;
}
