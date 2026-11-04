import type { AppData, Claim, Comment, Evidence, Topic } from "@/data/types";
import type { NotificationPrefs } from "@/config/notifications";
import { DEFAULT_NOTIFICATION_PREFS } from "@/config/notifications";
import { FactfulnessApiClient, type DevAuthHeaders } from "@/api/client";
import {
  applyScoresToClaim,
  bootstrapToAppData,
  emptyAppDataShell,
  mapClaim,
  mapComment,
  mapEvidence,
  mapTopic,
  type ApiBootstrap,
  type ApiClaimScores,
  type ApiClaimSummary,
} from "@/api/mappers";
import { ApiRequestError, isNetworkError } from "@/api/errors";
import type { FactfulnessRepository } from "@/repository/types";
import type { ReportTargetType } from "@/moderation/reportKeys";

export type ApiRepositoryError = {
  message: string;
  retryable: boolean;
};

export class ApiFactfulnessRepository implements FactfulnessRepository {
  private data: AppData;
  private listeners = new Set<() => void>();
  private client: FactfulnessApiClient;
  private devAuth: DevAuthHeaders | null = null;
  private onError: ((err: ApiRepositoryError) => void) | null = null;

  private constructor(baseUrl: string, data: AppData) {
    this.data = data;
    this.client = new FactfulnessApiClient(baseUrl, () => this.devAuth);
  }

  static async create(baseUrl: string): Promise<ApiFactfulnessRepository> {
    const repo = new ApiFactfulnessRepository(baseUrl, emptyAppDataShell("api-user"));
    await repo.reload();
    return repo;
  }

  setErrorHandler(handler: ((err: ApiRepositoryError) => void) | null): void {
    this.onError = handler;
  }

  async reload(): Promise<void> {
    try {
      const payload = await this.client.request<ApiBootstrap>("/v1/bootstrap");
      const uid = this.devAuth?.externalId ?? this.data.localUserId;
      this.data = bootstrapToAppData(payload, uid);
      this.notify();
    } catch (err) {
      this.emitError(err);
      throw err;
    }
  }

  private emitError(err: unknown): void {
    if (!this.onError) return;
    const retryable = isNetworkError(err) || (err instanceof ApiRequestError && err.status >= 500);
    const message =
      err instanceof ApiRequestError
        ? err.detail ?? err.message
        : err instanceof Error
          ? err.message
          : "Unknown error";
    this.onError({ message, retryable });
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setLocalUser(userId: string, nickname: string): void {
    this.devAuth = { externalId: userId, displayName: nickname };
    this.data.localUserId = userId;
    void this.client
      .request("/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName: nickname }),
      })
      .then(() => this.reload())
      .catch((err) => this.emitError(err));
    this.notify();
  }

  getData(): AppData {
    return this.data;
  }

