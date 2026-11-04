import { Switch, StyleSheet, Text, View } from "react-native";

import { Card, Screen } from "@/components/layout";
import { useFactfulness } from "@/context/FactfulnessContext";
import { Colors, Fonts, Spacing } from "@/theme/brand";

export default function SettingsScreen() {
  const { repo, data } = useFactfulness();
  const prefs = data.notificationPrefs;

  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.title}>설정</Text>
        <Card>
          <View style={styles.row}>
            <View style={styles.copy}>
              <Text style={styles.label}>판정 변경 알림</Text>
              <Text style={styles.hint}>
                참여한 명제의 Fact/Lie 판정이 바뀔 때 푸시 알림을 받습니다. (기기 알림
                권한이 필요합니다.)
              </Text>
            </View>
            <Switch
              value={prefs.notifyVerdictChange}
              onValueChange={(notifyVerdictChange) => {
                void Promise.resolve(
                  repo.setNotificationPrefs({ notifyVerdictChange }),
                );
              }}
              trackColor={{ true: Colors.teal, false: Colors.line }}
            />
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.ink,
    marginBottom: Spacing.lg,
  },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  copy: { flex: 1 },
  label: { fontFamily: Fonts.uiSemiBold, fontSize: 16, color: Colors.ink, marginBottom: 6 },
  hint: { fontFamily: Fonts.ui, fontSize: 13, color: Colors.inkSoft, lineHeight: 19 },
});
