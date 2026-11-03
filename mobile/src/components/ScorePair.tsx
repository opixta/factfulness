import type { FactScoreResult } from "@/scoring/types";
import { Colors, Fonts, Radius, Spacing } from "@/theme/brand";
import { StyleSheet, Text, View } from "react-native";

interface ScorePairProps {
  votesTrue: number;
  votesFalse: number;
  opinionPct: number;
  fact: FactScoreResult;
  compact?: boolean;
}

export function factLabel(fact: FactScoreResult): string {
  if (fact.status === "pending") return "미확정";
  if (fact.status === "fact") return `Fact ${fact.factPct}%`;
  if (fact.status === "lie") return `Lie ${100 - (fact.factPct ?? 0)}%`;
  return `경합 ${fact.factPct}% True`;
}

export function ScorePair({ votesTrue, votesFalse, opinionPct, fact, compact }: ScorePairProps) {
  const barClass =
    fact.status === "fact" ? "fact" : fact.status === "lie" ? "lie" : "pending";
  const barWidth =
    fact.factPct == null
      ? 0
      : fact.status === "lie"
        ? 100 - fact.factPct
        : fact.factPct;

  return (
    <View style={styles.row}>
      <View style={styles.box}>
        <Text style={styles.label}>여론 점수</Text>
        <Text style={styles.value}>{opinionPct}% True</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${opinionPct}%` }]} />
        </View>
        {!compact && (
          <Text style={styles.hint}>
            {votesTrue} True · {votesFalse} False
          </Text>
        )}
      </View>
      <View style={styles.box}>
        <Text style={styles.label}>팩트 점수</Text>
        <Text style={[styles.value, styles.valueSm]}>{factLabel(fact)}</Text>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              barClass === "fact" && styles.barFact,
              barClass === "lie" && styles.barLie,
              barClass === "pending" && styles.barPending,
              { width: `${barWidth}%` },
            ]}
          />
        </View>
        <Text style={styles.hint}>
          적격 T{fact.eligibleTrue} / F{fact.eligibleFalse}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: Spacing.md },
  box: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  label: {
    fontFamily: Fonts.uiMedium,
    fontSize: 12,
    color: Colors.inkSoft,
    marginBottom: 4,
  },
  value: {
    fontFamily: Fonts.uiBold,
    fontSize: 18,
    color: Colors.ink,
    marginBottom: Spacing.sm,
  },
  valueSm: { fontSize: 15 },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.paper2,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: Colors.teal,
    borderRadius: 3,
  },
  barFact: { backgroundColor: Colors.leaf },
  barLie: { backgroundColor: Colors.coral },
  barPending: { backgroundColor: Colors.inkSoft, opacity: 0.35 },
  hint: {
    marginTop: Spacing.sm,
    fontFamily: Fonts.ui,
    fontSize: 11,
    color: Colors.inkSoft,
  },
});
