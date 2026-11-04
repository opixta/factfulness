/** Base URL without trailing slash, from EXPO_PUBLIC_API_URL */
export function getApiBaseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function isApiMode(): boolean {
  return Boolean(getApiBaseUrl());
}
