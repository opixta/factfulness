/** Default notification preferences — sync with server `users.notify_verdict_change`. */
export const DEFAULT_NOTIFICATION_PREFS = {
  notifyVerdictChange: true,
} as const;

export type NotificationPrefs = {
  notifyVerdictChange: boolean;
};
