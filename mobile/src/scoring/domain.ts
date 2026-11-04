import type { EvidenceInput } from "./types";
import { evidenceSourceKey } from "./sourceKey";

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
 * C3: count distinct source keys per stance.
 */
export function distinctSourceCount(items: EvidenceInput[]): number {
  return new Set(items.map((e) => evidenceSourceKey(e))).size;
}

/**
 * Fact weights: per source key, sum trust, then sum across keys.
 */
export function aggregateSourceWeights(items: EvidenceInput[]): {
  wTrue: number;
  wFalse: number;
} {
  const trueByKey = new Map<string, number>();
  const falseByKey = new Map<string, number>();

  for (const e of items) {
    const key = evidenceSourceKey(e);
    if (e.stance === "true") {
      trueByKey.set(key, (trueByKey.get(key) ?? 0) + e.trust);
    } else if (e.stance === "false") {
      falseByKey.set(key, (falseByKey.get(key) ?? 0) + e.trust);
    }
  }

  const wTrue = [...trueByKey.values()].reduce((s, v) => s + v, 0);
  const wFalse = [...falseByKey.values()].reduce((s, v) => s + v, 0);
  return { wTrue, wFalse };
}

/** @deprecated use distinctSourceCount */
export const distinctDomainCount = distinctSourceCount;

/** @deprecated use aggregateSourceWeights */
export const aggregateDomainWeights = aggregateSourceWeights;
