import { ALLOWED_EVIDENCE_MIMES, MAX_EVIDENCE_FILE_BYTES } from "@/data/types";

export type FileUploadSlot = {
  evidenceId: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
};

export async function requestFileUploadSlot(
  apiRequest: <T>(path: string, init?: RequestInit) => Promise<T>,
  claimId: string,
  input: {
    title: string;
    summary: string;
    stance: string;
    fileName: string;
    fileMime: string;
    fileSize: number;
  },
): Promise<FileUploadSlot> {
  const res = await apiRequest<{
    evidenceId: string;
    uploadUrl: string;
    uploadHeaders: Record<string, string>;
  }>(`/v1/claims/${claimId}/evidence/file/upload-url`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return {
    evidenceId: res.evidenceId,
    uploadUrl: res.uploadUrl,
    uploadHeaders: res.uploadHeaders ?? {},
  };
}

export async function putFileToPresignedUrl(
  localUri: string,
  uploadUrl: string,
  headers: Record<string, string>,
): Promise<void> {
  const blob = await (await fetch(localUri)).blob();
  if (blob.size > MAX_EVIDENCE_FILE_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: blob,
    headers,
  });
  if (!res.ok) {
    throw new Error(`UPLOAD_FAILED_${res.status}`);
  }
}

export async function completeFileUpload(
  apiRequest: <T>(path: string, init?: RequestInit) => Promise<T>,
  claimId: string,
  evidenceId: string,
): Promise<void> {
  await apiRequest(`/v1/claims/${claimId}/evidence/${evidenceId}/file/complete`, {
    method: "POST",
    body: "{}",
  });
}

export async function pollScanStatus(
  apiRequest: <T>(path: string, init?: RequestInit) => Promise<T>,
  evidenceId: string,
  maxAttempts = 20,
  delayMs = 500,
): Promise<{ scanStatus: string; evidence: unknown }> {
  for (let i = 0; i < maxAttempts; i += 1) {
    const body = await apiRequest<{ scanStatus: string; evidence: unknown }>(
      `/v1/evidence/${evidenceId}/file/scan-status`,
    );
    if (body.scanStatus === "clean" || body.scanStatus === "infected") {
      return body;
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error("SCAN_TIMEOUT");
}

export function assertAllowedMime(mime: string | undefined): void {
  if (!mime || !ALLOWED_EVIDENCE_MIMES.includes(mime as (typeof ALLOWED_EVIDENCE_MIMES)[number])) {
    throw new Error("INVALID_FILE_TYPE");
  }
}
