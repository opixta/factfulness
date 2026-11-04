import { validateNickname, type LocalUserProfile } from "@/data/userProfile";

export function needsNicknameOnboarding(
  profile: LocalUserProfile | null,
  opts: {
    profileReady: boolean;
    supabaseEnabled: boolean;
    hasSession: boolean;
    remoteProfileLoaded: boolean;
  },
): boolean {
  if (!opts.profileReady) return false;
  if (opts.supabaseEnabled && !opts.hasSession) return false;
  if (opts.supabaseEnabled && opts.hasSession && !opts.remoteProfileLoaded) return false;
  if (!profile?.nickname?.trim()) return true;
  return validateNickname(profile.nickname) !== null;
}
