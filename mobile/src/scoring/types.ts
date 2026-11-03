export type Stance = "true" | "false" | "neutral";

export type FactStatus = "pending" | "fact" | "lie" | "split";

export interface EvidenceInput {
  id: string;
  url: string;
  stance: Stance;
  trust: number;
}

export interface OpinionResult {
  pct: number;
  total: number;
  trueShare: number;
}

export interface FactScoreResult {
  status: FactStatus;
  factPct: number | null;
  eligibleTrue: number;
  eligibleFalse: number;
  wTrue: number;
  wFalse: number;
  gatePassed: boolean;
  reasons: string[];
  ruleVersion: string;
}
