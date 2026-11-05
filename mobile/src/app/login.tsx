import { router, type Href } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { isSupabaseAuthEnabled } from "@/api/config";
import { Screen } from "@/components/layout";
import { GhostButton, PrimaryButton } from "@/components/ui";
import { getSupabaseClient } from "@/lib/supabase";
import { Colors, Fonts, Spacing } from "@/theme/brand";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isSupabaseAuthEnabled()) {
    return (
      <Screen style={styles.centered}>
        <Text style={styles.title}>Supabase가 설정되지 않았습니다</Text>
        <Text style={styles.hint}>
          EXPO_PUBLIC_SUPABASE_URL 과 EXPO_PUBLIC_SUPABASE_ANON_KEY 를 .env에 추가하거나, API
          dev 모드(X-Dev 헤더)를 사용하세요.
        </Text>
        <GhostButton label="뒤로" onPress={() => router.back()} />
      </Screen>
    );
  }

  const sendOtp = async () => {
    setError(null);
    setBusy(true);
    try {
      const sb = getSupabaseClient();
      if (!sb) throw new Error("No client");
      const { error: err } = await sb.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (err) throw err;
      setOtpSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "OTP 전송 실패");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    setBusy(true);
    try {
      const sb = getSupabaseClient();
      if (!sb) throw new Error("No client");
      const { error: err } = await sb.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });
      if (err) throw err;
      router.replace("/(tabs)" as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "코드 확인 실패");
    } finally {
      setBusy(false);
    }
  };

  const signInPassword = async () => {
    setError(null);
    setBusy(true);
    try {
      const sb = getSupabaseClient();
      if (!sb) throw new Error("No client");
      const { error: err } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;
      router.replace("/(tabs)" as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그인 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>로그인</Text>
          <Text style={styles.hint}>
            투표·추천·댓글·제안을 하려면 로그인이 필요합니다. 이메일 OTP(6자리 코드)를
            권장합니다.
          </Text>

          <Text style={styles.label}>이메일</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            placeholderTextColor={Colors.inkSoft}
          />

          {!usePassword ? (
            <>
              {!otpSent ? (
                <PrimaryButton label="인증 코드 받기" onPress={() => void sendOtp()} disabled={busy} />
              ) : (
                <>
                  <Text style={styles.label}>이메일로 받은 6자리 코드</Text>
                  <TextInput
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    style={styles.input}
                    placeholderTextColor={Colors.inkSoft}
                  />
                  <PrimaryButton label="코드 확인" onPress={() => void verifyOtp()} disabled={busy} />
                </>
              )}
              <View style={{ marginTop: Spacing.md }}>
                <GhostButton label="비밀번호로 로그인" onPress={() => setUsePassword(true)} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.label}>비밀번호</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                placeholderTextColor={Colors.inkSoft}
              />
              <PrimaryButton label="로그인" onPress={() => void signInPassword()} disabled={busy} />
              <View style={{ marginTop: Spacing.md }}>
                <GhostButton label="이메일 OTP로 돌아가기" onPress={() => setUsePassword(false)} />
              </View>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={{ marginTop: Spacing.lg }}>
            <GhostButton label="취소" onPress={() => router.back()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  centered: { flex: 1, justifyContent: "center", padding: Spacing.lg },
  title: { fontFamily: Fonts.display, fontSize: 24, color: Colors.ink, marginBottom: Spacing.sm },
  hint: { fontFamily: Fonts.ui, fontSize: 14, color: Colors.inkSoft, marginBottom: Spacing.lg, lineHeight: 20 },
  label: { fontFamily: Fonts.uiMedium, fontSize: 13, color: Colors.inkSoft, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 10,
    padding: Spacing.md,
    fontFamily: Fonts.ui,
    backgroundColor: Colors.white,
    marginBottom: Spacing.md,
  },
  error: { fontFamily: Fonts.ui, color: Colors.coral, marginTop: Spacing.sm },
});
