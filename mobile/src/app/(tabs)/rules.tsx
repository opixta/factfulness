import { type Href, router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, Screen } from "@/components/layout";
import { GhostButton } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import {
  FACT_THRESHOLD,
  MIN_ELIGIBLE_SAME_DIR,
  TRUST_MIN,
} from "@/scoring/config";
import { Colors, Fonts, Spacing } from "@/theme/brand";

export default function RulesScreen() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Scoring model</Text>
        <Text style={styles.title}>
          여론 점수와 팩트 점수는{"\n"}다른 기준으로 움직입니다
        </Text>
        <Text style={styles.lede}>
          누구나 의견을 낼 수 있지만, “사실”로 인정되는 점수는 증거가 조건을 통과할 때만
          쌓입니다.
        </Text>

        <Card>
          <Text style={styles.blockTitle}>여론 점수 (Opinion)</Text>
          <Text style={styles.body}>
            참여자 True / False 투표의 순수 비율입니다. 댓글·감정적 반응도 여기 반영됩니다.
          </Text>
          <Text style={styles.bullet}>• 투표 1표 = 여론 1표</Text>
          <Text style={styles.bullet}>• 출처 유무와 무관</Text>
          <Text style={styles.formula}>Opinion = True 투표 ÷ 전체 투표</Text>
        </Card>

        <Card style={styles.accent}>
          <Text style={styles.blockTitle}>팩트 점수 (Fact / Lie)</Text>
          <Text style={styles.body}>
            아래 조건을 모두 만족하는 증거만 Fact 또는 Lie로 집계됩니다.
          </Text>
          <Text style={styles.bullet}>
            C1 출처 URL 또는 업로드 파일이 있음
          </Text>
          <Text style={styles.bullet}>C2 자료가 커뮤니티에서 신뢰 추천 ≥ {TRUST_MIN}</Text>
          <Text style={styles.bullet}>
            C3 동일 방향 **서로 다른 출처 도메인** ≥ {MIN_ELIGIBLE_SAME_DIR}개
          </Text>
          <Text style={styles.bullet}>
            중립(맥락) 자료는 팩트 점수 적격·가중치에 포함되지 않음
          </Text>
          <Text style={styles.bullet}>C4 반대 방향 적격 증거가 더 많지 않음</Text>
          <Text style={styles.formula}>
            Fact = 적격 True 가중치 ÷ (True+False 적격 가중치)
          </Text>
          <Text style={styles.hint}>
            확정 임계값: {Math.round(FACT_THRESHOLD * 100)}%
          </Text>
        </Card>

        <Text style={styles.blockTitle}>판정 상태</Text>
        <Legend status="pending" text="조건 미충족 — 여론만 표시, Fact/Lie 미확정" />
        <Legend
          status="fact"
          text={`적격 증거가 True 쪽으로 우세 (임계값 ≥ ${Math.round(FACT_THRESHOLD * 100)}%)`}
        />
        <Legend
          status="lie"
          text={`적격 증거가 False 쪽으로 우세 (임계값 ≥ ${Math.round(FACT_THRESHOLD * 100)}%)`}
        />
        <Legend status="split" text="적격 증거는 있으나 어느 쪽도 65% 미만" />

        <GhostButton
          label="오픈소스 라이선스 (LDNOOBW)"
          onPress={() => router.push("/licenses" as Href)}
        />
      </ScrollView>
    </Screen>
  );
}

function Legend({
  status,
  text,
}: {
  status: "pending" | "fact" | "lie" | "split";
  text: string;
}) {
  return (
    <View style={styles.legendRow}>
      <StatusBadge status={status} />
      <Text style={styles.legendText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  eyebrow: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    color: Colors.teal,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 26,
    lineHeight: 34,
    color: Colors.ink,
    marginVertical: Spacing.md,
  },
  lede: {
    fontFamily: Fonts.ui,
    fontSize: 15,
    color: Colors.inkSoft,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  blockTitle: {
    fontFamily: Fonts.uiBold,
    fontSize: 18,
    color: Colors.ink,
    marginBottom: Spacing.sm,
  },
  body: {
    fontFamily: Fonts.ui,
    fontSize: 14,
    color: Colors.inkSoft,
    lineHeight: 21,
    marginBottom: Spacing.sm,
  },
  bullet: {
    fontFamily: Fonts.ui,
    fontSize: 14,
    color: Colors.ink,
    marginBottom: 4,
  },
  formula: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.paper2,
    borderRadius: 10,
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    color: Colors.tealDeep,
  },
  hint: {
    marginTop: Spacing.sm,
    fontFamily: Fonts.ui,
    fontSize: 12,
    color: Colors.inkSoft,
  },
  accent: { borderColor: "rgba(13, 107, 99, 0.25)" },
  legendRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  legendText: {
    flex: 1,
    fontFamily: Fonts.ui,
    fontSize: 14,
    color: Colors.inkSoft,
    lineHeight: 20,
  },
});
