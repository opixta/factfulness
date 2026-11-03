import { TRUST_MIN } from "./config";
import type { EvidenceInput } from "./types";

/** C1 (URL present) + C2 (trust >= TRUST_MIN). */
export function isEvidenceEligible(evidence: EvidenceInput): boolean {
  return Boolean(evidence.url) && evidence.trust >= TRUST_MIN;
}

export function filterEligibleEvidence(evidence: EvidenceInput[]): EvidenceInput[] {
  return evidence.filter(isEvidenceEligible);
}
