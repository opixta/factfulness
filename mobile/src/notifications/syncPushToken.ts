import type { NotificationPrefs } from "@/config/notifications";
import { registerPushNotificationsStub } from "@/notifications/registerPush";
import type { FactfulnessRepository } from "@/repository/types";

/** Register Expo push token (when prefs allow) and sync to API. */
export async function syncPushTokenWithApi(
  repo: FactfulnessRepository,
  prefs: NotificationPrefs,
): Promise<void> {
  const token = await registerPushNotificationsStub(prefs);
  repo.setPushTokenDev(token);
}
