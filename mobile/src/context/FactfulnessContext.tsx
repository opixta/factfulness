import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { AppData } from "@/data/types";
import { LocalFactfulnessRepository } from "@/repository/LocalRepository";
import type { FactfulnessRepository } from "@/repository/types";
import { evidenceInputsFromList } from "@/scoring/evidenceInput";
import { factScore, opinionScore } from "@/scoring";

interface FactfulnessContextValue {
  ready: boolean;
  repo: FactfulnessRepository;
  data: AppData;
  refresh: () => void;
}

const FactfulnessContext = createContext<FactfulnessContextValue | null>(null);

export function FactfulnessProvider({ children }: { children: React.ReactNode }) {
  const [repo, setRepo] = useState<FactfulnessRepository | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    void LocalFactfulnessRepository.create().then((instance) => {
      setRepo(instance);
      unsub = instance.subscribe(refresh);
    });
    return () => unsub?.();
  }, [refresh]);

  const value = useMemo((): FactfulnessContextValue | null => {
    if (!repo) return null;
    void tick;
    return {
      ready: true,
      repo,
      data: repo.getData(),
      refresh,
    };
  }, [repo, tick, refresh]);

  if (!value) return null;

  return (
    <FactfulnessContext.Provider value={value}>{children}</FactfulnessContext.Provider>
  );
}

export function useFactfulness(): FactfulnessContextValue {
  const ctx = useContext(FactfulnessContext);
  if (!ctx) {
    throw new Error("useFactfulness must be used within FactfulnessProvider");
  }
  return ctx;
}

export function useClaimScores(claimId: string) {
  const { repo } = useFactfulness();
  const found = repo.findClaim(claimId);
  const evidence = repo.getEvidence(claimId);
  if (!found) return null;
  const { claim } = found;
  const op = opinionScore(claim);
  const fact = factScore(evidenceInputsFromList(evidence));
  return { claim, op, fact, evidence };
}
