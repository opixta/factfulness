import { getApiBaseUrl, getSupabaseAnonKey, getSupabaseUrl, isApiMode, isSupabaseAuthEnabled } from "@/api/config";

export type ApiAuthContext = {
  bearerToken: string | null;
  dev: { externalId: string; displayName: string } | null;
};

/** Build API auth headers: Supabase Bearer when configured, else dev headers for AUTH_MODE=dev backend. */
export function resolveApiAuth(
  getBearer: () => string | null,
  getDev: () => { externalId: string; displayName: string } | null,
): ApiAuthContext {
  if (isSupabaseAuthEnabled()) {
    return { bearerToken: getBearer(), dev: null };
  }
  return { bearerToken: null, dev: getDev() };
}

export function canPerformWriteActions(
  apiMode: boolean,
  supabaseEnabled: boolean,
  hasSession: boolean,
  hasDevProfile: boolean,
): boolean {
  if (!apiMode) return hasDevProfile;
  if (supabaseEnabled) return hasSession;
  return hasDevProfile;
}

export { getApiBaseUrl, isApiMode, isSupabaseAuthEnabled, getSupabaseUrl, getSupabaseAnonKey };
