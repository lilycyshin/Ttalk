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

// 한 화면에 보여줄 토픽 수 (관심사 전체 합쳐서).
export const TOTAL_PICKS = 5;

// 고른 관심사가 하나라도 겹치고, 같이 먹는 모든 연령대에 맞는 토픽만 보여준다. 관심사가 많이 겹칠수록 위로.
// 멘트는 같이 먹는 사람 중 가장 윗사람 말투로. 그 말투면 다른 분들한테도 무난하다.
export function pickForUser(daily: Daily, p: Profile): Pick[] {
  const speakTo = p.targetAges[p.targetAges.length - 1];
  const score = (t: Topic) => t.interests.filter((i) => p.interests.includes(i)).length;
  const picks = daily.topics
    .filter((t) => t.interests.some((i) => p.interests.includes(i)))
    .filter((t) => p.targetAges.every((a) => t.age_fit.includes(a)))
    .sort((a, b) => score(b) - score(a))
    .map((t) => ({
      headline: t.headline,
      summary: t.summary,
      ...t.openers[speakTo],
      tag: topicTag(t, p.interests),
    }));
  return roundRobin(picks).slice(0, TOTAL_PICKS);
}

// 관심사(태그)별로 번갈아 뽑아서 한 관심사가 5개를 다 차지하지 않게 한다.
function roundRobin(picks: Pick[]): Pick[] {
  const groups = new Map<string, Pick[]>();
  for (const p of picks) groups.set(p.tag, [...(groups.get(p.tag) ?? []), p]);
  const out: Pick[] = [];
  for (let i = 0; out.length < picks.length; i++)
    for (const g of groups.values()) if (g[i]) out.push(g[i]);
  return out;
}

// 카드 태그: 토픽과 겹치는 내 관심사 중 가장 구체적인(마지막) 것.
function topicTag(t: Topic, mine: string[]) {
  const id = [...t.interests].reverse().find((i) => mine.includes(i));
  return INTERESTS.find((i) => i.id === id)?.label ?? "스몰토크";
}
