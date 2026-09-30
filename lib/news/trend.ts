// 네이버 데이터랩 검색어 트렌드(NAVER API HUB)로 "같이 먹는 사람 연령대가 요즘 이 주제를 얼마나 검색하는지"를 잰다.
// 한 요청에 키워드 그룹 5개까지, ratio는 요청 안에서 최댓값을 100으로 둔 상댓값이라
// 모든 요청에 같은 기준 키워드(ANCHOR)를 넣고 그 대비 비율로 점수를 매긴다.
import type { AgeGroup, Topic } from "@/lib/topics";

const URL = "https://naverapihub.apigw.ntruss.com/search-trend/v1/search";
// 기준 키워드는 검색량이 너무 크면 다른 점수가 0 근처로 뭉개지므로 중간 정도인 걸 쓴다.
const ANCHOR = "점심메뉴";
const DAYS = 7;

// 데이터랩 연령 코드: 3=19~24, 4=25~29, 5=30~34, 6=35~39, 7=40~44, 8=45~49, 9=50~54, 10=55~59, 11=60+
const AGE_CODES: Record<AgeGroup, string[]> = {
  "20s": ["3", "4"],
  "30s": ["5", "6"],
  "40s": ["7", "8"],
  "50s_plus": ["9", "10", "11"],
};

const cleanKey = (v?: string) => (v ?? "").trim().replace(/^["']|["']$/g, "");
const ymd = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

async function query(keywords: string[], ages: string[]): Promise<Map<string, number>> {
  const end = new Date();
  const start = new Date(end.getTime() - DAYS * 24 * 3600_000);
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      "X-NCP-APIGW-API-KEY-ID": cleanKey(process.env.NAVER_CLIENT_ID),
      "X-NCP-APIGW-API-KEY": cleanKey(process.env.NAVER_CLIENT_SECRET),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: ymd(start),
      endDate: ymd(end),
      timeUnit: "date",
      keywordGroups: [ANCHOR, ...keywords].map((k) => ({ groupName: k, keywords: [k] })),
      ...(ages.length ? { ages } : {}),
    }),
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`datalab ${res.status} ${(await res.text()).slice(0, 120)}`);
  const results: { title: string; data: { ratio: number }[] }[] = (await res.json()).results ?? [];
  const avg = new Map(results.map((r) => [r.title, mean(r.data.map((d) => d.ratio))]));
  const anchor = avg.get(ANCHOR) || 1;
  return new Map(keywords.map((k) => [k, (avg.get(k) ?? 0) / anchor]));
}

// topics의 keyword마다 연령대 검색 관심도(기준 키워드 대비 배수)를 trend에 채운다. 실패하면 조용히 건너뛴다.
export async function scoreByAge(topics: Topic[], ages: AgeGroup[]): Promise<string[]> {
  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) return [];
  const codes = [...new Set(ages.flatMap((a) => AGE_CODES[a]))];
  // 여러 단어로 오면 첫 단어만 (예: "고소영 친오빠" → "고소영"). 검색량은 보통 이름·대표어에 몰린다.
  for (const t of topics) if (t.keyword) t.keyword = t.keyword.trim().split(/\s+/)[0];
  const keywords = [...new Set(topics.map((t) => t.keyword).filter((k): k is string => !!k))];
  const batches: string[][] = [];
  for (let i = 0; i < keywords.length; i += 4) batches.push(keywords.slice(i, i + 4));

  const results = await Promise.allSettled(batches.map((b) => query(b, codes)));
  const score = new Map<string, number>();
  const errors: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") r.value.forEach((v, k) => score.set(k, v));
    else errors.push(String(r.reason?.message ?? r.reason));
  }
  for (const t of topics) if (t.keyword && score.has(t.keyword)) t.trend = Math.round(score.get(t.keyword)! * 1000) / 1000;
  return errors;
}
