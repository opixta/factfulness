export interface VoteCounts {
  votesTrue: number;
  votesFalse: number;
}

export function opinionScore(claim: VoteCounts): {
  pct: number;
  total: number;
  trueShare: number;
} {
  const total = claim.votesTrue + claim.votesFalse;
  if (!total) return { pct: 0, total, trueShare: 0 };
  const trueShare = claim.votesTrue / total;
  return { pct: Math.round(trueShare * 100), total, trueShare };
}
