export type Stance = "true" | "false" | "neutral";

export type FactStatus = "pending" | "fact" | "lie" | "split";

export type FileScanStatus = "pending" | "clean" | "infected";

export interface EvidenceInput {
  id: string;
  url?: string;
  /** Uploaded file evidence — each id is a distinct C3 source (`file:{fileId}`). */
  fileId?: string;
  /** Required for file C1: only `clean` counts toward fact score (server: ClamAV). */
  fileScanStatus?: FileScanStatus;
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
