import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors, Fonts, Spacing } from "@/theme/brand";

export function ConnectionErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{message}</Text>
      <Pressable onPress={onRetry} style={styles.btn}>
        <Text style={styles.btnLabel}>다시 시도</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.line,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  text: { flex: 1, fontFamily: Fonts.ui, fontSize: 13, color: Colors.ink },
  btn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.white,
  },
  btnLabel: { fontFamily: Fonts.uiSemiBold, fontSize: 13, color: Colors.tealDeep },
});
