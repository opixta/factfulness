import type { NotificationPrefs } from "@/config/notifications";
import type { Stance } from "@/scoring/types";

export interface Topic {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  participants: number;
  /** ISO8601 — last activity on any claim in topic */
  updatedAt: string;
  /** ISO8601 — topic creation (derived “신규” tag) */
  createdAt: string;
  /** Set when auto-hidden by report threshold or manual moderation */
  hiddenAt?: string;
}

export interface Claim {
  id: string;
  text: string;
  reason?: string;
  votesTrue: number;
  votesFalse: number;
  userVote?: "true" | "false";
  hiddenAt?: string;
}

export interface Evidence {
  id: string;
  title: string;
  url: string;
  stance: Stance;
  summary: string;
  trust: number;
  /** Local / future S3 — image or PDF only, max 10MB when uploaded */
  fileName?: string;
  fileMime?: string;
  localFileUri?: string;
  /** File uploads only — URL evidence ignores scan. Server: ClamAV pipeline. */
  fileScanStatus?: "pending" | "clean" | "infected";
  /** Wayback Machine archive (URL evidence only) */
  archiveUrl?: string;
  archivedAt?: string;
  archiveStatus?: "pending" | "success" | "failed";
  ogTitle?: string;
  ogSiteName?: string;
  ogImageUrl?: string;
  previewStatus?: "pending" | "success" | "failed";
}

export interface Comment {
  id: string;
  author: string;
  body: string;
  vote?: "" | "true" | "false";
  at: string;
  hiddenAt?: string;
}

export interface ClaimScoreHistoryEntry {
  computedAt: string;
  ruleVersion: string;
  opinionPct: number;
  votesTrue: number;
  votesFalse: number;
  factStatus: string;
  factPct: number | null;
  wTrue: number;
  wFalse: number;
  eligibleTrue: number;
  eligibleFalse: number;
  gatePassed: boolean;
  gateReasons: string[];
}

export interface AppData {
  topics: Topic[];
  claims: Record<string, Claim[]>;
  evidence: Record<string, Evidence[]>;
  comments: Record<string, Comment[]>;
  /** Unique user ids with vote/evidence/comment/trust on a topic's claims */
  topicParticipantUserIds: Record<string, string[]>;
  claimScoreHistory: Record<string, ClaimScoreHistoryEntry[]>;
  localUserId: string;
  /** reportKey → distinct reporter user ids (see moderation/reportKeys) */
  contentReports: Record<string, string[]>;
  /** Local dev: last Expo push token from registration stub */
  pushTokenDev?: string;
  notificationPrefs: NotificationPrefs;
}

export const STORAGE_KEY = "@factfulness/app-data-v4";

export const NEW_TOPIC_DAYS = 7;

export const ALLOWED_EVIDENCE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export const MAX_EVIDENCE_FILE_BYTES = 10 * 1024 * 1024;
