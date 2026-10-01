// 실검: 지금 한국에서 많이 검색되는 키워드 (구글 트렌드 RSS, 키 없음). 항상 10개.
// 트렌드 피드는 한 번에 10개뿐이라 걸러내고 모자라면 구글 뉴스 연예·스포츠·IT 헤드라인으로 채운다.
// Gemini가 키워드마다 왜 떴는지 설명과 점심에 꺼낼 한마디를 붙인다. 결과는 10분 캐시.
// 사건·사고·정치처럼 점심에 꺼내기 곤란한 건 뺀다.
import { unstable_cache } from "next/cache";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import { isAwkwardTitle } from "@/lib/news/fallback";
import { generateJson, geminiClient } from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type News = { title: string; url: string; source: string };
export type Trend = { keyword: string; why?: string; talk?: string; news: News[]; fromNews?: boolean };

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
    .map(({ keyword, news }) => ({ keyword, news: news.slice(0, 2) }));
}

// 채우기용: 구글 뉴스 섹션 헤드라인을 연예·스포츠·IT 순서로 번갈아 뽑는다.
const SECTIONS = ["ENTERTAINMENT", "SPORTS", "TECHNOLOGY"];
// 기사 제목에서 짧은 키워드 (Gemini가 없을 때): 쉼표·말줄임표 앞, 최대 14자
function shortKeyword(title: string) {
  const head = title.split(/[,…·]|\.\.\./)[0].replace(/["'‘’“”]/g, "").trim();
  return head.length > 14 ? `${head.slice(0, 14).trim()}…` : head;
}

async function supplement(n: number, taken: Set<string>): Promise<Trend[]> {
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
      out.push({ keyword: shortKeyword(x.title), news: [x], fromNews: true });
    }
  return out;
}

const Explain = z.object({
  items: z.array(
    z.object({
      index: z.number().describe("입력 번호"),
      keyword: z.string().describe("검색어 항목은 그대로. (뉴스) 항목은 기사 제목을 보고 2~12자 짧은 주제 이름"),
      why: z.string().describe("왜 화제인지 2~3문장. 관련 기사 제목에 있는 사실만 쓰고 지어내지 않는다"),
      talk: z
        .string()
        .describe(
          "점심 자리에서 꺼낼 자연스러운 한마디. 2030 구어체 해요체, 호칭 없이, 질문형. \"~기사 보셨어요?\"처럼 기사를 말하지 말고 일어난 일을 직접 말한다 (예: 광화문에서 오늘 공중쇼 한 거 보셨어요?)",
        ),
    }),
  ),
});

const EXPLAIN_SYSTEM = `너는 회사 점심 자리에서 쓸 스몰토크를 도와주는 편집자다.
지금 많이 검색되는 키워드(또는 화제 기사)와 관련 기사 제목이 주어진다. 항목마다 왜 화제인지 짧게 설명하고, 점심에 꺼낼 한마디를 만든다.
- 설명은 관련 기사 제목에 있는 사실만 쓴다. 모르는 건 추측하지 않는다.
- 말투는 자연스러운 2030 구어체 해요체. 이모지 금지.`;

// Gemini로 설명 붙이기. 키가 없거나 실패하면 첫 기사 제목을 설명으로 쓴다.
async function explain(trends: Trend[]): Promise<Trend[]> {
  const fallback = trends.map((t) => ({ ...t, why: t.news[0]?.title }));
  const ai = geminiClient();
  if (!ai) return fallback;
  try {
    const prompt = trends
      .map((t, i) => {
        const head = `${i + 1}. ${t.fromNews ? "(뉴스) " : ""}${t.keyword}`;
        return [head, ...t.news.map((n) => `   - ${n.title}`)].join("\n");
      })
      .join("\n");
    const { items } = await generateJson(ai, Explain, EXPLAIN_SYSTEM, prompt);
    const byIndex = new Map(items.map((x) => [x.index, x]));
    return trends.map((t, i) => {
      const x = byIndex.get(i + 1);
      return {
        ...t,
        keyword: t.fromNews && x?.keyword ? x.keyword : t.keyword,
        why: x?.why ?? t.news[0]?.title,
        talk: x?.talk,
      };
    });
  } catch (e) {
    console.error("trends explain failed:", e);
    return fallback;
  }
}

async function build() {
  const trends = (await fetchTrends()).slice(0, COUNT);
  const taken = new Set(trends.flatMap((t) => t.news.map((n) => n.title.slice(0, 15))));
  const filled = [...trends, ...(await supplement(COUNT - trends.length, taken))];
  return { trends: await explain(filled), updatedAt: new Date().toISOString() };
}

const cached = unstable_cache(build, ["trends-v6"], { revalidate: 600 });

export async function GET() {
  try {
    return Response.json(await cached());
  } catch (e) {
    console.error("trends failed:", e);
    return Response.json({ error: "trends unavailable" }, { status: 503 });
  }
}
