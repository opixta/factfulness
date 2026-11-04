import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Screen } from "@/components/layout";
import { PrimaryButton } from "@/components/ui";
import { useUserProfile } from "@/context/UserProfileContext";
import { NICKNAME_MAX, NICKNAME_MIN } from "@/data/userProfile";
import { Colors, Fonts, Spacing } from "@/theme/brand";

/** Stub onboarding after Supabase login — local nickname until API enforces uniqueness. */
export default function OnboardingNicknameScreen() {
  const { setNickname } = useUserProfile();
  const [nick, setNick] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const err = await setNickname(nick);
    if (err) {
      setError(err);
      return;
    }
    router.back();
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.wrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text style={styles.title}>닉네임 설정</Text>
        <Text style={styles.lede}>
          Supabase 로그인 후 표시할 닉네임입니다. 서버 연동 시 전역 중복 검사가 적용됩니다.
        </Text>
        <Text style={styles.label}>
          {NICKNAME_MIN}–{NICKNAME_MAX}자 · 한글/영문/숫자/_
        </Text>
        <TextInput
          value={nick}
          onChangeText={setNick}
          style={styles.input}
          autoCapitalize="none"
          placeholder="예: fact_checker"
          placeholderTextColor={Colors.inkSoft}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label="시작하기" onPress={() => void submit()} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: Spacing.lg, justifyContent: "center", gap: Spacing.md },
  title: { fontFamily: Fonts.display, fontSize: 26, color: Colors.ink },
  lede: { fontFamily: Fonts.ui, fontSize: 15, color: Colors.inkSoft, lineHeight: 22 },
  label: { fontFamily: Fonts.uiMedium, fontSize: 13, color: Colors.inkSoft },
  input: {
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 10,
    padding: Spacing.md,
    fontFamily: Fonts.ui,
    backgroundColor: Colors.white,
  },
  error: { fontFamily: Fonts.ui, color: Colors.coral, fontSize: 13 },
});
