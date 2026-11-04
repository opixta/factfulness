import { router, useLocalSearchParams } from "expo-router";
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

export default function NewClaimScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const { repo } = useFactfulness();
  const topic = repo.getTopic(topicId);
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");

  const submit = () => {
    void Promise.resolve(repo.proposeClaim(topicId, { text, reason })).then((claim) => {
      if (claim) router.back();
    });
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>세부 명제 제안</Text>
          {topic ? (
            <Text style={styles.hint}>토픽: {topic.title}</Text>
          ) : null}
          <Field label="명제 문장" value={text} onChangeText={setText} multiline />
          <Field label="제안 이유 (선택)" value={reason} onChangeText={setReason} multiline />
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
  title: { fontFamily: Fonts.uiBold, fontSize: 22, color: Colors.ink, marginBottom: Spacing.sm },
  hint: {
    fontFamily: Fonts.ui,
    fontSize: 13,
    color: Colors.inkSoft,
    marginBottom: Spacing.lg,
  },
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
