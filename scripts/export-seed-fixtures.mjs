#!/usr/bin/env node
/**
 * Exports fixtures/seed.json for backend seed_from_json.py (slug IDs).
 * Run from repo root: node scripts/export-seed-fixtures.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const seed = {
  topics: [
    {
      slug: "t1",
      title: "한국의 재생에너지 비중은 OECD 평균을 이미 넘었다",
      summary:
        "언론·SNS에서 반복되는 주장입니다. 발전량 기준인지 설비 용량 기준인지에 따라 결론이 달라질 수 있어 세부 명제로 나눕니다.",
      tags: ["에너지", "통계", "정책"],
      participants: 128,
    },
    {
      slug: "t2",
      title: "도심 자전거 도로 확장이 교통 체증을 악화시킨다",
      summary:
        "특정 구간 공사 전후 체증 증가가 ‘전체 도시’ 효과처럼 일반화되고 있습니다. 측정 구간과 시간대를 분리해 검증합니다.",
      tags: ["교통", "도시"],
      participants: 76,
    },
  ],
  claims: {
    t1: [
      {
        slug: "c1",
        text: "2023년 기준 한국 전력 생산량 중 재생에너지 비중은 OECD 평균보다 높다.",
        votesTrue: 41,
        votesFalse: 67,
      },
      {
        slug: "c2",
        text: "한국 재생에너지 ‘설비용량’ 비중은 2023년 OECD 평균을 상회한다.",
        votesTrue: 38,
        votesFalse: 29,
      },
      {
        slug: "c3",
        text: "정부 공식 통계와 IEA 통계의 재생에너지 정의는 동일하다.",
        votesTrue: 12,
        votesFalse: 54,
      },
    ],
    t2: [
      {
        slug: "c4",
        text: "서울시 A구간 자전거 도로 개통 후 해당 구간 평균 통행속도가 개통 전 대비 10% 이상 감소했다.",
        votesTrue: 22,
        votesFalse: 18,
      },
    ],
  },
  evidence: {
    c1: [
      {
        slug: "e1",
        title: "IEA Electricity 2024 — OECD average renewables share",
        url: "https://www.iea.org/",
        stance: "false",
        summary: "OECD 평균 재생 전력 비중이 한국 수치보다 높게 제시됨.",
        trust: 14,
        ogSiteName: "iea.org",
        previewStatus: "success",
      },
      {
        slug: "e2",
        title: "한국전력통계 2023 발전량 구성",
        url: "https://www.kpx.or.kr/",
        stance: "false",
        summary: "국내 발전량 기준 재생 비중이 OECD 평균 아래로 나타남.",
        trust: 11,
        ogSiteName: "kpx.or.kr",
        previewStatus: "success",
      },
      {
        slug: "e3",
        title: "블로그 요약: ‘이미 앞질렀다’ 주장",
        url: "https://example.com/blog",
        stance: "true",
        summary: "설비용량과 발전량을 혼용해 비중을 높게 해석.",
        trust: 2,
        ogSiteName: "example.com",
        previewStatus: "success",
      },
    ],
    c2: [
      {
        slug: "e4",
        title: "IRENA Capacity Statistics 2024",
        url: "https://www.irena.org/",
        stance: "true",
        summary: "설비용량 기준으로는 한국이 일부 OECD 국가 평균을 상회할 수 있음.",
        trust: 9,
        ogSiteName: "irena.org",
        previewStatus: "success",
      },
      {
        slug: "e5",
        title: "산업부 재생에너지 보급통계",
        url: "https://www.motie.go.kr/",
        stance: "true",
        summary: "설비 기준 지표를 별도로 공표.",
        trust: 7,
        ogSiteName: "motie.go.kr",
        previewStatus: "success",
      },
      {
        slug: "e6",
        title: "반론 칼럼: 용량≠발전",
        url: "https://example.com/op-ed",
        stance: "false",
        summary: "용량 비중으로 ‘이미 넘었다’고 말하기엔 오해의 소지가 큼.",
        trust: 4,
        ogSiteName: "example.com",
        previewStatus: "success",
      },
    ],
    c3: [
      {
        slug: "e7",
        title: "통계 정의 비교표 (커뮤니티 정리)",
        url: "https://example.com/defs",
        stance: "false",
        summary: "폐기물·양수 포함 여부 등 정의 차이 정리.",
        trust: 5,
        ogSiteName: "example.com",
        previewStatus: "success",
      },
    ],
    c4: [
      {
        slug: "e8",
        title: "서울시 교통정보시스템 구간 속도",
        url: "https://topis.seoul.go.kr/",
        stance: "true",
        summary: "개통 직후 3개월 평균 속도 하락.",
        trust: 6,
        ogSiteName: "topis.seoul.go.kr",
        previewStatus: "success",
      },
      {
        slug: "e9",
        title: "동일 기간 우회도로 속도 상승 데이터",
        url: "https://example.com/detour",
        stance: "neutral",
        summary: "본선 체증이 네트워크 전체 악화를 의미하진 않을 수 있음.",
        trust: 3,
        ogSiteName: "example.com",
        previewStatus: "success",
      },
    ],
  },
};

const out = path.join(repoRoot, "fixtures", "seed.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(seed, null, 2) + "\n", "utf8");
console.log("Wrote", out);
