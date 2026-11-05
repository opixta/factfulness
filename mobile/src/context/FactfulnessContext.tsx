import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { AppData } from "@/data/types";
import { isApiMode } from "@/api/config";
import { ConnectionErrorBanner } from "@/components/ConnectionErrorBanner";
import { useAuth } from "@/context/AuthContext";
import {
  isApiRepository,
  type ApiRepositoryError,
} from "@/repository/ApiRepository";
import { createFactfulnessRepository } from "@/repository/createRepository";
import type { FactfulnessRepository } from "@/repository/types";
import { evidenceInputsFromList } from "@/scoring/evidenceInput";
import { factScore, opinionScore } from "@/scoring";
import { syncPushTokenWithApi } from "@/notifications/syncPushToken";

interface FactfulnessContextValue {
  ready: boolean;
  repo: FactfulnessRepository;
  data: AppData;
  refresh: () => void;
  apiMode: boolean;
}

const FactfulnessContext = createContext<FactfulnessContextValue | null>(null);

export function FactfulnessProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, ready: authReady } = useAuth();
  const [repo, setRepo] = useState<FactfulnessRepository | null>(null);
  const [tick, setTick] = useState(0);
  const [loadError, setLoadError] = useState<ApiRepositoryError | null>(null);
  const [initializing, setInitializing] = useState(true);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const retryLoad = useCallback(() => {
    if (!repo || !isApiRepository(repo)) return;
    setLoadError(null);
    void repo.reload().catch((err: unknown) => {
      setLoadError({
        message: err instanceof Error ? err.message : "Load failed",
        retryable: true,
      });
    });
  }, [repo]);

  useEffect(() => {
    if (!authReady) return;
    let unsub: (() => void) | undefined;
    setInitializing(true);
    const tokenSnapshot = () => accessToken;
    void createFactfulnessRepository(tokenSnapshot)
      .then((instance) => {
        setRepo(instance);
        if (isApiRepository(instance)) {
          instance.setErrorHandler((err) => setLoadError(err));
        }
        unsub = instance.subscribe(refresh);
        return syncPushTokenWithApi(instance, instance.getNotificationPrefs());
      })
      .catch((err: unknown) => {
        setLoadError({
          message: err instanceof Error ? err.message : "Could not load data",
          retryable: true,
        });
      })
      .finally(() => setInitializing(false));
    return () => unsub?.();
  }, [accessToken, authReady, refresh]);

  const value = useMemo((): FactfulnessContextValue | null => {
    if (!repo) return null;
    void tick;
    return {
      ready: true,
      repo,
      data: repo.getData(),
      refresh,
      apiMode: isApiMode(),
    };
  }, [repo, tick, refresh]);

  if ((!authReady || initializing) && !value) return null;
  if (!value && loadError) {
    return (
      <ConnectionErrorBanner
        message={loadError.message}
        onRetry={() => {
          setInitializing(true);
          void createFactfulnessRepository(() => accessToken)
            .then((instance) => {
              setRepo(instance);
              setLoadError(null);
            })
            .catch(() =>
              setLoadError({ message: "Could not connect to API", retryable: true }),
            )
            .finally(() => setInitializing(false));
        }}
      />
    );
  }
  if (!value) return null;

  return (
    <FactfulnessContext.Provider value={value}>
      {loadError ? (
        <ConnectionErrorBanner message={loadError.message} onRetry={retryLoad} />
      ) : null}
      {children}
    </FactfulnessContext.Provider>
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
