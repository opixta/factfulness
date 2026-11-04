import type { EvidenceInput } from "./types";

/** Normalize URL host for C3 distinct-source counting (www. stripped, lowercase). */
export function sourceDomain(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return url.trim().toLowerCase();
  }
}

/**
 * C3: count distinct source domains per stance.
 * Same domain twice counts once toward MIN_ELIGIBLE_SAME_DIR.
 */
export function distinctDomainCount(items: EvidenceInput[]): number {
  return new Set(items.map((e) => sourceDomain(e.url))).size;
}

/**
 * Fact weights: per domain, sum trust of all eligible items on that side in that domain,
 * then sum across domains. Same-domain duplicates do not inflate C3 but do combine weight.
 */
export function aggregateDomainWeights(items: EvidenceInput[]): {
  wTrue: number;
  wFalse: number;
} {
  const trueByDomain = new Map<string, number>();
  const falseByDomain = new Map<string, number>();

  for (const e of items) {
    const domain = sourceDomain(e.url);
    if (e.stance === "true") {
      trueByDomain.set(domain, (trueByDomain.get(domain) ?? 0) + e.trust);
    } else if (e.stance === "false") {
      falseByDomain.set(domain, (falseByDomain.get(domain) ?? 0) + e.trust);
    }
  }

  const wTrue = [...trueByDomain.values()].reduce((s, v) => s + v, 0);
  const wFalse = [...falseByDomain.values()].reduce((s, v) => s + v, 0);
  return { wTrue, wFalse };
}
