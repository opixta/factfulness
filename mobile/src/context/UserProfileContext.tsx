import React, { useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, type Href } from "expo-router";

import {
  PROFILE_STORAGE_KEY,
  validateNickname,
  type LocalUserProfile,
} from "@/data/userProfile";
import { useFactfulness } from "@/context/FactfulnessContext";

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
  const { repo, ready: repoReady } = useFactfulness();

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
        if (raw) {
          setProfile(JSON.parse(raw) as LocalUserProfile);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!repoReady || !profile) return;
    repo.setLocalUser(profile.userId, profile.nickname);
  }, [repo, repoReady, profile]);

  useEffect(() => {
    if (!ready || profile?.nickname) return;
    router.push("/onboarding-nickname" as Href);
  }, [ready, profile?.nickname]);

  const setNickname = async (nickname: string): Promise<string | null> => {
    const err = validateNickname(nickname);
    if (err) return err;
    const next: LocalUserProfile = {
      userId: profile?.userId ?? newUserId(),
      nickname: nickname.trim(),
    };
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
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
