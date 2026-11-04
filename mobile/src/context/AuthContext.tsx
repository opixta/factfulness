import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { isSupabaseAuthEnabled } from "@/api/config";
import { getSupabaseClient, type Session } from "@/lib/supabase";

interface AuthContextValue {
  ready: boolean;
  supabaseEnabled: boolean;
  session: Session | null;
  accessToken: string | null;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabaseEnabled = isSupabaseAuthEnabled();
  const [ready, setReady] = useState(!supabaseEnabled);
  const [session, setSession] = useState<Session | null>(null);

  const refreshSession = useCallback(async () => {
    const sb = getSupabaseClient();
    if (!sb) {
      setSession(null);
      setReady(true);
      return;
    }
    const { data } = await sb.auth.getSession();
    setSession(data.session);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!supabaseEnabled) return;
    void refreshSession();
    const sb = getSupabaseClient();
    if (!sb) return;
    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabaseEnabled, refreshSession]);

  const signOut = useCallback(async () => {
    const sb = getSupabaseClient();
    if (sb) await sb.auth.signOut();
    setSession(null);
  }, []);

  const value = useMemo(
    (): AuthContextValue => ({
      ready,
      supabaseEnabled,
      session,
      accessToken: session?.access_token ?? null,
      signOut,
      refreshSession,
    }),
    [ready, supabaseEnabled, session, signOut, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
