import type { Evidence } from "@/data/types";

export function simulateLinkPreview(
  url: string,
  evidenceTitle: string,
): Pick<Evidence, "ogTitle" | "ogSiteName" | "ogImageUrl" | "previewStatus"> {
  const trimmed = url.trim();
  if (!trimmed) {
    return { previewStatus: "failed" };
  }
  try {
    const parsed = new URL(trimmed);
    const site = parsed.hostname.replace(/^www\./i, "");
    return {
      ogTitle: evidenceTitle,
      ogSiteName: site,
      ogImageUrl: `https://preview.local/thumb/${encodeURIComponent(site)}.png`,
      previewStatus: "success",
    };
  } catch {
    return { previewStatus: "failed" };
  }
}

export function hasLinkPreview(e: Evidence): boolean {
  return (
    e.previewStatus === "success" &&
    Boolean(e.ogTitle || e.ogSiteName || e.ogImageUrl)
  );
}
