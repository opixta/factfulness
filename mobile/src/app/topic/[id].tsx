import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, Screen } from "@/components/layout";
import { ScorePair } from "@/components/ScorePair";
import { StatusBadge } from "@/components/StatusBadge";
import { Pill, PrimaryButton } from "@/components/ui";
import { topicDisplayTags, topicUpdatedLabel } from "@/data/topicDisplay";
import { useFactfulness } from "@/context/FactfulnessContext";
import { factScore, opinionScore } from "@/scoring";
import { evidenceInputsFromList } from "@/scoring/evidenceInput";
import { Colors, Fonts, Spacing } from "@/theme/brand";

export default function TopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo } = useFactfulness();
  const topic = repo.getTopic(id);

  if (!topic) {
    return (
      <Screen style={styles.centered}>
        <Text style={styles.missing}>토픽을 찾을 수 없습니다.</Text>
      </Screen>
    );
  }

  const claims = repo.getClaims(id);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Topic</Text>
        <Text style={styles.title}>{topic.title}</Text>
        <Text style={styles.lede}>{topic.summary}</Text>
        <View style={styles.metaRow}>
          {topicDisplayTags(topic).map((tag) => (
            <Pill key={tag} label={tag} />
          ))}
          <Text style={styles.meta}>
            {topic.participants}명 참여 · 업데이트 {topicUpdatedLabel(topic)}
          </Text>
        </View>

        <View style={styles.sectionHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>세부 명제</Text>
            <Text style={styles.sectionSub}>각 명제는 독립적으로 True / False를 판단합니다.</Text>
          </View>
          <PrimaryButton
            label="제안"
            onPress={() => router.push(`/new-claim/${id}`)}
            style={styles.smallBtn}
          />
        </View>

        {claims.map((c) => {
          const evidence = repo.getEvidence(c.id);
          const op = opinionScore(c);
          const fact = factScore(evidenceInputsFromList(evidence));
          return (
            <Pressable key={c.id} onPress={() => router.push(`/claim/${c.id}`)}>
              <Card>
                <StatusBadge status={fact.status} />
                <Text style={styles.claimText}>{c.text}</Text>
                {c.reason ? <Text style={styles.reason}>{c.reason}</Text> : null}
                <ScorePair
                  votesTrue={c.votesTrue}
                  votesFalse={c.votesFalse}
                  opinionPct={op.pct}
                  fact={fact}
                  compact
                />
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  centered: { justifyContent: "center", alignItems: "center" },
  missing: { fontFamily: Fonts.ui, color: Colors.inkSoft },
  eyebrow: {
    fontFamily: Fonts.uiMedium,
    fontSize: 12,
    color: Colors.teal,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 32,
    color: Colors.ink,
    marginTop: Spacing.sm,
  },
  lede: {
    fontFamily: Fonts.ui,
    fontSize: 15,
    color: Colors.inkSoft,
    marginVertical: Spacing.md,
    lineHeight: 22,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  meta: { fontFamily: Fonts.ui, fontSize: 12, color: Colors.inkSoft },
  sectionHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionTitle: { fontFamily: Fonts.uiBold, fontSize: 20, color: Colors.ink },
  sectionSub: { fontFamily: Fonts.ui, fontSize: 13, color: Colors.inkSoft, marginTop: 4 },
  smallBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  claimText: {
    fontFamily: Fonts.uiSemiBold,
    fontSize: 16,
    color: Colors.ink,
    marginVertical: Spacing.sm,
  },
  reason: { fontFamily: Fonts.ui, fontSize: 13, color: Colors.inkSoft, marginBottom: Spacing.sm },
});
