import AsyncStorage from "@react-native-async-storage/async-storage";

import { cloneSeedData, migrateAppData } from "@/data/seed";
import type { AppData, Claim, Comment, Evidence, Topic } from "@/data/types";
import { STORAGE_KEY } from "@/data/types";
import type { FactfulnessRepository } from "@/repository/types";
import { uid } from "@/repository/types";
import {
  appendClaimScoreHistory,
  touchTopicActivity,
} from "@/repository/metrics";
import { isCommentAllowed } from "@/moderation/bannedWords";
import { canEndorseTrustEvidence } from "@/moderation/trustEligibility";
import { shouldAutoHideContent } from "@/moderation/autoHide";
import {
  type ReportTargetType,
  distinctReporterCount,
  reportKey,
} from "@/moderation/reportKeys";
import { buildWaybackArchiveUrl } from "@/linkArchive/wayback";
import { simulateLinkPreview } from "@/linkPreview/simulatePreview";
import type { NotificationPrefs } from "@/config/notifications";
import { DEFAULT_NOTIFICATION_PREFS } from "@/config/notifications";

export class LocalFactfulnessRepository implements FactfulnessRepository {
  private data: AppData;
  private listeners = new Set<() => void>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private actorUserId: string;
  private actorNickname: string;

  private constructor(data: AppData) {
    this.data = data;
    this.actorUserId = data.localUserId;
    this.actorNickname = "you";
  }

