/** Production rate limits (decided) — mirror in server env; see BACKEND.md §10. */
export const RATE_LIMITS = {
  votePerUserPerMinute: 30,
  trustPerUserPerMinute: 60,
  commentPerUserPerMinute: 20,
  topicCreatePerUserPerHour: 5,
  claimCreatePerUserPerHour: 20,
  evidenceCreatePerUserPerHour: 30,
} as const;
