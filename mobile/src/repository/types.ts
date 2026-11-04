import type { AppData, Claim, Comment, Evidence, Topic } from "@/data/types";

export interface FactfulnessRepository {
  getData(): AppData;
  getTopic(id: string): Topic | undefined;
  getTopics(): Topic[];
  getClaims(topicId: string): Claim[];
  findClaim(claimId: string): { topicId: string; claim: Claim } | null;
  getEvidence(claimId: string): Evidence[];
  getComments(claimId: string): Comment[];

  proposeTopic(input: {
    title: string;
    summary: string;
    firstClaimText: string;
  }): Topic;

  proposeClaim(
    topicId: string,
    input: { text: string; reason?: string },
  ): Claim | null;

  castVote(claimId: string, value: "true" | "false"): void;
  addTrust(claimId: string, evidenceId: string): void;
  addEvidence(
    claimId: string,
    input: Omit<Evidence, "id" | "trust">,
  ): Evidence;
  addComment(
    claimId: string,
    input: { body: string; vote?: "" | "true" | "false" },
  ): Comment;

  /** Local / dev: bind actor for participants + comment author */
  setLocalUser(userId: string, nickname: string): void;

  subscribe(listener: () => void): () => void;
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}
