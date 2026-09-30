// 관심사별 최근 3일 주요 기사 후보를 모은다. 서울 기준.
// NAVER_CLIENT_ID / NAVER_CLIENT_SECRET이 있으면 네이버 뉴스 검색 API, 없으면 구글 뉴스 RSS(키 없음).
import { XMLParser } from "fast-xml-parser";
import { INTERESTS } from "@/lib/topics";

export type InterestId = (typeof INTERESTS)[number]["id"];

export type Candidate = {
  title: string; // 언론사 꼬리표·말머리를 뗀 기사 제목
  source: string; // 언론사
  interest: InterestId; // 어떤 관심사 검색에서 나왔는지 (LLM 태깅의 힌트)
  description?: string; // 기사 앞부분 내용 (네이버만)
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

// 네이버 뉴스 검색 API (공식, 하루 25,000회 무료). 기사 앞부분 내용(description)도 같이 준다.
// 관련도순으로 받아 최근 3일 기사만 남긴다.
const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const RECENT_MS = 3 * 24 * 3600_000;

async function naverSearch(query: string, interest: InterestId, n: number): Promise<Candidate[]> {
  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=30&sort=sim`;
  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID!,
      "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET!,
    },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`naver ${query} ${res.status} ${(await res.text()).slice(0, 120)}`);
  const items: any[] = (await res.json()).items ?? [];
  return items
    .filter((it) => Date.now() - Date.parse(it.pubDate) <= RECENT_MS)
    .slice(0, n)
    .map((it) => {
      const url: string = it.originallink || it.link;
      let source = "";
      try {
        source = new URL(url).hostname.replace(/^(www|news|m)\./, "");
      } catch {}
      return {
        title: cleanTitle(decode(String(it.title))),
        source,
        interest,
        description: decode(String(it.description ?? "")),
        url,
        publishedAt: it.pubDate,
      };
    });
}

const useNaver = () => !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);

type Search = (query: string, interest: InterestId, n: number) => Promise<Candidate[]>;

// 고른 관심사의 검색어를 전부 병렬로 돌린다. 실패한 검색은 건너뛰고 이유를 errors에 모은다.
// 다른 지역 기사는 빼고, 앞 20자가 같은 제목은 한 번만. 관심사당 최대 perInterest개.
async function run(search: Search, interests: InterestId[], perInterest: number) {
  const jobs = interests.flatMap((id) => QUERIES[id].map((q) => ({ id, q })));
  const results = await Promise.allSettled(jobs.map(({ id, q }) => search(q, id, perInterest)));
  const errors = results.flatMap((r) => (r.status === "rejected" ? [String(r.reason?.message ?? r.reason)] : []));
  errors.forEach((e) => console.warn("news failed:", e));

  const seen = new Set<string>();
  const count: Partial<Record<InterestId, number>> = {};
  const cands = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter(isSeoulOrNational)
    .filter((c) => c.title && !seen.has(c.title.slice(0, 20)) && seen.add(c.title.slice(0, 20)))
    .filter((c) => (count[c.interest] = (count[c.interest] ?? 0) + 1) <= perInterest);
  return { cands, errors };
}

// 네이버 키가 있으면 네이버 먼저, 하나도 못 가져오면 구글 뉴스로 대신한다.
export async function collect(interests: InterestId[], perInterest = 15) {
  if (!useNaver()) return { ...(await run(googleSearch, interests, perInterest)), source: "google" as const };
  const naver = await run(naverSearch, interests, perInterest);
  if (naver.cands.length > 0) return { ...naver, source: "naver" as const };
  const google = await run(googleSearch, interests, perInterest);
  return { cands: google.cands, errors: [...naver.errors, ...google.errors], source: "google" as const };
}
