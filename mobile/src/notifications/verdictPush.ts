import type { NotificationPrefs } from "@/config/notifications";

/** Server skips Expo send when false (after OS permission granted). */
export function shouldSendVerdictChangePush(prefs: NotificationPrefs): boolean {
  return prefs.notifyVerdictChange;
}

/** Mobile: only register token when user wants verdict pushes. */
export function shouldRegisterForVerdictPush(prefs: NotificationPrefs): boolean {
  return prefs.notifyVerdictChange;
}
