import type { Evidence } from "@/data/types";

/** Trust allowed only when file evidence (if any) has completed scan as clean. */
export function canEndorseTrustEvidence(e: Evidence): boolean {
  const hasFile = Boolean(e.fileName || e.localFileUri);
  if (!hasFile) {
    return true;
  }
  return e.fileScanStatus === "clean";
}

export function trustEndorsementBlockReason(e: Evidence): string | null {
  if (canEndorseTrustEvidence(e)) {
    return null;
  }
  if (e.fileScanStatus === "infected") {
    return "감염으로 거부된 파일에는 추천할 수 없습니다.";
  }
  return "파일 스캔이 완료된 후에만 추천할 수 있습니다.";
}
