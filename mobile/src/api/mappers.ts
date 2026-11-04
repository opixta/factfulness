import type { Claim, Comment, Evidence, Topic } from "@/data/types";
import type { NotificationPrefs } from "@/config/notifications";
import { DEFAULT_NOTIFICATION_PREFS } from "@/config/notifications";

export type ApiFactDto = {
  status: string;
  factPct: number | null;
  wTrue: number;
  wFalse: number;
  eligibleTrue: number;
  eligibleFalse: number;
  gatePassed: boolean;
  reasons: string[];
  ruleVersion: string;
};

export type ApiClaimScores = {
  opinionPct: number;
  votesTrue: number;
  votesFalse: number;
  userVote?: string | null;
  fact: ApiFactDto;
};

export type ApiClaimSummary = {
  id: string;
  text: string;
  reason?: string | null;
  scores: ApiClaimScores;
};

export type ApiTopicListItem = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  participants: number;
  updatedAt: string;
  claimCount: number;
  settledCount: number;
};

export type ApiEvidenceDto = {
  id: string;
  title: string;
  url: string;
  stance: string;
  summary: string;
  trust: number;
  fileMime?: string | null;
  fileSize?: number | null;
  fileName?: string | null;
  scanStatus?: string | null;
  status?: string;
  ogTitle?: string | null;
  ogSiteName?: string | null;
  ogImageUrl?: string | null;
  previewStatus?: string | null;
  archiveUrl?: string | null;
  archiveStatus?: string | null;
};

export type ApiCommentDto = {
  id: string;
  author: string;
  body: string;
  vote?: string | null;
  at: string;
};

export type ApiBootstrap = {
  topics: ApiTopicListItem[];
  claims: Record<string, ApiClaimSummary[]>;
  evidence: Record<string, ApiEvidenceDto[]>;
  comments: Record<string, ApiCommentDto[]>;
  notificationPrefs: NotificationPrefs;
};

export function mapTopic(row: ApiTopicListItem): Topic {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    tags: row.tags ?? [],
    participants: row.participants,
    updatedAt: row.updatedAt,
    createdAt: row.updatedAt,
  };
}

export function mapClaim(summary: ApiClaimSummary): Claim {
  const uv = summary.scores.userVote;
  return {
    id: summary.id,
    text: summary.text,
    reason: summary.reason ?? undefined,
    votesTrue: summary.scores.votesTrue,
    votesFalse: summary.scores.votesFalse,
    userVote: uv === "true" || uv === "false" ? uv : undefined,
  };
}

export function mapEvidence(row: ApiEvidenceDto): Evidence {
  return {
    id: row.id,
    title: row.title,
    url: row.url ?? "",
    stance: row.stance as Evidence["stance"],
    summary: row.summary,
    trust: row.trust,
    fileName: row.fileName ?? undefined,
    fileMime: row.fileMime ?? undefined,
    fileScanStatus: row.scanStatus as Evidence["fileScanStatus"],
    ogTitle: row.ogTitle ?? undefined,
    ogSiteName: row.ogSiteName ?? undefined,
    ogImageUrl: row.ogImageUrl ?? undefined,
    previewStatus: row.previewStatus as Evidence["previewStatus"],
    archiveUrl: row.archiveUrl ?? undefined,
    archiveStatus: row.archiveStatus as Evidence["archiveStatus"],
  };
}

export function mapComment(row: ApiCommentDto): Comment {
  let vote: Comment["vote"] = "";
  if (row.vote === "true" || row.vote === "false") vote = row.vote;
  return {
    id: row.id,
    author: row.author,
    body: row.body,
    vote,
    at: row.at,
  };
}

export function emptyAppDataShell(localUserId: string): import("@/data/types").AppData {
  return {
    topics: [],
    claims: {},
    evidence: {},
    comments: {},
    topicParticipantUserIds: {},
    claimScoreHistory: {},
    localUserId,
    contentReports: {},
    notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
  };
}

export function bootstrapToAppData(
  payload: ApiBootstrap,
  localUserId: string,
): import("@/data/types").AppData {
  const topics = payload.topics.map(mapTopic);
  const claims: Record<string, Claim[]> = {};
  const evidence: Record<string, Evidence[]> = {};
  const comments: Record<string, Comment[]> = {};

  for (const [topicId, rows] of Object.entries(payload.claims)) {
    claims[topicId] = rows.map(mapClaim);
  }
  for (const [claimId, rows] of Object.entries(payload.evidence)) {
    evidence[claimId] = rows.map(mapEvidence);
  }
  for (const [claimId, rows] of Object.entries(payload.comments)) {
    comments[claimId] = rows.map(mapComment);
  }

  return {
    topics,
    claims,
    evidence,
    comments,
    topicParticipantUserIds: {},
    claimScoreHistory: {},
    localUserId,
    contentReports: {},
    notificationPrefs: payload.notificationPrefs ?? { ...DEFAULT_NOTIFICATION_PREFS },
  };
}

export function applyScoresToClaim(claim: Claim, scores: ApiClaimScores): void {
  claim.votesTrue = scores.votesTrue;
  claim.votesFalse = scores.votesFalse;
  const uv = scores.userVote;
  claim.userVote = uv === "true" || uv === "false" ? uv : undefined;
}
