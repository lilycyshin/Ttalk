// 관심사별로 구글 뉴스 RSS 검색을 돌려 최근 3일 주요 기사 후보를 모은다. 서울 기준. 키 없이 동작.
import { XMLParser } from "fast-xml-parser";
import { INTERESTS } from "@/lib/topics";

export type InterestId = (typeof INTERESTS)[number]["id"];

export type Candidate = {
  title: string; // 언론사 꼬리표·말머리를 뗀 기사 제목
  source: string; // 언론사
  interest: InterestId; // 어떤 관심사 검색에서 나왔는지 (LLM 태깅의 힌트)
  url?: string;
  publishedAt?: string;
};

// 관심사별 검색어. 지역색이 있는 관심사는 서울로 좁힌다. 여러 개면 각각 검색해서 합친다.
export const QUERIES: Record<InterestId, string[]> = {
  sports: ["스포츠 경기 결과"],
  baseball: ["프로야구 KBO"],
  soccer: ["축구 국가대표", "K리그"],
  entertainment: ["연예", "예능"],
  drama_movie: ["드라마", "영화 개봉"],
  music: ["컴백", "콘서트"],
  real_estate: ["서울 아파트", "서울 부동산"],
  stocks_economy: ["코스피", "금리"],
  tech_it: ["신제품 출시", "스마트폰"],
  food: ["서울 맛집", "편의점 신상"],
  travel: ["서울 가볼만한곳", "여행"],
  weather_season: ["서울 날씨"],
  health: ["건강 운동"],
  parenting: ["서울 육아"],
  pets: ["서울 반려동물", "반려견"],
  office_life: ["직장인"],
  games: ["게임 신작"],
};

// 서울 한정: 제목에 다른 지역이 나오는 기사는 뺀다.
const OTHER_REGION =
  /부산|대구|인천|광주|대전|울산|세종|경기|수원|성남|고양|용인|부천|안산|안양|화성|평택|강원|춘천|원주|강릉|충북|충남|충청|청주|천안|전북|전남|전라|전주|익산|목포|여수|순천|경북|경남|경상|포항|구미|창원|김해|진주|거제|제주|서귀포/;
export const isSeoulOrNational = (c: Candidate) => !OTHER_REGION.test(c.title);

// "제목 - 언론사" 꼬리표와 [속보] 같은 말머리를 뗀다.
export function cleanTitle(title: string, source?: string) {
  let t = title;
  if (source && t.endsWith(` - ${source}`)) t = t.slice(0, -(source.length + 3));
  else t = t.replace(/ - [^-]+$/, "");
  return t.replace(/^\s*[\[【(][^\]】)]{1,8}[\]】)]\s*/, "").trim();
}

const parser = new XMLParser({ ignoreAttributes: true, trimValues: true });
const arr = <T>(x: T | T[] | undefined): T[] => (x === undefined ? [] : Array.isArray(x) ? x : [x]);

async function googleSearch(query: string, interest: InterestId, n: number): Promise<Candidate[]> {
  const q = encodeURIComponent(`${query} when:3d`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=ko&gl=KR&ceid=KR:ko`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; lunchtalk/0.1)" },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`google ${query} ${res.status}`);
  const items = arr<any>(parser.parse(await res.text())?.rss?.channel?.item);
  return items.slice(0, n).map((it) => {
    const source = typeof it.source === "string" ? it.source : "";
    return { title: cleanTitle(String(it.title), source), source, interest, url: it.link, publishedAt: it.pubDate };
  });
}

// 고른 관심사의 검색어를 전부 병렬로 돌린다. 실패한 검색은 건너뛴다.
// 다른 지역 기사는 빼고, 앞 20자가 같은 제목은 한 번만. 관심사당 최대 perInterest개.
export async function collect(interests: InterestId[], perInterest = 12): Promise<Candidate[]> {
  const jobs = interests.flatMap((id) => QUERIES[id].map((q) => ({ id, q })));
  const results = await Promise.allSettled(jobs.map(({ id, q }) => googleSearch(q, id, perInterest)));
  results.forEach((r, i) => r.status === "rejected" && console.warn("news failed:", jobs[i].q, r.reason));

  const seen = new Set<string>();
  const count: Partial<Record<InterestId, number>> = {};
  return results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter(isSeoulOrNational)
    .filter((c) => c.title && !seen.has(c.title.slice(0, 20)) && seen.add(c.title.slice(0, 20)))
    .filter((c) => (count[c.interest] = (count[c.interest] ?? 0) + 1) <= perInterest);
}
