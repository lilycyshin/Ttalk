// 네이버 데이터랩 검색어 트렌드(NAVER API HUB)로 "연령대별로 이 키워드를 요즘 얼마나 검색하는지"를 잰다.
// 네이버는 연령대별 인기 검색어 목록은 주지 않는다(실시간 검색어 종료). 대신 우리가 뽑은 키워드의 연령대별 검색량을 비교한다.
// 한 요청에 키워드 그룹 5개까지, ratio는 요청 안에서 최댓값을 100으로 둔 상댓값이라
// 모든 요청에 같은 기준 키워드(ANCHOR)를 넣고 그 대비 배수로 점수를 매긴다. 하루 1,000회 한도.
import { AGE_GROUPS, type AgeGroup } from "@/lib/topics";

const URL = "https://naverapihub.apigw.ntruss.com/search-trend/v1/search";
// 기준 키워드는 검색량이 너무 크면 다른 점수가 0 근처로 뭉개지므로 중간 정도인 걸 쓴다.
const ANCHOR = "점심메뉴";
const DAYS = 7;
// 한 번에 재는 키워드 수 상한. 키워드 4개 × 연령대 4개가 요청 4번이라 MAX_KEYWORDS개면 요청 MAX_KEYWORDS번.
// 4시간마다(하루 6번) 재므로 하루 최대 840번, 한도 1,000회 안.
export const MAX_KEYWORDS = 140;

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

export const hasNaverKeys = () => !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);

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
      ages,
    }),
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`datalab ${res.status} ${(await res.text()).slice(0, 120)}`);
  const results: { title: string; data: { ratio: number }[] }[] = (await res.json()).results ?? [];
  const avg = new Map(results.map((r) => [r.title, mean(r.data.map((d) => d.ratio))]));
  const anchor = avg.get(ANCHOR) || 1;
  return new Map(keywords.map((k) => [k, Math.round(((avg.get(k) ?? 0) / anchor) * 1000) / 1000]));
}

export type AgeScores = Record<string, Partial<Record<AgeGroup, number>>>;

// 키워드마다 연령대별 최근 7일 검색 관심도(기준 키워드 대비 배수). 키가 없거나 실패한 묶음은 건너뛴다.
export async function scoreAges(keywords: string[]): Promise<{ scores: AgeScores; errors: string[]; at: string }> {
  const at = new Date().toISOString();
  if (!hasNaverKeys()) return { scores: {}, errors: ["no naver keys"], at };
  const list = [...new Set(keywords)].slice(0, MAX_KEYWORDS);
  const jobs: { age: AgeGroup; batch: string[] }[] = [];
  for (const age of AGE_GROUPS)
    for (let i = 0; i < list.length; i += 4) jobs.push({ age, batch: list.slice(i, i + 4) });

  const scores: AgeScores = {};
  const errors: string[] = [];
  // 한꺼번에 몰리지 않게 8개씩
  for (let i = 0; i < jobs.length; i += 8) {
    const done = await Promise.allSettled(jobs.slice(i, i + 8).map((j) => query(j.batch, AGE_CODES[j.age])));
    done.forEach((r, k) => {
      const { age } = jobs[i + k];
      if (r.status === "fulfilled") r.value.forEach((v, kw) => ((scores[kw] ??= {})[age] = v));
      else errors.push(String(r.reason?.message ?? r.reason));
    });
    // 키가 틀렸으면 첫 묶음에서 다 실패한다. 나머지는 부르지 않는다.
    if (i === 0 && done.every((r) => r.status === "rejected")) break;
  }
  return { scores, errors: [...new Set(errors)].slice(0, 3), at };
}
