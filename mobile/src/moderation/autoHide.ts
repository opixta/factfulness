import { REPORT_AUTO_HIDE_THRESHOLD } from "@/config/moderation";
import { distinctReporterCount } from "@/moderation/reportKeys";

export function shouldAutoHideContent(
  reporters: readonly string[] | undefined,
  threshold: number = REPORT_AUTO_HIDE_THRESHOLD,
): boolean {
  return distinctReporterCount(reporters) >= threshold;
}
