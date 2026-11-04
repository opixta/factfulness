import type { DevAuthHeaders } from "@/api/client";

let devProfileGetter: () => DevAuthHeaders | null = () => null;

export function setDevProfileGetter(getter: () => DevAuthHeaders | null): void {
  devProfileGetter = getter;
}

export function getDevProfileHeaders(): DevAuthHeaders | null {
  return devProfileGetter();
}
