// 관심사별로 구글 뉴스 RSS 검색을 돌려 최근 24시간 기사 후보를 모은다. 키 없이 동작.
import { XMLParser } from "fast-xml-parser";
import { INTERESTS } from "@/lib/topics";

export type InterestId = (typeof INTERESTS)[number]["id"];

export type Candidate = {
  title: string; // 언론사 꼬리표를 뗀 기사 제목
  source: string; // 언론사
  interest: InterestId; // 어떤 관심사 검색에서 나왔는지 (LLM 태깅의 힌트)
  url?: string;
  publishedAt?: string;
};

// 관심사별 검색어. 구글 뉴스 검색 문법(OR)을 쓴다.
export const QUERIES: Record<InterestId, string> = {
  sports: "스포츠 경기 결과",
  baseball: "프로야구 KBO",
  soccer: "축구 OR K리그 OR 국가대표 축구",
  entertainment: "연예 OR 예능",
  drama_movie: "드라마 OR 영화 개봉",
  music: "음원 OR 컴백 OR 콘서트",
  real_estate: "부동산 OR 아파트 분양",
  stocks_economy: "코스피 OR 증시 OR 금리",
  tech_it: "신제품 출시 OR 스마트폰 OR 아이폰 OR 갤럭시",
  food: "맛집 OR 신메뉴 OR 편의점 신상",
  travel: "여행 OR 항공권 OR 연휴",
  weather_season: "날씨",
  health: "건강 OR 운동",
  parenting: "육아 OR 어린이집",
  pets: "반려동물 OR 반려견 OR 고양이",
  office_life: "직장인",
  games: "게임 신작 OR 게임 업데이트",
};

const parser = new XMLParser({ ignoreAttributes: true, trimValues: true });
const arr = <T>(x: T | T[] | undefined): T[] => (x === undefined ? [] : Array.isArray(x) ? x : [x]);

// "제목 - 언론사" 꼬리표와 [속보] 같은 말머리를 뗀다.
export function cleanTitle(title: string, source?: string) {
  let t = title;
  if (source && t.endsWith(` - ${source}`)) t = t.slice(0, -(source.length + 3));
  else t = t.replace(/ - [^-]+$/, "");
  return t.replace(/^\s*[\[【(][^\]】)]{1,8}[\]】)]\s*/, "").trim();
}

async function searchNews(interest: InterestId, perInterest: number): Promise<Candidate[]> {
  const q = encodeURIComponent(`${QUERIES[interest]} when:1d`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=ko&gl=KR&ceid=KR:ko`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; lunchtalk/0.1)" },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${interest} ${res.status}`);
  const items = arr<any>(parser.parse(await res.text())?.rss?.channel?.item);
  return items.slice(0, perInterest).map((it) => {
    const source = typeof it.source === "string" ? it.source : "";
    return {
      title: cleanTitle(String(it.title), source),
      source,
      interest,
      url: it.link,
      publishedAt: it.pubDate,
    };
  });
}

// 고른 관심사를 병렬로 검색. 실패한 관심사는 건너뛴다. 앞 20자가 같은 제목은 한 번만.
export async function collect(interests: InterestId[], perInterest = 8): Promise<Candidate[]> {
  const results = await Promise.allSettled(interests.map((id) => searchNews(id, perInterest)));
  results.forEach((r, i) => r.status === "rejected" && console.warn("news failed:", interests[i], r.reason));
  const seen = new Set<string>();
  return results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter((c) => c.title && !seen.has(c.title.slice(0, 20)) && seen.add(c.title.slice(0, 20)));
}
