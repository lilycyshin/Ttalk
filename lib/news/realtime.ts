// 구글 트렌드 실시간 급상승 검색어(한국). 키 없이 RSS로 받고, 최근 24시간에 뜬 것만 쓴다.
// 검색어마다 대략 검색량(approx_traffic)과 관련 기사 1~3개가 붙어 온다. 한 시간 안쪽으로 갱신된다.
import { XMLParser } from "fast-xml-parser";
import type { Topic } from "@/lib/topics";

export type Trend = {
  keyword: string;
  traffic: number; // "10000+" → 10000
  startedAt?: string;
  news: { title: string; url: string; source: string }[];
};

const URL = "https://trends.google.com/trending/rss?geo=KR";
const WINDOW_MS = 24 * 3600_000;

const parser = new XMLParser({ ignoreAttributes: true, trimValues: true });
const arr = <T>(x: T | T[] | undefined): T[] => (x === undefined ? [] : Array.isArray(x) ? x : [x]);
const decode = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

export async function fetchTrends(): Promise<Trend[]> {
  const res = await fetch(URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; lunchtalk/0.1)" },
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`trends ${res.status}`);
  const items = arr<any>(parser.parse(await res.text())?.rss?.channel?.item);
  return items
    .map((it) => ({
      keyword: decode(String(it.title)),
      traffic: Number(String(it["ht:approx_traffic"] ?? "").replace(/[^\d]/g, "")) || 0,
      startedAt: it.pubDate,
      news: arr<any>(it["ht:news_item"]).map((n) => ({
        title: decode(String(n["ht:news_item_title"] ?? "")),
        url: String(n["ht:news_item_url"] ?? ""),
        source: String(n["ht:news_item_source"] ?? ""),
      })),
    }))
    .filter((t) => {
      const at = Date.parse(t.startedAt ?? "");
      return Number.isNaN(at) || Date.now() - at <= WINDOW_MS;
    });
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");

// 토픽이 급상승 검색어와 겹치면 그 검색량을 hot에 적는다 (정렬에 씀).
export function markHot(topics: Topic[], trends: Trend[]) {
  for (const t of topics) {
    const text = norm([t.keyword, t.headline, t.summary, ...t.source_titles].join(" "));
    const titles = new Set(t.source_titles);
    const hit = trends.filter(
      (tr) => (norm(tr.keyword).length >= 2 && text.includes(norm(tr.keyword))) || tr.news.some((n) => titles.has(n.title)),
    );
    if (hit.length) t.hot = Math.max(...hit.map((h) => h.traffic));
  }
}
