import AsyncStorage from "@react-native-async-storage/async-storage";

import { cloneSeedData } from "@/data/seed";
import type { AppData, Claim, Comment, Evidence, Topic } from "@/data/types";
import { STORAGE_KEY } from "@/data/types";
import type { FactfulnessRepository } from "@/repository/types";
import { uid } from "@/repository/types";

export class LocalFactfulnessRepository implements FactfulnessRepository {
  private data: AppData;
  private listeners = new Set<() => void>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor(data: AppData) {
    this.data = data;
  }

  static async create(): Promise<LocalFactfulnessRepository> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        return new LocalFactfulnessRepository(JSON.parse(raw) as AppData);
      }
    } catch {
      // fall through to seed
    }
    return new LocalFactfulnessRepository(cloneSeedData());
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

  getData(): AppData {
    return this.data;
  }

  getTopics(): Topic[] {
    return this.data.topics;
  }

  getTopic(id: string): Topic | undefined {
    return this.data.topics.find((t) => t.id === id);
  }

  getClaims(topicId: string): Claim[] {
    return this.data.claims[topicId] ?? [];
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
    return this.data.comments[claimId] ?? [];
  }

  proposeTopic(input: {
    title: string;
    summary: string;
    firstClaimText: string;
  }): Topic {
    const tid = uid("t");
    const cid = uid("c");
    const topic: Topic = {
      id: tid,
      title: input.title,
      summary: input.summary,
      tags: ["신규"],
      participants: 1,
      updatedAt: "방금",
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
    const topic = this.getTopic(topicId);
    if (topic) {
      topic.updatedAt = "방금";
      topic.participants += 1;
    }
    this.notify();
    return claim;
  }

  castVote(claimId: string, value: "true" | "false"): void {
    const found = this.findClaim(claimId);
    if (!found) return;
    const { claim } = found;
    if (claim.userVote === value) return;
    if (claim.userVote === "true") claim.votesTrue = Math.max(0, claim.votesTrue - 1);
    if (claim.userVote === "false") claim.votesFalse = Math.max(0, claim.votesFalse - 1);
    if (value === "true") claim.votesTrue += 1;
    if (value === "false") claim.votesFalse += 1;
    claim.userVote = value;
    this.notify();
  }

  addTrust(claimId: string, evidenceId: string): void {
    const list = this.data.evidence[claimId] ?? [];
    const item = list.find((x) => x.id === evidenceId);
    if (item) {
      item.trust += 1;
      this.notify();
    }
  }

  addEvidence(
    claimId: string,
    input: Omit<Evidence, "id" | "trust">,
  ): Evidence {
    const item: Evidence = { ...input, id: uid("e"), trust: 0 };
    if (!this.data.evidence[claimId]) this.data.evidence[claimId] = [];
    this.data.evidence[claimId].unshift(item);
    this.notify();
    return item;
  }

  addComment(
    claimId: string,
    input: { body: string; vote?: "" | "true" | "false" },
  ): Comment {
    const vote = input.vote ?? "";
    const item: Comment = {
      id: uid("cm"),
      author: "you",
      body: input.body,
      vote,
      at: "방금",
    };
    if (!this.data.comments[claimId]) this.data.comments[claimId] = [];
    this.data.comments[claimId].unshift(item);

    if (vote === "true" || vote === "false") {
      this.castVote(claimId, vote);
    }
    this.notify();
    return item;
  }
}
