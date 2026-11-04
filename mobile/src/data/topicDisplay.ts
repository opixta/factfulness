import type { Topic } from "@/data/types";
import { NEW_TOPIC_DAYS } from "@/data/types";

export function formatRelativeTime(iso: string, nowMs = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return iso;
  const diffSec = Math.round((nowMs - then) / 1000);
  if (diffSec < 60) return "방금";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return new Date(then).toLocaleDateString("ko-KR");
}

export function isTopicNew(topic: Pick<Topic, "createdAt">, nowMs = Date.now()): boolean {
  const created = Date.parse(topic.createdAt);
  if (Number.isNaN(created)) return false;
  const ageMs = nowMs - created;
  return ageMs >= 0 && ageMs <= NEW_TOPIC_DAYS * 24 * 60 * 60 * 1000;
}

/** Topic tags plus derived 신규 (7 days after creation). */
export function topicDisplayTags(topic: Topic, nowMs = Date.now()): string[] {
  const tags = [...topic.tags];
  if (isTopicNew(topic, nowMs) && !tags.includes("신규")) {
    tags.unshift("신규");
  }
  return tags;
}

export function topicUpdatedLabel(topic: Topic, nowMs = Date.now()): string {
  return formatRelativeTime(topic.updatedAt, nowMs);
}
