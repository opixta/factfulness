import type { FactStatus } from "@/scoring/types";
import { Colors, Fonts, Radius } from "@/theme/brand";
import { StyleSheet, Text, View } from "react-native";

const labels: Record<FactStatus, string> = {
  pending: "검증 중",
  fact: "Fact",
  lie: "Lie",
  split: "경합",
};

export function StatusBadge({ status }: { status: FactStatus }) {
  return (
    <View style={[styles.badge, styles[status]]}>
      <Text style={[styles.text, status === "fact" || status === "lie" ? styles.textLight : null]}>
        {labels[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  text: {
    fontFamily: Fonts.uiSemiBold,
    fontSize: 12,
  },
  textLight: { color: Colors.white },
  pending: { backgroundColor: Colors.paper2 },
  fact: { backgroundColor: Colors.leaf, borderColor: Colors.leaf },
  lie: { backgroundColor: Colors.coral, borderColor: Colors.coral },
  split: { backgroundColor: "rgba(217, 196, 160, 0.45)" },
});
