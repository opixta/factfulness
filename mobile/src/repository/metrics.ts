import type { AppData, ClaimScoreHistoryEntry } from "@/data/types";
import type { Claim } from "@/data/types";
import type { Evidence } from "@/data/types";
import { evidenceInputsFromList } from "@/scoring/evidenceInput";
import { factScore, opinionScore } from "@/scoring";

export function touchTopicActivity(data: AppData, topicId: string, userId: string): void {
  const topic = data.topics.find((t) => t.id === topicId);
  if (!topic) return;
  topic.updatedAt = new Date().toISOString();
  recordTopicParticipant(data, topicId, userId);
}

export function appendClaimScoreHistory(
  data: AppData,
  claimId: string,
  claim: Claim,
  evidence: Evidence[],
): ClaimScoreHistoryEntry {
  const op = opinionScore(claim);
  const fact = factScore(evidenceInputsFromList(evidence));
  const entry: ClaimScoreHistoryEntry = {
    computedAt: new Date().toISOString(),
    ruleVersion: fact.ruleVersion,
    opinionPct: op.pct,
    votesTrue: claim.votesTrue,
    votesFalse: claim.votesFalse,
    factStatus: fact.status,
    factPct: fact.factPct,
    wTrue: fact.wTrue,
    wFalse: fact.wFalse,
    eligibleTrue: fact.eligibleTrue,
    eligibleFalse: fact.eligibleFalse,
    gatePassed: fact.gatePassed,
    gateReasons: [...fact.reasons],
  };
  if (!data.claimScoreHistory[claimId]) {
    data.claimScoreHistory[claimId] = [];
  }
  data.claimScoreHistory[claimId].unshift(entry);
  return entry;
}

export function recordTopicParticipant(data: AppData, topicId: string, userId: string): void {
  if (!data.topicParticipantUserIds[topicId]) {
    data.topicParticipantUserIds[topicId] = [];
  }
  const list = data.topicParticipantUserIds[topicId];
  if (!list.includes(userId)) {
    list.push(userId);
  }
  const topic = data.topics.find((t) => t.id === topicId);
  if (topic) {
    topic.participants = list.length;
  }
}
