import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { isApiMode, isSupabaseAuthEnabled } from "@/api/config";
import { setDevProfileGetter } from "@/auth/devProfileBridge";
import {
  navigateToNicknameOnboarding,
  needsNicknameOnboarding,
} from "@/auth/nicknameOnboarding";
import {
  PROFILE_STORAGE_KEY,
  validateNickname,
  type LocalUserProfile,
} from "@/data/userProfile";
import type { ApiUserProfile } from "@/data/types";
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

function profileFromServerMe(me: ApiUserProfile): LocalUserProfile {
  return {
    userId: me.externalId,
    nickname: me.nicknameConfirmed ? me.displayName : "",
    nicknameConfirmed: me.nicknameConfirmed,
  };
}

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<LocalUserProfile | null>(null);
  const [serverNicknameConfirmed, setServerNicknameConfirmed] = useState<boolean | undefined>(
    undefined,
  );
  const [ready, setReady] = useState(false);
  const [remoteProfileLoaded, setRemoteProfileLoaded] = useState(
    !isSupabaseAuthEnabled() && !isApiMode(),
  );
  const onboardingNavigated = useRef(false);
  const { repo, ready: repoReady, data } = useFactfulness();
  const { session, supabaseEnabled } = useAuth();
  const apiMode = isApiMode();

  useEffect(() => {
    void (async () => {
      try {
        if (!apiMode) {
          const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
          if (raw) {
            setProfile(JSON.parse(raw) as LocalUserProfile);
          }
        }
      } finally {
        setReady(true);
      }
    })();
  }, [apiMode]);

  useEffect(() => {
    setDevProfileGetter(() =>
      profile?.nickname
        ? { externalId: profile.userId, displayName: profile.nickname }
        : null,
    );
  }, [profile]);

  const applyRemoteMe = (me: ApiUserProfile | null | undefined) => {
    if (!me) {
      setServerNicknameConfirmed(undefined);
      return;
    }
    setServerNicknameConfirmed(me.nicknameConfirmed);
    setProfile(profileFromServerMe(me));
  };

  useEffect(() => {
    if (data.userProfile) {
      applyRemoteMe(data.userProfile);
      setRemoteProfileLoaded(true);
    }
  }, [data.userProfile]);

  useEffect(() => {
    if (!session) {
      setRemoteProfileLoaded(!supabaseEnabled && !apiMode);
      if (supabaseEnabled) {
        setProfile(null);
        setServerNicknameConfirmed(undefined);
      }
      onboardingNavigated.current = false;
      return;
    }
    if (!repoReady || !isApiRepository(repo)) {
      setRemoteProfileLoaded(true);
      return;
    }
    if (data.userProfile) return;
    setRemoteProfileLoaded(false);
    void repo
      .fetchMe()
      .then((me) => applyRemoteMe(me))
      .catch(() => {
        setProfile({ userId: session.user.id, nickname: "" });
        setServerNicknameConfirmed(false);
      })
      .finally(() => setRemoteProfileLoaded(true));
  }, [repo, repoReady, session, supabaseEnabled, data.userProfile]);

  useEffect(() => {
    if (!repoReady || !profile || !apiMode) return;
    if (supabaseEnabled && !session) return;
    if (!profile.nickname?.trim()) return;
    repo.setLocalUser(profile.userId, profile.nickname);
  }, [repo, repoReady, profile, apiMode, supabaseEnabled, session]);

  useEffect(() => {
    if (!repoReady || !apiMode || supabaseEnabled) return;
    if (remoteProfileLoaded) return;
    if (!isApiRepository(repo)) return;
    setRemoteProfileLoaded(false);
    void repo
      .fetchMe()
      .then((me) => applyRemoteMe(me))
      .catch(() => {})
      .finally(() => setRemoteProfileLoaded(true));
  }, [repo, repoReady, apiMode, supabaseEnabled, remoteProfileLoaded]);

  useEffect(() => {
    const should = needsNicknameOnboarding(profile, {
      profileReady: ready,
      supabaseEnabled,
      hasSession: Boolean(session),
      remoteProfileLoaded,
      serverNicknameConfirmed,
      apiMode,
    });
    if (!should) {
      onboardingNavigated.current = false;
      return;
    }
    if (onboardingNavigated.current) return;
    onboardingNavigated.current = true;
    navigateToNicknameOnboarding();
  }, [
    ready,
    profile,
    supabaseEnabled,
    session,
    remoteProfileLoaded,
    serverNicknameConfirmed,
    apiMode,
  ]);

  const setNickname = async (nickname: string): Promise<string | null> => {
    const err = validateNickname(nickname);
    if (err) return err;
    const trimmed = nickname.trim();
    const userId = profile?.userId ?? session?.user.id ?? newUserId();
    const next: LocalUserProfile = {
      userId,
      nickname: trimmed,
      nicknameConfirmed: true,
    };
    if (!apiMode) {
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
    }
    setProfile(next);
    setServerNicknameConfirmed(true);
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
