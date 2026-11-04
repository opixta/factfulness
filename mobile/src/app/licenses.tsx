import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, Screen } from "@/components/layout";
import { Colors, Fonts, Spacing } from "@/theme/brand";

export default function LicensesScreen() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>오픈소스 고지</Text>
        <Text style={styles.lede}>
          Factfulness는 아래 오픈소스 자료를 사용합니다. 앱 스토어 출시 전 본 화면을 설정에서
          연결하는 것을 권장합니다 (HANDOFF 릴리스 체크리스트).
        </Text>

        <Card>
          <Text style={styles.blockTitle}>댓글 금지어 목록 (LDNOOBW)</Text>
          <Text style={styles.body}>
            English 및 Korean 금지어는 Shutterstock 및 LDNOOBW 기여자의 「List of Dirty, Naughty,
            Obscene and Otherwise Bad Words」에서 파생되었습니다.
          </Text>
          <Text style={styles.body}>
            License: Creative Commons Attribution 4.0 International (CC BY 4.0)
          </Text>
          <Text style={styles.link}>
            https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words
          </Text>
          <Text style={styles.body}>
            Attribution: Comment moderation word lists incorporate material from List of Dirty,
            Naughty, Obscene and Otherwise Bad Words by Shutterstock, Inc. and LDNOOBW
            contributors, licensed under CC BY 4.0.
          </Text>
          <Text style={styles.hint}>
            Repo: third_party/ldnoobw/ · Regenerate: node scripts/build-banned-words.mjs
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.ink,
    marginBottom: Spacing.md,
  },
  lede: {
    fontFamily: Fonts.ui,
    fontSize: 14,
    color: Colors.inkSoft,
    lineHeight: 21,
    marginBottom: Spacing.lg,
  },
  blockTitle: {
    fontFamily: Fonts.uiBold,
    fontSize: 16,
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
  link: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    color: Colors.teal,
    marginBottom: Spacing.sm,
  },
  hint: { fontFamily: Fonts.ui, fontSize: 12, color: Colors.inkSoft },
});
