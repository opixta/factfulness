import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Card, Screen } from "@/components/layout";
import { factLabel, ScorePair } from "@/components/ScorePair";
import { EligibleBadge, StanceBadge } from "@/components/StanceBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { GhostButton, PrimaryButton } from "@/components/ui";
import { useClaimScores, useFactfulness } from "@/context/FactfulnessContext";
import { isEvidenceEligible, TRUST_MIN } from "@/scoring";
import type { Stance } from "@/scoring/types";
import { Colors, Fonts, Radius, Spacing } from "@/theme/brand";

export default function ClaimScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo } = useFactfulness();
  const scores = useClaimScores(id);
  const found = repo.findClaim(id);

  const [evTitle, setEvTitle] = useState("");
  const [evUrl, setEvUrl] = useState("");
  const [evSummary, setEvSummary] = useState("");
  const [evStance, setEvStance] = useState<Stance>("true");
  const [commentBody, setCommentBody] = useState("");
  const [commentVote, setCommentVote] = useState<"" | "true" | "false">("");

  if (!scores || !found) {
    return (
      <Screen style={styles.centered}>
        <Text style={styles.missing}>명제를 찾을 수 없습니다.</Text>
      </Screen>
    );
  }

  const { claim, op, fact } = scores;
  const evidence = repo.getEvidence(id);
  const comments = repo.getComments(id);

  const gateText = fact.gatePassed
    ? "조건 C1–C4를 충족해 Fact/Lie 점수에 반영되고 있습니다."
    : fact.reasons.join(" ");

  const submitEvidence = () => {
    if (!evTitle.trim() || !evUrl.trim() || !evSummary.trim()) return;
    repo.addEvidence(id, {
      title: evTitle.trim(),
      url: evUrl.trim(),
      stance: evStance,
      summary: evSummary.trim(),
    });
    setEvTitle("");
    setEvUrl("");
    setEvSummary("");
    setEvStance("true");
  };

  const submitComment = () => {
    if (!commentBody.trim()) return;
    repo.addComment(id, { body: commentBody.trim(), vote: commentVote });
    setCommentBody("");
    setCommentVote("");
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <GhostButton
            label="← 토픽으로"
            onPress={() => router.push(`/topic/${found.topicId}`)}
          />

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Claim · True / False</Text>
            <StatusBadge status={fact.status} />
            <Text style={styles.title}>{claim.text}</Text>

            <View style={styles.voteRow}>
              <VoteButton
                label="True 투표"
                selected={claim.userVote === "true"}
                tone="true"
                onPress={() => repo.castVote(id, "true")}
              />
              <VoteButton
                label="False 투표"
                selected={claim.userVote === "false"}
                tone="false"
                onPress={() => repo.castVote(id, "false")}
              />
            </View>

            <ScorePair
              votesTrue={claim.votesTrue}
              votesFalse={claim.votesFalse}
              opinionPct={op.pct}
              fact={fact}
            />
            <Text style={[styles.gate, fact.gatePassed && styles.gatePass]}>{gateText}</Text>
            <Text style={styles.factDetail}>{factLabel(fact)} · 가중치 T{fact.wTrue} / F{fact.wFalse}</Text>
          </View>

          <Text style={styles.sectionTitle}>증거 자료</Text>
          <Text style={styles.sectionSub}>출처가 있는 자료만 팩트 점수에 반영됩니다.</Text>

          {evidence.map((e) => {
            const eligible = isEvidenceEligible({
              id: e.id,
              url: e.url,
              stance: e.stance,
              trust: e.trust,
            });
            return (
              <Card key={e.id}>
                <Text style={styles.evTitle}>{e.title}</Text>
                <View style={styles.badgeRow}>
                  <StanceBadge stance={e.stance} />
                  <EligibleBadge eligible={eligible} />
                </View>
                <Text style={styles.body}>{e.summary}</Text>
                <Pressable onPress={() => void WebBrowser.openBrowserAsync(e.url)}>
                  <Text style={styles.link}>{e.url}</Text>
                </Pressable>
                <View style={styles.trustRow}>
                  <Text style={styles.hint}>
                    신뢰 추천 {e.trust}
                    {e.trust < TRUST_MIN ? ` (적격 ${TRUST_MIN}+)` : ""}
                  </Text>
                  <GhostButton label="추천 +1" onPress={() => repo.addTrust(id, e.id)} />
                </View>
              </Card>
            );
          })}

          <Card>
            <Text style={styles.formTitle}>자료 등록</Text>
            <Field label="제목" value={evTitle} onChangeText={setEvTitle} />
            <Field label="출처 URL" value={evUrl} onChangeText={setEvUrl} autoCapitalize="none" />
            <Text style={styles.fieldLabel}>지지 방향</Text>
            <View style={styles.chipRow}>
              {(["true", "false", "neutral"] as Stance[]).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setEvStance(s)}
                  style={[styles.chip, evStance === s && styles.chipActive]}
                >
                  <Text style={styles.chipText}>
                    {s === "true" ? "True" : s === "false" ? "False" : "중립"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Field
              label="요약"
              value={evSummary}
              onChangeText={setEvSummary}
              multiline
            />
            <PrimaryButton label="자료 등록" onPress={submitEvidence} />
          </Card>

          <Text style={styles.sectionTitle}>토론</Text>
          <Text style={styles.sectionSub}>
            댓글은 여론에 영향을 주지만, 출처 없이는 팩트 점수에 들어가지 않습니다.
          </Text>

          {comments.map((c) => (
            <Card key={c.id}>
              <Text style={styles.author}>
                {c.author} · {c.at}
                {c.vote ? ` · ${c.vote.toUpperCase()}` : ""}
              </Text>
              <Text style={styles.body}>{c.body}</Text>
            </Card>
          ))}

          <Card>
            <Field label="댓글" value={commentBody} onChangeText={setCommentBody} multiline />
            <Text style={styles.fieldLabel}>투표 연동</Text>
            <View style={styles.chipRow}>
              {(
                [
                  ["", "없음"],
                  ["true", "True"],
                  ["false", "False"],
                ] as const
              ).map(([v, label]) => (
                <Pressable
                  key={v || "none"}
                  onPress={() => setCommentVote(v)}
                  style={[styles.chip, commentVote === v && styles.chipActive]}
                >
                  <Text style={styles.chipText}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <PrimaryButton label="댓글 남기기" onPress={submitComment} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function VoteButton({
  label,
  selected,
  tone,
  onPress,
}: {
  label: string;
  selected: boolean;
  tone: "true" | "false";
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.voteBtn,
        tone === "true" ? styles.voteTrue : styles.voteFalse,
        selected && styles.voteSelected,
      ]}
    >
      <Text style={[styles.voteText, selected && styles.voteTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        style={[styles.input, multiline && styles.inputMulti]}
        placeholderTextColor={Colors.inkSoft}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  centered: { justifyContent: "center", alignItems: "center" },
  missing: { fontFamily: Fonts.ui, color: Colors.inkSoft },
  hero: { marginBottom: Spacing.lg },
  eyebrow: {
    fontFamily: Fonts.uiMedium,
    fontSize: 12,
    color: Colors.teal,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 30,
    color: Colors.ink,
    marginVertical: Spacing.sm,
  },
  voteRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md },
  voteBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: "center",
  },
  voteTrue: { borderColor: Colors.leaf, backgroundColor: "rgba(47,125,74,0.08)" },
  voteFalse: { borderColor: Colors.coral, backgroundColor: "rgba(196,92,62,0.08)" },
  voteSelected: { borderWidth: 2 },
  voteText: { fontFamily: Fonts.uiSemiBold, color: Colors.ink },
  voteTextSelected: { color: Colors.ink },
  gate: {
    marginTop: Spacing.md,
    fontFamily: Fonts.ui,
    fontSize: 13,
    color: Colors.inkSoft,
    lineHeight: 20,
  },
  gatePass: { color: Colors.leaf },
  factDetail: { fontFamily: Fonts.ui, fontSize: 12, color: Colors.inkSoft, marginTop: 4 },
  sectionTitle: {
    fontFamily: Fonts.uiBold,
    fontSize: 20,
    color: Colors.ink,
    marginTop: Spacing.lg,
  },
  sectionSub: {
    fontFamily: Fonts.ui,
    fontSize: 13,
    color: Colors.inkSoft,
    marginBottom: Spacing.md,
  },
  evTitle: { fontFamily: Fonts.uiSemiBold, fontSize: 16, color: Colors.ink, marginBottom: 6 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: Spacing.sm },
  body: { fontFamily: Fonts.ui, fontSize: 14, color: Colors.ink, lineHeight: 21 },
  link: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    color: Colors.teal,
    marginVertical: Spacing.sm,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
  },
  hint: { fontFamily: Fonts.ui, fontSize: 12, color: Colors.inkSoft },
  formTitle: { fontFamily: Fonts.uiBold, fontSize: 16, marginBottom: Spacing.md, color: Colors.ink },
  field: { marginBottom: Spacing.md },
  fieldLabel: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    color: Colors.inkSoft,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 10,
    padding: Spacing.md,
    fontFamily: Fonts.ui,
    backgroundColor: Colors.white,
  },
  inputMulti: { minHeight: 80, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: Spacing.md },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.white,
  },
  chipActive: { borderColor: Colors.teal, backgroundColor: "rgba(13,107,99,0.1)" },
  chipText: { fontFamily: Fonts.uiMedium, fontSize: 13, color: Colors.ink },
  author: { fontFamily: Fonts.uiMedium, fontSize: 13, color: Colors.inkSoft, marginBottom: 6 },
});
