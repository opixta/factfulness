/** Tunable rate limits — enforced on server; documented defaults. */
export const RATE_LIMITS = {
  votePerUserPerMinute: 30,
  trustPerUserPerMinute: 60,
  commentPerUserPerMinute: 20,
  topicCreatePerUserPerHour: 5,
  claimCreatePerUserPerHour: 20,
  evidenceCreatePerUserPerHour: 30,
} as const;
