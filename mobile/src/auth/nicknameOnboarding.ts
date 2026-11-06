import { router, type Href } from "expo-router";

export { needsNicknameOnboarding } from "@/auth/nicknameOnboardingPolicy";

const ONBOARDING_ROUTE = "/onboarding-nickname" as Href;

export function navigateToNicknameOnboarding(): void {
  router.replace(ONBOARDING_ROUTE);
}
