import { TRUST_MIN } from "./config";
import type { EvidenceInput } from "./types";

export function hasEvidenceSource(e: EvidenceInput): boolean {
  return Boolean(e.url?.trim()) || Boolean(e.fileId);
}

/** C1 (URL or file) + C2 (trust >= TRUST_MIN). Neutral never counts toward fact score. */
export function isEvidenceEligible(evidence: EvidenceInput): boolean {
  return (
    evidence.stance !== "neutral" &&
    hasEvidenceSource(evidence) &&
    evidence.trust >= TRUST_MIN
  );
}

export function filterEligibleEvidence(evidence: EvidenceInput[]): EvidenceInput[] {
  return evidence.filter(isEvidenceEligible);
}
