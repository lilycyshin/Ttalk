// 파이프라인(pipeline-prototype/src/generate.ts)과 같은 스키마. 값을 바꾸면 양쪽을 같이 바꾼다.
export const AGE_GROUPS = ["20s", "30s", "40s", "50s_plus"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const AGE_LABEL: Record<AgeGroup, string> = {
  "20s": "20대",
  "30s": "30대",
  "40s": "40대",
  "50s_plus": "50대+",
};

export const INTERESTS = [
  { id: "sports", label: "스포츠" },
  { id: "baseball", label: "야구" },
  { id: "soccer", label: "축구" },
  { id: "entertainment", label: "연예" },
  { id: "drama_movie", label: "드라마·영화" },
  { id: "music", label: "음악" },
  { id: "real_estate", label: "부동산" },
  { id: "stocks_economy", label: "주식·경제" },
  { id: "tech_it", label: "IT·신제품" },
  { id: "food", label: "맛집·음식" },
  { id: "travel", label: "여행·교통" },
  { id: "weather_season", label: "날씨·계절" },
  { id: "health", label: "건강" },
  { id: "parenting", label: "육아" },
  { id: "pets", label: "반려동물" },
  { id: "office_life", label: "회사생활" },
  { id: "games", label: "게임" },
] as const;

type Opener = { opener: string; follow_up: string };
export type Topic = {
  headline: string;
  summary: string;
  interests: string[];
  age_fit: AgeGroup[];
  source_titles: string[];
  openers: Record<AgeGroup, Opener>;
};
export type Daily = { date?: string; topics: Topic[] };

// targetAges: 오늘 같이 먹는 사람들의 연령대(여러 개). 오름차순.
export type Profile = { myAge: AgeGroup; targetAges: AgeGroup[]; interests: string[] };

export type Pick = { headline: string; summary: string; opener: string; follow_up: string; tag: string };

// 관심사 일치 2점, 상대 연령대(하나라도) 적합 1점. 관심사가 안 겹치는 날도 빈 화면이 되지 않게 점수순으로 채운다.
// speakTo: 멘트 말투를 맞출 상대 연령대. 여러 명이면 홈의 탭에서 고른다.
export function pickForUser(daily: Daily, p: Profile, speakTo: AgeGroup, n = 5): Pick[] {
  const score = (t: Topic) =>
    t.interests.filter((i) => p.interests.includes(i)).length * 2 + (p.targetAges.some((a) => t.age_fit.includes(a)) ? 1 : 0);
  return [...daily.topics]
    .sort((a, b) => score(b) - score(a))
    .slice(0, n)
    .map((t) => ({
      headline: t.headline,
      summary: t.summary,
      ...t.openers[speakTo],
      tag: topicTag(t, p.interests),
    }));
}

// 카드 태그: 사용자가 고른 관심사를 우선, 없으면 토픽의 가장 구체적인(마지막) 관심사.
function topicTag(t: Topic, mine: string[]) {
  const id = t.interests.find((i) => mine.includes(i)) ?? t.interests[t.interests.length - 1];
  return INTERESTS.find((i) => i.id === id)?.label ?? "스몰토크";
}