  getTopics(): Topic[] {
    return this.data.topics.filter((t) => !t.hiddenAt);
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
      if (claim && !claim.hiddenAt) return { topicId, claim };
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
  }): Promise<Topic> {
    return this.client
      .request<{ topic: Parameters<typeof mapTopic>[0]; firstClaim: ApiClaimSummary }>(
        "/v1/topics",
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      )
      .then((res) => {
        const topic = mapTopic(res.topic);
        const claim = mapClaim(res.firstClaim);
        this.data.topics.unshift(topic);
        this.data.claims[topic.id] = [claim];
        this.data.evidence[claim.id] = [];
        this.data.comments[claim.id] = [];
        this.notify();
        return topic;
      })
      .catch((err) => {
        this.emitError(err);
        throw err;
      });
  }

  proposeClaim(
    topicId: string,
    input: { text: string; reason?: string },
  ): Promise<Claim | null> {
    const text = input.text.trim();
    if (!text) return Promise.resolve(null);
    return this.client
      .request<{ claim: ApiClaimSummary }>(`/v1/topics/${topicId}/claims`, {
        method: "POST",
        body: JSON.stringify({ text, reason: input.reason }),
      })
      .then((res) => {
        const claim = mapClaim(res.claim);
        if (!this.data.claims[topicId]) this.data.claims[topicId] = [];
        this.data.claims[topicId].push(claim);
        this.data.evidence[claim.id] = [];
        this.data.comments[claim.id] = [];
        this.notify();
        return claim;
      })
      .catch((err) => {
        this.emitError(err);
        throw err;
      });
  }

  castVote(claimId: string, value: "true" | "false"): void {
    void this.client
      .request<{ scores: ApiClaimScores }>(`/v1/claims/${claimId}/vote`, {
        method: "PUT",
        body: JSON.stringify({ value }),
      })
      .then((res) => this.applyScores(claimId, res.scores))
      .catch((err) => this.emitError(err));
  }

  addTrust(claimId: string, evidenceId: string): void {
    void this.client
      .request<{ evidence: Parameters<typeof mapEvidence>[0]; scores: ApiClaimScores }>(
        `/v1/evidence/${evidenceId}/trust`,
        { method: "POST", body: "{}" },
      )
      .then((res) => {
        const list = this.data.evidence[claimId] ?? [];
        const idx = list.findIndex((e) => e.id === evidenceId);
        if (idx >= 0) {
          list[idx] = mapEvidence(res.evidence);
        }
        this.applyScores(claimId, res.scores);
      })
      .catch((err) => this.emitError(err));
  }

  addEvidence(
    claimId: string,
    input: Omit<Evidence, "id" | "trust">,
  ): Promise<Evidence> {
    if (input.fileName || input.localFileUri || input.fileMime) {
      return Promise.reject(
        new Error("FILE_EVIDENCE_REQUIRES_R2"),
      );
    }
    return this.client
      .request<{ evidence: Parameters<typeof mapEvidence>[0]; scores: ApiClaimScores }>(
        `/v1/claims/${claimId}/evidence`,
        {
          method: "POST",
          body: JSON.stringify({
            title: input.title,
            url: input.url,
            stance: input.stance,
            summary: input.summary,
          }),
        },
      )
      .then((res) => {
        const item = mapEvidence(res.evidence);
        if (!this.data.evidence[claimId]) this.data.evidence[claimId] = [];
        this.data.evidence[claimId].unshift(item);
        this.applyScores(claimId, res.scores);
        return item;
      })
      .catch((err) => {
        this.emitError(err);
        throw err;
      });
  }

  addComment(
    claimId: string,
    input: { body: string; vote?: "" | "true" | "false" },
  ): Promise<Comment> {
    return this.client
      .request<{ comment: Parameters<typeof mapComment>[0]; scores: ApiClaimScores }>(
        `/v1/claims/${claimId}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ body: input.body, vote: input.vote ?? "" }),
        },
      )
      .then((res) => {
        const item = mapComment(res.comment);
        if (!this.data.comments[claimId]) this.data.comments[claimId] = [];
        this.data.comments[claimId].unshift(item);
        this.applyScores(claimId, res.scores);
        return item;
      })
      .catch((err) => {
        if (err instanceof ApiRequestError && err.detail === "COMMENT_BANNED") {
          throw new Error("COMMENT_BANNED");
        }
        this.emitError(err);
        throw err;
      });
  }

  reportContent(input: {
    targetType: ReportTargetType;
    targetId: string;
    claimId?: string;
    reason?: string;
  }): Promise<{ distinctReports: number; autoHidden: boolean }> {
    return this.client
      .request<{ distinctReports: number; hidden: boolean }>("/v1/content/report", {
        method: "POST",
        body: JSON.stringify({
          targetType: input.targetType,
          targetId: input.targetId,
          reason: input.reason,
        }),
      })
      .then((res) => {
        if (res.hidden) {
          void this.reload();
        }
        return { distinctReports: res.distinctReports, autoHidden: res.hidden };
      })
      .catch((err) => {
        this.emitError(err);
        throw err;
      });
  }

  setPushTokenDev(token: string | null): void {
    this.data.pushTokenDev = token ?? undefined;
    if (!token) return;
    void this.client
      .request("/v1/users/me/push-token", {
        method: "POST",
        body: JSON.stringify({ expoToken: token, platform: "unknown" }),
      })
      .catch((err) => this.emitError(err));
    this.notify();
  }

  getNotificationPrefs(): NotificationPrefs {
    return { ...this.data.notificationPrefs };
  }

  setNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
    return this.client
      .request("/v1/users/me/notification-prefs", {
        method: "PUT",
        body: JSON.stringify(prefs),
      })
      .then(() => {
        this.data.notificationPrefs = { ...prefs };
        this.notify();
      })
      .catch((err) => {
        this.emitError(err);
        throw err;
      });
  }

  private applyScores(claimId: string, scores: ApiClaimScores): void {
    const found = this.findClaim(claimId);
    if (found) {
      applyScoresToClaim(found.claim, scores);
    }
    this.notify();
  }
}

export function isApiRepository(repo: FactfulnessRepository): repo is ApiFactfulnessRepository {
  return repo instanceof ApiFactfulnessRepository;
}
