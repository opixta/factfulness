import type { EvidenceInput } from "./types";
import { sourceDomain } from "./domain";

/**
 * C3 distinct-source key.
 * - URL evidence: normalized hostname
 * - File evidence (default): `file:{evidenceId}` — each upload is its own source
 *   (PO default; revisit if grouping by uploader is preferred)
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
