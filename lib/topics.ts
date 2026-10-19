// 관심사·연령대 목록과 키워드별 탭 데이터 모양.
import type { TeamMood } from "./persona";

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
  { id: "tech_it", label: "AI·IT" },
  { id: "food", label: "맛집·음식" },
  { id: "travel", label: "여행·교통" },
  { id: "weather_season", label: "날씨·계절" },
  { id: "health", label: "건강" },
  { id: "parenting", label: "육아" },
  { id: "pets", label: "반려동물" },
  { id: "office_life", label: "회사생활" },
  { id: "games", label: "게임" },
] as const;

export type Link = { title: string; url: string; source: string };
// 키워드별 탭 항목: 같은 사건 기사 묶음 하나. 화면엔 키워드만, 누르면 기사 제목(news).
// size: 묶인 기사 수 (많이 다뤄질수록 위로), hot: 겹치는 구글 트렌드 급상승 검색어의 검색량
// ages: 연령대별 최근 7일 네이버 검색 관심도 (기준 키워드 대비 배수, 네이버 키가 있을 때만)
export type KeywordItem = {
  keyword: string;
  interests: string[];
  news: Link[];
  size: number;
  hot?: number;
  ages?: Partial<Record<AgeGroup, number>>;
};
export type KeywordPool = { date?: string; items: KeywordItem[] };

// targetAges: 오늘 같이 먹는 사람들의 연령대(여러 개). 오름차순.
// introversion: 내향 정도(1~4), teamMood: 팀 분위기. 둘은 처음 성향 설정에서 한 번 고른다.
export type Profile = {
  myAge: AgeGroup;
  targetAges: AgeGroup[];
  interests: string[];
  nickname?: string; // 불러드릴 이름
  introversion?: number;
  teamMood?: TeamMood;
};

export type KeywordPick = KeywordItem & { tag: string };

// 한 화면에 보여줄 키워드 수 (관심사 전체 합쳐서)
export const TOTAL_PICKS = 15;

// 같이 먹는 사람 연령대들이 이 키워드를 요즘 얼마나 검색하는지 (연령대 평균)
export const ageScore = (t: KeywordItem, ages: AgeGroup[]) =>
  ages.length ? ages.reduce((s, a) => s + (t.ages?.[a] ?? 0), 0) / ages.length : 0;

// 고른 관심사가 하나라도 겹치는 키워드만. 관심사가 많이 겹칠수록, 같으면 같이 먹는 사람 연령대가 많이 검색하는 순,
// 그다음 급상승 검색어, 기사가 많은 순.
export function pickKeywords(pool: KeywordPool, p: Profile): KeywordPick[] {
  const score = (t: KeywordItem) => t.interests.filter((i) => p.interests.includes(i)).length;
  const age = (t: KeywordItem) => ageScore(t, p.targetAges);
  const picks = (pool.items ?? [])
    .filter((t) => score(t) > 0)
    .sort((a, b) => score(b) - score(a) || age(b) - age(a) || (b.hot ?? 0) - (a.hot ?? 0) || b.size - a.size)
    .map((t) => ({ ...t, tag: topicTag(t, p.interests) }));
  return roundRobin(picks).slice(0, TOTAL_PICKS);
}

// 관심사(태그)별로 번갈아 뽑아서 한 관심사가 다 차지하지 않게 한다.
function roundRobin(picks: KeywordPick[]): KeywordPick[] {
  const groups = new Map<string, KeywordPick[]>();
  for (const p of picks) groups.set(p.tag, [...(groups.get(p.tag) ?? []), p]);
  const out: KeywordPick[] = [];
  for (let i = 0; out.length < picks.length; i++)
    for (const g of groups.values()) if (g[i]) out.push(g[i]);
  return out;
}

// 태그: 겹치는 내 관심사 중 가장 구체적인(마지막) 것.
function topicTag(t: KeywordItem, mine: string[]) {
  const id = [...t.interests].reverse().find((i) => mine.includes(i));
  return INTERESTS.find((i) => i.id === id)?.label ?? "스몰토크";
}
