/** Base URL without trailing slash, from EXPO_PUBLIC_API_URL */
export function getApiBaseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function getSupabaseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  return raw || null;
}

export function getSupabaseAnonKey(): string | null {
  const raw = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return raw || null;
}

export function isSupabaseAuthEnabled(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function isApiMode(): boolean {
  return Boolean(getApiBaseUrl());
}
