export type ReportTargetType = "topic" | "claim" | "comment";

export function reportKey(
  targetType: ReportTargetType,
  targetId: string,
  claimId?: string,
): string {
  if (targetType === "comment") {
    if (!claimId) throw new Error("claimId required for comment reports");
    return `comment:${claimId}:${targetId}`;
  }
  return `${targetType}:${targetId}`;
}

export function distinctReporterCount(reporters: readonly string[] | undefined): number {
  if (!reporters?.length) return 0;
  return new Set(reporters).size;
}
