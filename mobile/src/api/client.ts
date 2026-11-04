import { ApiRequestError } from "@/api/errors";
import { resolveApiAuth, type ApiAuthContext } from "@/auth/apiAuth";

export type DevAuthHeaders = {
  externalId: string;
  displayName: string;
};

export class FactfulnessApiClient {
  constructor(
    private readonly baseUrl: string,
    private getAuth: () => ApiAuthContext,
  ) {}

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers as Record<string, string> | undefined),
    };
    const auth = this.getAuth();
    if (auth.bearerToken) {
      headers.Authorization = `Bearer ${auth.bearerToken}`;
    } else if (auth.dev) {
      headers["X-Dev-User-External-Id"] = auth.dev.externalId;
      headers["X-Dev-Display-Name"] = auth.dev.displayName;
    }

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    } catch (err) {
      throw new ApiRequestError(
        err instanceof Error ? err.message : "Network request failed",
        0,
      );
    }

    if (!res.ok) {
      let detail: string | undefined;
      try {
        const body = (await res.json()) as { detail?: unknown };
        if (typeof body.detail === "string") {
          detail = body.detail;
        } else if (body.detail && typeof body.detail === "object") {
          const code = (body.detail as { code?: string }).code;
          detail = code ?? JSON.stringify(body.detail);
        }
      } catch {
        detail = await res.text().catch(() => undefined);
      }
      throw new ApiRequestError(`API ${res.status}`, res.status, detail);
    }

    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  }
}

export function buildAuthFromGetter(
  getBearer: () => string | null,
  getDev: () => DevAuthHeaders | null,
): () => ApiAuthContext {
  return () => resolveApiAuth(getBearer, getDev);
}
