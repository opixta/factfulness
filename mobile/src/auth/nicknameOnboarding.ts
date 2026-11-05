import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, type Href } from "expo-router";

import { needsNicknameOnboarding as needsNicknameOnboardingPolicy } from "@/auth/nicknameOnboardingPolicy";

export { needsNicknameOnboardingPolicy as needsNicknameOnboarding };

export const NICKNAME_CONFIRMED_STORAGE_KEY = "@factfulness/nickname-confirmed-v1";

const ONBOARDING_ROUTE = "/onboarding-nickname" as Href;

export async function isNicknameConfirmedForUser(userId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(NICKNAME_CONFIRMED_STORAGE_KEY);
  if (!raw) return false;
  try {
    const ids = JSON.parse(raw) as string[];
    return ids.includes(userId);
  } catch {
    return false;
  }
}

export async function markNicknameConfirmed(userId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(NICKNAME_CONFIRMED_STORAGE_KEY);
  let ids: string[] = [];
  if (raw) {
    try {
      ids = JSON.parse(raw) as string[];
    } catch {
      ids = [];
    }
  }
  if (!ids.includes(userId)) {
    ids.push(userId);
    await AsyncStorage.setItem(NICKNAME_CONFIRMED_STORAGE_KEY, JSON.stringify(ids));
  }
}

export function navigateToNicknameOnboarding(): void {
  router.replace(ONBOARDING_ROUTE);
}
