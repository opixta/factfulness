import type { AppData } from "./types";

function isoHoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600 * 1000).toISOString();
}

function isoDaysAgo(d: number): string {
  return new Date(Date.now() - d * 24 * 3600 * 1000).toISOString();
}

function seedParticipantIds(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}_p${i}`);
}

/** Seed data mirrored from web-prototype/app.js */
export const seedData: AppData = {
  topics: [
    {
      id: "t1",
      title: "한국의 재생에너지 비중은 OECD 평균을 이미 넘었다",
      summary:
        "언론·SNS에서 반복되는 주장입니다. 발전량 기준인지 설비 용량 기준인지에 따라 결론이 달라질 수 있어 세부 명제로 나눕니다.",
      tags: ["에너지", "통계", "정책"],
      participants: 128,
      createdAt: isoHoursAgo(2),
      updatedAt: isoHoursAgo(2),
    },
    {
      id: "t2",
      title: "도심 자전거 도로 확장이 교통 체증을 악화시킨다",
      summary:
        "특정 구간 공사 전후 체증 증가가 ‘전체 도시’ 효과처럼 일반화되고 있습니다. 측정 구간과 시간대를 분리해 검증합니다.",
      tags: ["교통", "도시"],
      participants: 76,
      createdAt: isoDaysAgo(10),
      updatedAt: isoDaysAgo(1),
    },
  ],
  claims: {
    t1: [
      {
        id: "c1",
        text: "2023년 기준 한국 전력 생산량 중 재생에너지 비중은 OECD 평균보다 높다.",
        votesTrue: 41,
        votesFalse: 67,
      },
      {
        id: "c2",
        text: "한국 재생에너지 ‘설비용량’ 비중은 2023년 OECD 평균을 상회한다.",
        votesTrue: 38,
        votesFalse: 29,
      },
      {
        id: "c3",
        text: "정부 공식 통계와 IEA 통계의 재생에너지 정의는 동일하다.",
        votesTrue: 12,
        votesFalse: 54,
      },
    ],
    t2: [
      {
        id: "c4",
        text: "서울시 A구간 자전거 도로 개통 후 해당 구간 평균 통행속도가 개통 전 대비 10% 이상 감소했다.",
        votesTrue: 22,
        votesFalse: 18,
      },
    ],
  },
  evidence: {
    c1: [
      {
        id: "e1",
        title: "IEA Electricity 2024 — OECD average renewables share",
        url: "https://www.iea.org/",
        stance: "false",
        summary: "OECD 평균 재생 전력 비중이 한국 수치보다 높게 제시됨.",
        trust: 14,
      },
      {
        id: "e2",
        title: "한국전력통계 2023 발전량 구성",
        url: "https://www.kpx.or.kr/",
        stance: "false",
        summary: "국내 발전량 기준 재생 비중이 OECD 평균 아래로 나타남.",
        trust: 11,
      },
      {
        id: "e3",
        title: "블로그 요약: ‘이미 앞질렀다’ 주장",
        url: "https://example.com/blog",
        stance: "true",
        summary: "설비용량과 발전량을 혼용해 비중을 높게 해석.",
        trust: 2,
      },
    ],
    c2: [
      {
        id: "e4",
        title: "IRENA Capacity Statistics 2024",
        url: "https://www.irena.org/",
        stance: "true",
        summary: "설비용량 기준으로는 한국이 일부 OECD 국가 평균을 상회할 수 있음.",
        trust: 9,
      },
      {
        id: "e5",
        title: "산업부 재생에너지 보급통계",
        url: "https://www.motie.go.kr/",
        stance: "true",
        summary: "설비 기준 지표를 별도로 공표.",
        trust: 7,
      },
      {
        id: "e6",
        title: "반론 칼럼: 용량≠발전",
        url: "https://example.com/op-ed",
        stance: "false",
        summary: "용량 비중으로 ‘이미 넘었다’고 말하기엔 오해의 소지가 큼.",
        trust: 4,
      },
    ],
    c3: [
      {
        id: "e7",
        title: "통계 정의 비교표 (커뮤니티 정리)",
        url: "https://example.com/defs",
        stance: "false",
        summary: "폐기물·양수 포함 여부 등 정의 차이 정리.",
        trust: 5,
      },
    ],
    c4: [
      {
        id: "e8",
        title: "서울시 교통정보시스템 구간 속도",
        url: "https://topis.seoul.go.kr/",
        stance: "true",
        summary: "개통 직후 3개월 평균 속도 하락.",
        trust: 6,
      },
      {
        id: "e9",
        title: "동일 기간 우회도로 속도 상승 데이터",
        url: "https://example.com/detour",
        stance: "neutral",
        summary: "본선 체증이 네트워크 전체 악화를 의미하진 않을 수 있음.",
        trust: 3,
      },
    ],
  },
  comments: {
    c1: [
      {
        id: "cm1",
        author: "mira",
        body: "발전량 기준으로 보면 False 쪽이 설득력 있어요. 용량 지표와 섞이면 안 됩니다.",
        vote: "false",
        at: "1시간 전",
      },
      {
        id: "cm2",
        author: "jun",
        body: "SNS 그래프는 출처가 불명확해서 여론만 흔드는 중.",
        vote: "",
        at: "3시간 전",
      },
    ],
    c2: [
      {
        id: "cm3",
        author: "sora",
        body: "설비용량이라면 True 가능성이 있습니다. 다만 주장 문장에 ‘비중’이 모호해요.",
        vote: "true",
        at: "5시간 전",
      },
    ],
    c3: [],
    c4: [
      {
        id: "cm4",
        author: "lee",
        body: "공사 기간 겹침을 통제했는지가 핵심.",
        vote: "",
        at: "어제",
      },
    ],
  },
  topicParticipantUserIds: {
    t1: seedParticipantIds("t1", 128),
    t2: seedParticipantIds("t2", 76),
  },
  claimScoreHistory: {},
  localUserId: "local_user",
};

export function cloneSeedData(): AppData {
  return JSON.parse(JSON.stringify(seedData)) as AppData;
}

export function migrateAppData(raw: Partial<AppData> & Record<string, unknown>): AppData {
  const base = cloneSeedData();
  const merged: AppData = {
    ...base,
    ...(raw as AppData),
    topics: (raw.topics as AppData["topics"]) ?? base.topics,
    claims: (raw.claims as AppData["claims"]) ?? base.claims,
    evidence: (raw.evidence as AppData["evidence"]) ?? base.evidence,
    comments: (raw.comments as AppData["comments"]) ?? base.comments,
    topicParticipantUserIds:
      (raw.topicParticipantUserIds as AppData["topicParticipantUserIds"]) ??
      base.topicParticipantUserIds,
    claimScoreHistory:
      (raw.claimScoreHistory as AppData["claimScoreHistory"]) ?? {},
    localUserId: (raw.localUserId as string) ?? base.localUserId,
  };
  for (const t of merged.topics) {
    if (!t.createdAt) {
      t.createdAt = new Date().toISOString();
    }
    if (t.updatedAt && !t.updatedAt.includes("T")) {
      t.updatedAt = new Date().toISOString();
    }
    const ids = merged.topicParticipantUserIds[t.id];
    if (ids) {
      t.participants = ids.length;
    }
  }
  return merged;
}
