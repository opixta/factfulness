import { router } from "expo-router";
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

import { Screen } from "@/components/layout";
import { GhostButton, PrimaryButton } from "@/components/ui";
import { useFactfulness } from "@/context/FactfulnessContext";
import { Colors, Fonts, Spacing } from "@/theme/brand";

export default function NewTopicScreen() {
  const { repo } = useFactfulness();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [claim, setClaim] = useState("");

  const submit = () => {
    if (!title.trim() || !summary.trim() || !claim.trim()) return;
    void Promise.resolve(
      repo.proposeTopic({
        title: title.trim(),
        summary: summary.trim(),
        firstClaimText: claim.trim(),
      }),
    ).then((topic) => router.replace(`/topic/${topic.id}`));
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>새 토픽 제안</Text>
          <Field label="토픽 제목" value={title} onChangeText={setTitle} />
          <Field label="배경 설명" value={summary} onChangeText={setSummary} multiline />
          <Field label="첫 세부 명제" value={claim} onChangeText={setClaim} />
          <View style={styles.actions}>
            <GhostButton label="취소" onPress={() => router.back()} />
            <PrimaryButton label="제안하기" onPress={submit} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMulti]}
        placeholderTextColor={Colors.inkSoft}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  title: { fontFamily: Fonts.uiBold, fontSize: 22, color: Colors.ink, marginBottom: Spacing.lg },
  field: { marginBottom: Spacing.md },
  label: { fontFamily: Fonts.uiMedium, fontSize: 13, color: Colors.inkSoft, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 10,
    padding: Spacing.md,
    fontFamily: Fonts.ui,
    backgroundColor: Colors.white,
  },
  inputMulti: { minHeight: 90, textAlignVertical: "top" },
  actions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.lg },
});
