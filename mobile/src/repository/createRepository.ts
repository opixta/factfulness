import { getApiBaseUrl } from "@/api/config";
import { ApiFactfulnessRepository } from "@/repository/ApiRepository";
import { LocalFactfulnessRepository } from "@/repository/LocalRepository";
import type { FactfulnessRepository } from "@/repository/types";

export async function createFactfulnessRepository(
  getBearer: () => string | null = () => null,
): Promise<FactfulnessRepository> {
  const base = getApiBaseUrl();
  if (base) {
    return ApiFactfulnessRepository.create(base, getBearer);
  }
  return LocalFactfulnessRepository.create();
}
