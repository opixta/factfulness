import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, Screen } from "@/components/layout";
import { GhostButton, Pill, PrimaryButton } from "@/components/ui";
import { topicDisplayTags, topicUpdatedLabel } from "@/data/topicDisplay";
import { useFactfulness } from "@/context/FactfulnessContext";
import { factScore } from "@/scoring";
import { evidenceInputsFromList } from "@/scoring/evidenceInput";
import { searchTopicsAndClaims, type TitleSearchHit } from "@/search/titleSearch";
import { Colors, Fonts, Radius, Spacing } from "@/theme/brand";

export default function HomeScreen() {
  const { repo } = useFactfulness();
  const [searchQuery, setSearchQuery] = useState("");
  const topics = repo.getTopics();

  const claimsByTopic = useMemo(() => {
    const map: Record<string, ReturnType<typeof repo.getClaims>> = {};
    for (const t of topics) {
      map[t.id] = repo.getClaims(t.id);
    }
    return map;
  }, [repo, topics]);

  const searchHits = useMemo(
    () => searchTopicsAndClaims(topics, claimsByTopic, searchQuery),
    [topics, claimsByTopic, searchQuery],
  );

  const searching = Boolean(searchQuery.trim());

  const listData: TitleSearchHit[] = searching
    ? searchHits
    : topics.map((t) => ({ topic: t }));

  return (
    <Screen>
      <FlatList
        data={listData}
        keyExtractor={(item, index) =>
          item.claim ? `claim-${item.claim.id}` : `topic-${item.topic.id}-${index}`
        }
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
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="토픽·명제 제목 검색"
              placeholderTextColor={Colors.inkSoft}
              style={styles.searchInput}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>
        }
        renderItem={({ item }) => {
          const t = item.topic;
          const claim = item.claim;
          const claims = claimsByTopic[t.id] ?? [];
          const settled = claims.filter((c) => {
            const fs = factScore(evidenceInputsFromList(repo.getEvidence(c.id)));
            return fs.status === "fact" || fs.status === "lie";
          }).length;

          const onPress = () => {
            if (claim) router.push(`/claim/${claim.id}`);
            else router.push(`/topic/${t.id}`);
          };

          return (
            <Pressable onPress={onPress}>
              <Card>
                {searching && claim ? (
                  <Text style={styles.searchHitLabel}>명제 · {t.title}</Text>
                ) : null}
                <View style={styles.metaRow}>
                  {topicDisplayTags(t).map((tag) => (
                    <Pill key={tag} label={tag} />
                  ))}
                </View>
                <Text style={styles.metaText}>
                  {t.participants}명 참여 · 업데이트 {topicUpdatedLabel(t)}
                </Text>
                <Text style={styles.topicTitle}>{claim ? claim.text : t.title}</Text>
                {!claim ? (
                  <Text style={styles.summary} numberOfLines={3}>
                    {t.summary}
                  </Text>
                ) : null}
                {!claim ? (
                  <Text style={styles.metaText}>
                    세부 명제 {claims.length}개 · Fact/Lie 확정 {settled}/{claims.length}
                  </Text>
                ) : null}
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
    marginBottom: Spacing.sm,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    fontFamily: Fonts.ui,
    backgroundColor: Colors.white,
    marginBottom: Spacing.md,
  },
  searchHitLabel: {
    fontFamily: Fonts.uiMedium,
    fontSize: 12,
    color: Colors.teal,
    marginBottom: 6,
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
