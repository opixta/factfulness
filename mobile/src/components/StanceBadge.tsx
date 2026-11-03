import type { Stance } from "@/scoring/types";
import { Colors, Fonts, Radius } from "@/theme/brand";
import { StyleSheet, Text, View } from "react-native";

export function StanceBadge({ stance }: { stance: Stance }) {
  const label =
    stance === "true" ? "True 지지" : stance === "false" ? "False 지지" : "중립";
  return (
    <View style={[styles.badge, styles[stance]]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

export function EligibleBadge({ eligible }: { eligible: boolean }) {
  return (
    <View style={[styles.badge, eligible ? styles.eligible : styles.ineligible]}>
      <Text style={styles.text}>{eligible ? "적격 (팩트 반영)" : "미적격"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  text: {
    fontFamily: Fonts.uiMedium,
    fontSize: 11,
    color: Colors.inkSoft,
  },
  true: { backgroundColor: "rgba(47, 125, 74, 0.12)" },
  false: { backgroundColor: "rgba(196, 92, 62, 0.12)" },
  neutral: { backgroundColor: Colors.paper2 },
  eligible: { backgroundColor: "rgba(13, 107, 99, 0.1)", borderColor: Colors.teal },
  ineligible: { backgroundColor: Colors.paper2 },
});
