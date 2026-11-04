import type { Evidence } from "@/data/types";
import type { EvidenceInput } from "@/scoring/types";

/** Map app evidence to scoring input (URL and/or uploaded file). */
export function toEvidenceInput(e: Evidence): EvidenceInput {
  const hasFile = Boolean(e.fileName || e.localFileUri);
  return {
    id: e.id,
    url: e.url?.trim() || undefined,
    fileId: hasFile ? e.id : undefined,
    stance: e.stance,
    trust: e.trust,
  };
}

export function evidenceInputsFromList(list: Evidence[]): EvidenceInput[] {
  return list.map(toEvidenceInput);
}
