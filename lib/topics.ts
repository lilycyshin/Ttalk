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
  background?: string; // 잘 모르는 사람을 위한 배경 설명
  links?: Link[]; // 원문 기사
  keyword?: string; // 네이버 검색용 핵심 검색어
  trend?: number; // 같이 먹는 사람 연령대의 최근 7일 검색 관심도 (기준 키워드 대비 배수)
};
export type Link = { title: string; url: string; source: string };
export type Daily = { date?: string; topics: Topic[] };

// targetAges: 오늘 같이 먹는 사람들의 연령대(여러 개). 오름차순.
export type Profile = { myAge: AgeGroup; targetAges: AgeGroup[]; interests: string[] };

export type Pick = {
  headline: string;
  summary: string;
  opener: string;
  follow_up: string;
  tag: string;
  background?: string;
  links: Link[];
};

// 한 화면에 보여줄 토픽 수 (관심사 전체 합쳐서). 연령대 조건 때문에 모자라면 MIN_PICKS까지는 조건을 풀어서 채운다.
export const TOTAL_PICKS = 10;
export const MIN_PICKS = 3;

// 고른 관심사가 하나라도 겹치고, 같이 먹는 모든 연령대에 맞는 토픽을 우선 보여준다. 관심사가 많이 겹칠수록 위로.
// 멘트는 같이 먹는 사람 중 가장 윗사람 말투로. 그 말투면 다른 분들한테도 무난하다.
export function pickForUser(daily: Daily, p: Profile): Pick[] {
  const speakTo = p.targetAges[p.targetAges.length - 1];
  const score = (t: Topic) => t.interests.filter((i) => p.interests.includes(i)).length;
  // 관심사가 많이 겹칠수록, 같은 수면 그 연령대가 요즘 많이 검색하는 주제일수록 위로.
  const byScore = (a: Topic, b: Topic) => score(b) - score(a) || (b.trend ?? 0) - (a.trend ?? 0);
  const mine = daily.topics.filter((t) => t.interests.some((i) => p.interests.includes(i)));
  const fitsAll = (t: Topic) => p.targetAges.every((a) => t.age_fit.includes(a));
  let chosen = mine.filter(fitsAll);
  if (chosen.length < MIN_PICKS) chosen = [...chosen, ...mine.filter((t) => !fitsAll(t)).slice(0, MIN_PICKS - chosen.length)];
  const picks = chosen
    .sort(byScore)
    .map((t) => ({
      headline: t.headline,
      summary: t.summary,
      ...t.openers[speakTo],
      tag: topicTag(t, p.interests),
      background: t.background,
      links: t.links ?? [],
    }));
  return roundRobin(picks).slice(0, TOTAL_PICKS);
}

// 관심사(태그)별로 번갈아 뽑아서 한 관심사가 다 차지하지 않게 한다.
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
