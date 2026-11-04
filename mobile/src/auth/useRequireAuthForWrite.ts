import { router, type Href } from "expo-router";

import { canPerformWriteActions, isApiMode, isSupabaseAuthEnabled } from "@/auth/apiAuth";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile } from "@/context/UserProfileContext";

/** Returns a wrapper that sends unauthenticated users to login before write actions (API + Supabase). */
export function useRequireAuthForWrite() {
  const { session, supabaseEnabled } = useAuth();
  const { profile } = useUserProfile();
  const apiMode = isApiMode();

  return (action: () => void) => {
    const ok = canPerformWriteActions(
      apiMode,
      supabaseEnabled || isSupabaseAuthEnabled(),
      Boolean(session),
      Boolean(profile?.nickname),
    );
    if (!ok) {
      if (apiMode && (supabaseEnabled || isSupabaseAuthEnabled()) && !session) {
        router.push("/login" as Href);
        return;
      }
      if (!profile?.nickname) {
        router.push("/onboarding-nickname" as Href);
        return;
      }
      return;
    }
    action();
  };
}