  static async create(): Promise<LocalFactfulnessRepository> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        return new LocalFactfulnessRepository(migrateAppData(JSON.parse(raw)));
      }
    } catch {
      // fall through to seed
    }
    return new LocalFactfulnessRepository(cloneSeedData());
  }

  /** Tests and storybook: in-memory repo without AsyncStorage. */
  static createFromData(data: AppData): LocalFactfulnessRepository {
    const raw = JSON.parse(JSON.stringify(data)) as Partial<AppData> &
      Record<string, unknown>;
    return new LocalFactfulnessRepository(migrateAppData(raw));
  }

  setLocalUser(userId: string, nickname: string): void {
    this.actorUserId = userId;
    this.actorNickname = nickname;
    this.data.localUserId = userId;
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }, 300);
  }

  private snapshotClaim(claimId: string, topicId: string): void {
    const claim = this.findClaim(claimId)?.claim;
    if (claim) {
      appendClaimScoreHistory(
        this.data,
        claimId,
        claim,
        this.getEvidence(claimId),
      );
    }
  }

  private bumpTopic(claimId: string): string | null {
    const found = this.findClaim(claimId);
    if (!found) return null;
    touchTopicActivity(this.data, found.topicId, this.actorUserId);
    return found.topicId;
  }

  getData(): AppData {
    return this.data;
  }

  getTopics(): Topic[] {
    return this.data.topics.filter((t) => !t.hiddenAt);
  }

  getTopicsIncludingHidden(): Topic[] {
    return this.data.topics;
  }

  getTopic(id: string): Topic | undefined {
    const topic = this.data.topics.find((t) => t.id === id);
    if (topic?.hiddenAt) return undefined;
    return topic;
  }

  getClaims(topicId: string): Claim[] {
    return (this.data.claims[topicId] ?? []).filter((c) => !c.hiddenAt);
  }

  findClaim(claimId: string): { topicId: string; claim: Claim } | null {
    for (const [topicId, list] of Object.entries(this.data.claims)) {
      const claim = list.find((c) => c.id === claimId);
      if (claim) return { topicId, claim };
    }
    return null;
  }

  getEvidence(claimId: string): Evidence[] {
    return this.data.evidence[claimId] ?? [];
  }

  getComments(claimId: string): Comment[] {
    return (this.data.comments[claimId] ?? []).filter((c) => !c.hiddenAt);
  }

  proposeTopic(input: {
    title: string;
    summary: string;
    firstClaimText: string;
  }): Topic {
    const tid = uid("t");
    const cid = uid("c");
    const now = new Date().toISOString();
    const topic: Topic = {
      id: tid,
      title: input.title,
      summary: input.summary,
      tags: [],
      participants: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.data.topics.unshift(topic);
    this.data.claims[tid] = [
      {
        id: cid,
        text: input.firstClaimText,
        votesTrue: 0,
        votesFalse: 0,
      },
    ];
    this.data.evidence[cid] = [];
    this.data.comments[cid] = [];
    this.data.topicParticipantUserIds[tid] = [];
    touchTopicActivity(this.data, tid, this.actorUserId);
    appendClaimScoreHistory(
      this.data,
      cid,
      this.data.claims[tid][0],
      [],
    );
    this.notify();
    return topic;
  }

  proposeClaim(
    topicId: string,
    input: { text: string; reason?: string },
  ): Claim | null {
    const text = input.text.trim();
    if (!text) return null;
    const cid = uid("c");
    const claim: Claim = {
      id: cid,
      text,
      reason: input.reason?.trim() || undefined,
      votesTrue: 0,
      votesFalse: 0,
    };
    if (!this.data.claims[topicId]) this.data.claims[topicId] = [];
    this.data.claims[topicId].push(claim);
    this.data.evidence[cid] = [];
    this.data.comments[cid] = [];
    touchTopicActivity(this.data, topicId, this.actorUserId);
    appendClaimScoreHistory(this.data, cid, claim, []);
    this.notify();
    return claim;
  }

  castVote(claimId: string, value: "true" | "false"): void {
    const found = this.findClaim(claimId);
    if (!found) return;
    const { claim, topicId } = found;
    if (claim.userVote === value) return;
    if (claim.userVote === "true") claim.votesTrue = Math.max(0, claim.votesTrue - 1);
    if (claim.userVote === "false") claim.votesFalse = Math.max(0, claim.votesFalse - 1);
    if (value === "true") claim.votesTrue += 1;
    if (value === "false") claim.votesFalse += 1;
    claim.userVote = value;
    this.bumpTopic(claimId);
    this.snapshotClaim(claimId, found.topicId);
    this.notify();
  }

  addTrust(claimId: string, evidenceId: string): void {
    const found = this.findClaim(claimId);
    if (!found) return;
    const list = this.data.evidence[claimId] ?? [];
    const item = list.find((x) => x.id === evidenceId);
    if (item && canEndorseTrustEvidence(item)) {
      item.trust += 1;
      this.bumpTopic(claimId);
      this.snapshotClaim(claimId, found.topicId);
      this.notify();
    }
  }

  addEvidence(
    claimId: string,
    input: Omit<Evidence, "id" | "trust">,
  ): Evidence {
    const found = this.findClaim(claimId);
    const item: Evidence = { ...input, id: uid("e"), trust: 0 };
    if (item.fileName || item.localFileUri) {
      // Local dev simulates post-scan; API sets pending until ClamAV clean.
      item.fileScanStatus = "clean";
    }
    if (item.url?.trim()) {
      const now = new Date();
      item.archiveStatus = "success";
      item.archivedAt = now.toISOString();
      item.archiveUrl = buildWaybackArchiveUrl(item.url, now);
      Object.assign(item, simulateLinkPreview(item.url, item.title));
    }
    if (!this.data.evidence[claimId]) this.data.evidence[claimId] = [];
    this.data.evidence[claimId].unshift(item);
    if (found) {
      this.bumpTopic(claimId);
      this.snapshotClaim(claimId, found.topicId);
    }
    this.notify();
    return item;
  }

  addComment(
    claimId: string,
    input: { body: string; vote?: "" | "true" | "false" },
  ): Comment {
    if (!isCommentAllowed(input.body)) {
      throw new Error("COMMENT_BANNED");
    }
    const vote = input.vote ?? "";
    const item: Comment = {
      id: uid("cm"),
      author: this.actorNickname,
      body: input.body,
      vote,
      at: "방금",
    };
    if (!this.data.comments[claimId]) this.data.comments[claimId] = [];
    this.data.comments[claimId].unshift(item);

    const found = this.findClaim(claimId);
    if (found) {
      if (vote === "true" || vote === "false") {
        this.castVote(claimId, vote);
      } else {
        this.bumpTopic(claimId);
        this.snapshotClaim(claimId, found.topicId);
      }
    }
    this.notify();
    return item;
  }

  reportContent(input: {
    targetType: ReportTargetType;
    targetId: string;
    claimId?: string;
    reason?: string;
  }): { distinctReports: number; autoHidden: boolean } {
    const key = reportKey(input.targetType, input.targetId, input.claimId);
    if (!this.data.contentReports[key]) {
      this.data.contentReports[key] = [];
    }
    const list = this.data.contentReports[key];
    if (!list.includes(this.actorUserId)) {
      list.push(this.actorUserId);
    }
    const distinctReports = distinctReporterCount(list);
    let autoHidden = false;
    if (shouldAutoHideContent(list)) {
      autoHidden = this.applyAutoHide(input.targetType, input.targetId, input.claimId);
    }
    this.notify();
    return { distinctReports, autoHidden };
  }

  setPushTokenDev(token: string | null): void {
    this.data.pushTokenDev = token ?? undefined;
    this.notify();
  }

  getNotificationPrefs(): NotificationPrefs {
    return { ...this.data.notificationPrefs };
  }

  setNotificationPrefs(prefs: NotificationPrefs): void {
    this.data.notificationPrefs = { ...prefs };
    this.notify();
  }

  private applyAutoHide(
    targetType: ReportTargetType,
    targetId: string,
    claimId?: string,
  ): boolean {
    const now = new Date().toISOString();
    if (targetType === "topic") {
      const topic = this.data.topics.find((t) => t.id === targetId);
      if (!topic || topic.hiddenAt) return Boolean(topic?.hiddenAt);
      topic.hiddenAt = now;
      return true;
    }
    if (targetType === "claim") {
      const found = this.findClaim(targetId);
      if (!found?.claim || found.claim.hiddenAt) return Boolean(found?.claim.hiddenAt);
      found.claim.hiddenAt = now;
      return true;
    }
    if (targetType === "comment" && claimId) {
      const comment = (this.data.comments[claimId] ?? []).find((c) => c.id === targetId);
      if (!comment || comment.hiddenAt) return Boolean(comment?.hiddenAt);
      comment.hiddenAt = now;
      return true;
    }
    return false;
  }
}
