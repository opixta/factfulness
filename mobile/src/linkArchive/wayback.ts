/** Build a Wayback snapshot URL (Save Page Now result shape). */
export function buildWaybackArchiveUrl(originalUrl: string, capturedAt: Date = new Date()): string {
  const trimmed = originalUrl.trim();
  const ts = capturedAt
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  return `https://web.archive.org/web/${ts}/${trimmed}`;
}
