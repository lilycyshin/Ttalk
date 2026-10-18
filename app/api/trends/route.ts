// 실검: 지금 한국에서 많이 검색되는 키워드 (구글 트렌드 RSS, 키 없음). 항상 10개.
// 트렌드 피드는 한 번에 10개뿐이라 걸러내고 모자라면 구글 뉴스 연예·스포츠·IT 헤드라인으로 채운다.
// 화면엔 키워드, 누르면 관련 기사 제목. AI는 쓰지 않는다. 서버가 1시간마다 미리 만들어 두고 바로 돌려준다
// (만든 지 50분이 넘으면 가진 걸 먼저 주고 뒤에서 새로 만든다. 깨우기는 .github/workflows/refresh.yml).
// 사건·사고·정치처럼 점심에 꺼내기 곤란한 건 뺀다.
import { unstable_cache } from "next/cache";
import { XMLParser } from "fast-xml-parser";
import { isAwkwardTitle } from "@/lib/news/filter";
import { keywordOf } from "@/lib/news/keyword";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type News = { title: string; url: string; source: string };
// startedAt: 구글 트렌드에 오른 시각 (NEW 표시용)
export type Trend = { keyword: string; news: News[]; fromNews?: boolean; startedAt?: string };

const COUNT = 10;
const UA = { "User-Agent": "Mozilla/5.0 (compatible; lunchtalk/0.1)" };

const parser = new XMLParser({ ignoreAttributes: true, trimValues: true });
const arr = <T>(x: T | T[] | undefined): T[] => (x === undefined ? [] : Array.isArray(x) ? x : [x]);
const traffic = (s: unknown) => Number(String(s ?? "").replace(/[^0-9]/g, "")) || 0;
// "[사진]송강,'명품 손인사' - 조선비즈" → "송강,'명품 손인사'"
const cleanNews = (t: string) =>
  t
    .replace(/ - [^-]+$/, "")
    .replace(/^\s*[\[【(][^\]】)]{1,8}[\]】)]\s*/, "")
    .trim();

// 영어 등 외국어 기사는 뺀다: 한글이 글자의 30% 이상인 제목만
const isKorean = (t: string) => (t.match(/[가-힣]/g)?.length ?? 0) / Math.max(t.replace(/\s/g, "").length, 1) >= 0.3;

async function rss(url: string) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return arr<any>(parser.parse(await res.text())?.rss?.channel?.item);
}

// 구글 트렌드 검색어 (검색량 순)
async function fetchTrends(): Promise<Trend[]> {
  const items = await rss("https://trends.google.com/trending/rss?geo=KR");
  return items
    .map((it) => ({
      keyword: String(it.title),
      startedAt: it.pubDate ? new Date(String(it.pubDate)).toISOString() : undefined,
      n: traffic(it["ht:approx_traffic"]),
      news: arr<any>(it["ht:news_item"]).map((x) => ({
        title: cleanNews(String(x["ht:news_item_title"] ?? "")),
        url: String(x["ht:news_item_url"] ?? ""),
        source: String(x["ht:news_item_source"] ?? ""),
      })),
    }))
    .map((t) => ({ ...t, news: t.news.filter((n) => isKorean(n.title)) }))
    .filter((t) => t.news.length > 0 && !isAwkwardTitle(t.keyword) && !t.news.some((n) => isAwkwardTitle(n.title)))
    .sort((a, b) => b.n - a.n)
    .map(({ keyword, news, startedAt }) => ({ keyword, startedAt, news: news.slice(0, 3) }));
}

// 채우기용: 구글 뉴스 섹션 헤드라인을 연예·스포츠·IT 순서로 번갈아 뽑는다.
const SECTIONS = ["ENTERTAINMENT", "SPORTS", "TECHNOLOGY"];
// taken: 이미 쓴 기사(앞 15자), keywords: 이미 쓴 키워드
async function supplement(n: number, taken: Set<string>, keywords: Set<string>): Promise<Trend[]> {
  if (n <= 0) return [];
  const feeds = await Promise.allSettled(
    SECTIONS.map((sec) => rss(`https://news.google.com/rss/headlines/section/topic/${sec}?hl=ko&gl=KR&ceid=KR:ko`)),
  );
  const lists: News[][] = feeds.map((f) =>
    f.status === "fulfilled"
      ? f.value
          .map((it) => ({
            title: cleanNews(String(it.title)),
            url: String(it.link ?? ""),
            source: typeof it.source === "string" ? it.source : "",
          }))
          .filter((x) => x.title && isKorean(x.title) && !isAwkwardTitle(x.title))
      : [],
  );
  const out: Trend[] = [];
  for (let i = 0; out.length < n && lists.some((l) => l[i]); i++)
    for (const l of lists) {
      const x = l[i];
      if (!x || out.length >= n || taken.has(x.title.slice(0, 15))) continue;
      taken.add(x.title.slice(0, 15));
      out.push({ keyword: keywordOf([x.title], keywords), news: [x], fromNews: true });
    }
  return out;
}

// hour: 만든 시각, 한국 시간 "YYYY-MM-DD HH" (앱의 순위 변화 비교와 "N시 업데이트" 표시에 씀).
const hourKST = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 13).replace("T", " ");
async function build() {
  const trends = (await fetchTrends()).slice(0, COUNT);
  const taken = new Set(trends.flatMap((t) => t.news.map((n) => n.title.slice(0, 15))));
  const keywords = new Set(trends.map((t) => t.keyword.replace(/\s+/g, "")));
  const filled = [...trends, ...(await supplement(COUNT - trends.length, taken, keywords))];
  return { trends: filled, updatedAt: new Date().toISOString(), hour: hourKST() };
}

const cached = unstable_cache(build, ["trends-v10"], { revalidate: 3000 });

export async function GET() {
  try {
    return Response.json(await cached(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("trends failed:", e);
    return Response.json({ error: "trends unavailable" }, { status: 503 });
  }
}
