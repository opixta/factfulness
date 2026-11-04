import type { Evidence } from "@/data/types";
import type { EvidenceInput, FileScanStatus } from "@/scoring/types";

/** Map app evidence to scoring input (URL and/or uploaded file). */
export function toEvidenceInput(e: Evidence): EvidenceInput {
  const hasFile = Boolean(e.fileName || e.localFileUri);
  const fileScanStatus: FileScanStatus | undefined = hasFile
    ? (e.fileScanStatus ?? "pending")
    : undefined;
  return {
    id: e.id,
    url: e.url?.trim() || undefined,
    fileId: hasFile ? e.id : undefined,
    fileScanStatus,
    stance: e.stance,
    trust: e.trust,
  };
}

export function evidenceInputsFromList(list: Evidence[]): EvidenceInput[] {
  return list.map(toEvidenceInput);
}
