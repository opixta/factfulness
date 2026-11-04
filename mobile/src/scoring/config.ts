/** Scoring rule constants — keep in sync with server `scoring/config.py` when added. */
export const FACT_THRESHOLD = 0.65;
export const TRUST_MIN = 3;
export const MIN_ELIGIBLE_SAME_DIR = 2;

/** Bump when rule logic or constants change (stored on computed scores in backend). */
export const RULE_VERSION = "2026-11-04-v3";

export const scoringConfig = {
  FACT_THRESHOLD,
  TRUST_MIN,
  MIN_ELIGIBLE_SAME_DIR,
  RULE_VERSION,
} as const;
