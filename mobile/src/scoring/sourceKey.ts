import type { EvidenceInput } from "./types";
import { sourceDomain } from "./domain";

/**
 * C3 distinct-source key.
 * - URL evidence: normalized hostname
 * - File evidence: `file:{evidenceId}` — **each upload is its own distinct C3 source** (decided)
 */
export function evidenceSourceKey(e: EvidenceInput): string {
  if (e.fileId) {
    return `file:${e.fileId}`;
  }
  if (e.url) {
    return sourceDomain(e.url);
  }
  return "unknown";
}
