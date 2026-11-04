import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { isSupabaseAuthEnabled } from "@/api/config";
import { setDevProfileGetter } from "@/auth/devProfileBridge";
import {
  isNicknameConfirmedForUser,
  markNicknameConfirmed,
  navigateToNicknameOnboarding,
  needsNicknameOnboarding,
} from "@/auth/nicknameOnboarding";
import {
  PROFILE_STORAGE_KEY,
  validateNickname,
  type LocalUserProfile,
} from "@/data/userProfile";
import { useAuth } from "@/context/AuthContext";
import { useFactfulness } from "@/context/FactfulnessContext";
import { isApiRepository } from "@/repository/ApiRepository";

interface UserProfileContextValue {
  ready: boolean;
  profile: LocalUserProfile | null;
  setNickname: (nickname: string) => Promise<string | null>;
}

const UserProfileContext = React.createContext<UserProfileContextValue | null>(null);

function newUserId(): string {
  return `u_${Math.random().toString(36).slice(2, 10)}`;
}

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<LocalUserProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [remoteProfileLoaded, setRemoteProfileLoaded] = useState(!isSupabaseAuthEnabled());
  const onboardingNavigated = useRef(false);
  const { repo, ready: repoReady } = useFactfulness();
  const { session, supabaseEnabled } = useAuth();

  useEffect(() => {
    void (async () => {
      try {
        if (!isSupabaseAuthEnabled()) {
          const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
          if (raw) {
            setProfile(JSON.parse(raw) as LocalUserProfile);
          }
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    setDevProfileGetter(() =>
      profile?.nickname
        ? { externalId: profile.userId, displayName: profile.nickname }
        : null,
    );
  }, [profile]);

  useEffect(() => {
    if (!session) {
      setRemoteProfileLoaded(!supabaseEnabled);
      if (supabaseEnabled) {
        setProfile(null);
      }
      onboardingNavigated.current = false;
      return;
    }
    if (!repoReady || !isApiRepository(repo)) {
      setRemoteProfileLoaded(true);
      setProfile((prev) => ({
        userId: session.user.id,
        nickname: prev?.nickname ?? "",
      }));
      return;
    }
    setRemoteProfileLoaded(false);
    void (async () => {
      try {
        const me = await repo.fetchMe();
        const confirmed = await isNicknameConfirmedForUser(me.externalId);
        setProfile({
          userId: me.externalId,
          nickname: confirmed ? me.displayName : "",
        });
      } catch {
        setProfile({ userId: session.user.id, nickname: "" });
      } finally {
        setRemoteProfileLoaded(true);
      }
    })();
  }, [repo, repoReady, session, supabaseEnabled]);

  useEffect(() => {
    if (!repoReady || !profile || isSupabaseAuthEnabled()) return;
    repo.setLocalUser(profile.userId, profile.nickname);
  }, [repo, repoReady, profile]);

  useEffect(() => {
    const should = needsNicknameOnboarding(profile, {
      profileReady: ready,
      supabaseEnabled,
      hasSession: Boolean(session),
      remoteProfileLoaded,
    });
    if (!should) {
      onboardingNavigated.current = false;
      return;
    }
    if (onboardingNavigated.current) return;
    onboardingNavigated.current = true;
    navigateToNicknameOnboarding();
  }, [ready, profile, supabaseEnabled, session, remoteProfileLoaded]);

  const setNickname = async (nickname: string): Promise<string | null> => {
    const err = validateNickname(nickname);
    if (err) return err;
    const trimmed = nickname.trim();
    const userId = profile?.userId ?? session?.user.id ?? newUserId();
    const next: LocalUserProfile = { userId, nickname: trimmed };
    if (!isSupabaseAuthEnabled()) {
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
    } else {
      await markNicknameConfirmed(userId);
    }
    setProfile(next);
    if (repoReady) {
      repo.setLocalUser(next.userId, next.nickname);
    }
    return null;
  };

  const value = useMemo(
    () => ({ ready, profile, setNickname }),
    [ready, profile, repoReady],
  );

  return (
    <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>
  );
}

export function useUserProfile(): UserProfileContextValue {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error("useUserProfile must be used within UserProfileProvider");
  }
  return ctx;
}
