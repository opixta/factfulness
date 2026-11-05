import { useCallback, useEffect, useRef, useState } from "react";

import { isApiMode } from "@/api/config";
import { ApiRequestError } from "@/api/errors";
import { useFactfulness } from "@/context/FactfulnessContext";
import {
  ApiFactfulnessRepository,
  isApiRepository,
} from "@/repository/ApiRepository";
import { searchTopicsAndClaims, type TitleSearchHit } from "@/search/titleSearch";

import { TITLE_SEARCH_DEBOUNCE_MS } from "@/search/searchConstants";

const DEBOUNCE_MS = TITLE_SEARCH_DEBOUNCE_MS;

export type TitleSearchState = {
  searching: boolean;
  loading: boolean;
  hits: TitleSearchHit[];
  error: string | null;
  hasMore: boolean;
  retry: () => void;
  loadMore: () => void;
};

export function useTitleSearch(query: string): TitleSearchState {
  const { repo } = useFactfulness();
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<TitleSearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const requestGen = useRef(0);

  const trimmed = query.trim();
  const searching = Boolean(trimmed);
  const apiMode = isApiMode() && isApiRepository(repo);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [trimmed]);

  const runLocalSearch = useCallback(() => {
    const topics = repo.getTopics();
    const claimsByTopic: Record<string, ReturnType<typeof repo.getClaims>> = {};
    for (const t of topics) {
      claimsByTopic[t.id] = repo.getClaims(t.id);
    }
    setHits(searchTopicsAndClaims(topics, claimsByTopic, debouncedQuery));
    setError(null);
    setNextCursor(null);
    setLoading(false);
  }, [repo, debouncedQuery]);

  const fetchApi = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (!apiMode || !debouncedQuery) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const gen = ++requestGen.current;
      setLoading(true);
      setError(null);
      try {
        const page = await (repo as ApiFactfulnessRepository).searchTitles(
          debouncedQuery,
          { cursor, signal: controller.signal },
        );
        if (gen !== requestGen.current) return;
        setHits((prev) => (append ? [...prev, ...page.hits] : page.hits));
        setNextCursor(page.nextCursor);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (gen !== requestGen.current) return;
        const msg =
          err instanceof ApiRequestError
            ? err.detail ?? err.message
            : err instanceof Error
              ? err.message
              : "검색 실패";
        setError(msg);
        if (!append) setHits([]);
      } finally {
        if (gen === requestGen.current) setLoading(false);
      }
    },
    [apiMode, debouncedQuery, repo],
  );

  useEffect(() => {
    if (!searching) {
      abortRef.current?.abort();
      setHits([]);
      setError(null);
      setNextCursor(null);
      setLoading(false);
      return;
    }
    if (!apiMode) {
      runLocalSearch();
      return;
    }
    void fetchApi(null, false);
    return () => abortRef.current?.abort();
  }, [searching, apiMode, debouncedQuery, fetchApi, runLocalSearch]);

  const retry = useCallback(() => {
    if (!searching) return;
    if (apiMode) void fetchApi(null, false);
    else runLocalSearch();
  }, [apiMode, debouncedQuery, fetchApi, runLocalSearch, searching]);

  const loadMore = useCallback(() => {
    if (!apiMode || !nextCursor || loading) return;
    void fetchApi(nextCursor, true);
  }, [apiMode, nextCursor, loading, fetchApi]);

  return {
    searching,
    loading: apiMode && searching && loading,
    hits: searching ? hits : [],
    error,
    hasMore: Boolean(nextCursor),
    retry,
    loadMore,
  };
}
