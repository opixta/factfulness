import { Platform } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import type { NotificationPrefs } from "@/config/notifications";
import { shouldRegisterForVerdictPush } from "@/notifications/verdictPush";

const PUSH_TOKEN_KEY = "@factfulness/push-token-dev";

export async function registerPushNotificationsStub(
  prefs: NotificationPrefs,
): Promise<string | null> {
  if (process.env.NODE_ENV === "test") {
    return null;
  }
  if (!shouldRegisterForVerdictPush(prefs)) {
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    return null;
  }

  try {
    const Notifications = await import("expo-notifications");
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      return null;
    }
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("verdict", {
        name: "Verdict updates",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const token = await Notifications.getExpoPushTokenAsync();
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token.data);
    return token.data;
  } catch {
    return null;
  }
}

export async function getStoredPushTokenDev(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}
