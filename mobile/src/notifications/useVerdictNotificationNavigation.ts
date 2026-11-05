import { router, type Href } from "expo-router";
import { useEffect } from "react";

/** Open claim screen when user taps a verdict push notification. */
export function useVerdictNotificationNavigation(): void {
  useEffect(() => {
    if (process.env.NODE_ENV === "test") return;
    let sub: { remove: () => void } | undefined;
    void (async () => {
      try {
        const Notifications = await import("expo-notifications");
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        sub = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data as {
            claimId?: string;
          };
          if (data.claimId) {
            router.push(`/claim/${data.claimId}` as Href);
          }
        });
      } catch {
        /* expo-notifications unavailable */
      }
    })();
    return () => sub?.remove();
  }, []);
}
