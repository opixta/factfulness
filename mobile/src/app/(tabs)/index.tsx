import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, Screen } from "@/components/layout";
import { GhostButton, Pill, PrimaryButton } from "@/components/ui";
import { topicDisplayTags, topicUpdatedLabel } from "@/data/topicDisplay";
import { useFactfulness } from "@/context/FactfulnessContext";
import { factScore } from "@/scoring";
import { evidenceInputsFromList } from "@/scoring/evidenceInput";
import { Colors, Fonts, Spacing } from "@/theme/brand";

export default function HomeScreen() {
  const { repo } = useFactfulness();
  const topics = repo.getTopics();

  return (
    <Screen>
      <FlatList
        data={topics}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.hero}>
            <Text style={styles.brandHero}>Factfulness</Text>
            <Text style={styles.title}>
              주장 하나를 쪼개고,{"\n"}근거로 진실에 다가가세요
            </Text>
            <Text style={styles.lede}>
              토픽 아래 검증 가능한 명제를 두고, 자료와 토론으로 True / False를 가립니다.
              여론 점수와 팩트 점수는 서로 다른 규칙으로 집계됩니다.
            </Text>
            <View style={styles.ctaRow}>
              <PrimaryButton label="토픽 제안" onPress={() => router.push("/new-topic")} />
              <GhostButton label="예시 토픽" onPress={() => router.push("/topic/t1")} />
            </View>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>진행 중인 토픽</Text>
              <Text style={styles.sectionSub}>
                사람들이 증거를 모으고 있는 공개 검증입니다.
              </Text>
            </View>
          </View>
        }
        renderItem={({ item: t }) => {
          const claims = repo.getClaims(t.id);
          const settled = claims.filter((c) => {
            const fs = factScore(evidenceInputsFromList(repo.getEvidence(c.id)));
            return fs.status === "fact" || fs.status === "lie";
          }).length;

          return (
            <Pressable onPress={() => router.push(`/topic/${t.id}`)}>
              <Card>
                <View style={styles.metaRow}>
                  {topicDisplayTags(t).map((tag) => (
                    <Pill key={tag} label={tag} />
                  ))}
                </View>
                <Text style={styles.metaText}>
                  {t.participants}명 참여 · 업데이트 {topicUpdatedLabel(t)}
                </Text>
                <Text style={styles.topicTitle}>{t.title}</Text>
                <Text style={styles.summary} numberOfLines={3}>
                  {t.summary}
                </Text>
                <Text style={styles.metaText}>
                  세부 명제 {claims.length}개 · Fact/Lie 확정 {settled}/{claims.length}
                </Text>
              </Card>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <Pressable onPress={() => router.push("/rules")}>
            <Text style={styles.rulesLink}>팩트 점수 조건 보기 →</Text>
          </Pressable>
        }
      />
      <SafeAreaView edges={["bottom"]} style={styles.fabArea}>
        <PrimaryButton
          label="+ 토픽 제안"
          onPress={() => router.push("/new-topic")}
          style={styles.fab}
        />
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.lg, paddingBottom: 100 },
  hero: { marginBottom: Spacing.lg },
  brandHero: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.tealDeep,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 26,
    lineHeight: 34,
    color: Colors.ink,
    marginBottom: Spacing.md,
  },
  lede: {
    fontFamily: Fonts.ui,
    fontSize: 15,
    color: Colors.inkSoft,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  ctaRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginBottom: Spacing.xl },
  sectionHead: { marginTop: Spacing.md },
  sectionTitle: {
    fontFamily: Fonts.uiBold,
    fontSize: 20,
    color: Colors.ink,
  },
  sectionSub: {
    fontFamily: Fonts.ui,
    fontSize: 14,
    color: Colors.inkSoft,
    marginTop: 4,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  metaText: {
    fontFamily: Fonts.ui,
    fontSize: 12,
    color: Colors.inkSoft,
    marginBottom: Spacing.sm,
  },
  topicTitle: {
    fontFamily: Fonts.uiSemiBold,
    fontSize: 17,
    color: Colors.ink,
    marginBottom: Spacing.sm,
  },
  summary: {
    fontFamily: Fonts.ui,
    fontSize: 14,
    color: Colors.inkSoft,
    marginBottom: Spacing.sm,
  },
  rulesLink: {
    textAlign: "center",
    fontFamily: Fonts.uiSemiBold,
    color: Colors.teal,
    marginTop: Spacing.md,
  },
  fabArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: "rgba(243, 246, 244, 0.92)",
  },
  fab: { width: "100%" },
});
