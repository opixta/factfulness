import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Evidence } from "@/data/types";
import { hasLinkPreview } from "@/linkPreview/simulatePreview";
import { Colors, Fonts, Radius, Spacing } from "@/theme/brand";

export function EvidenceLinkPreview({
  evidence,
  onOpenUrl,
}: {
  evidence: Evidence;
  onOpenUrl: () => void;
}) {
  if (!evidence.url) return null;

  if (evidence.previewStatus === "pending") {
    return <Text style={styles.pending}>링크 미리보기 불러오는 중…</Text>;
  }

  if (!hasLinkPreview(evidence)) {
    return (
      <Pressable onPress={onOpenUrl} style={styles.fallback}>
        <Text style={styles.fallbackSite}>{evidence.url}</Text>
        <Text style={styles.fallbackHint}>미리보기 없음 · 탭하여 열기</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onOpenUrl} style={styles.card}>
      {evidence.ogImageUrl ? (
        <Image
          source={{ uri: evidence.ogImageUrl }}
          style={styles.thumb}
          contentFit="cover"
        />
      ) : null}
      <View style={styles.meta}>
        {evidence.ogSiteName ? (
          <Text style={styles.site}>{evidence.ogSiteName}</Text>
        ) : null}
        <Text style={styles.ogTitle} numberOfLines={2}>
          {evidence.ogTitle ?? evidence.title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    overflow: "hidden",
    marginVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  thumb: { width: "100%", height: 120, backgroundColor: Colors.paper2 },
  meta: { padding: Spacing.md },
  site: {
    fontFamily: Fonts.uiMedium,
    fontSize: 12,
    color: Colors.inkSoft,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  ogTitle: { fontFamily: Fonts.uiSemiBold, fontSize: 15, color: Colors.ink },
  pending: {
    fontFamily: Fonts.ui,
    fontSize: 12,
    color: Colors.inkSoft,
    marginVertical: Spacing.sm,
  },
  fallback: {
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 10,
    marginVertical: Spacing.sm,
  },
  fallbackSite: { fontFamily: Fonts.uiMedium, fontSize: 13, color: Colors.teal },
  fallbackHint: { fontFamily: Fonts.ui, fontSize: 12, color: Colors.inkSoft, marginTop: 4 },
});
