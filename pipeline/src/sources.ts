// 무료 소스에서 오늘의 이슈 후보를 모은다. 전부 키 없이 동작하는 RSS.
import { XMLParser } from "fast-xml-parser";

export type Candidate = {
  title: string;
  source: string;
  hint: string; // 소스가 암시하는 카테고리 (LLM 태깅의 힌트일 뿐)
  url?: string;
  publishedAt?: string;
  traffic?: string; // 구글 트렌드 검색량 (예: "10000+")
  related?: string[]; // 트렌드 키워드에 딸린 뉴스 제목
};

type Feed = { name: string; url: string; hint: string; kind: "trends" | "rss" };

// 2026-09-30 기준 접근 확인한 피드. 한경 스포츠/연예는 갱신이 느려 신선도 필터가 필수.
export const FEEDS: Feed[] = [
  { name: "구글트렌드", url: "https://trends.google.com/trending/rss?geo=KR", hint: "trending", kind: "trends" },
  { name: "경향 전체", url: "https://www.khan.co.kr/rss/rssdata/total_news.xml", hint: "general", kind: "rss" },
  { name: "한경 부동산", url: "https://www.hankyung.com/feed/realestate", hint: "real_estate", kind: "rss" },
  { name: "한경 경제", url: "https://www.hankyung.com/feed/economy", hint: "economy", kind: "rss" },
  { name: "한경 IT", url: "https://www.hankyung.com/feed/it", hint: "tech", kind: "rss" },
  { name: "한경 스포츠", url: "https://www.hankyung.com/feed/sports", hint: "sports", kind: "rss" },
  { name: "한경 연예", url: "https://www.hankyung.com/feed/entertainment", hint: "entertainment", kind: "rss" },
  { name: "한경 라이프", url: "https://www.hankyung.com/feed/life", hint: "lifestyle", kind: "rss" },
];

const parser = new XMLParser({ ignoreAttributes: true, cdataPropName: false, trimValues: true });
const arr = <T>(x: T | T[] | undefined): T[] => (x === undefined ? [] : Array.isArray(x) ? x : [x]);

export function parseFeed(xml: string, feed: Feed): Candidate[] {
  const items = arr<any>(parser.parse(xml)?.rss?.channel?.item);
  if (feed.kind === "trends") {
    return items.map((it) => ({
      title: String(it.title),
      source: feed.name,
      hint: feed.hint,
      publishedAt: it.pubDate,
      traffic: it["ht:approx_traffic"],
      related: arr<any>(it["ht:news_item"]).map((n) => String(n["ht:news_item_title"])),
      url: arr<any>(it["ht:news_item"])[0]?.["ht:news_item_url"],
    }));
  }
  return items.map((it) => ({
    title: String(it.title),
    source: feed.name,
    hint: feed.hint,
    url: it.link,
    publishedAt: it.pubDate,
  }));
}

export function isFresh(c: Candidate, now: Date, maxHours = 36): boolean {
  if (!c.publishedAt) return true;
  const t = Date.parse(c.publishedAt);
  return Number.isNaN(t) || now.getTime() - t <= maxHours * 3600_000;
}

export async function collect(now = new Date(), perFeed = 15): Promise<Candidate[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async (f) => {
      const res = await fetch(f.url, { headers: { "User-Agent": "smalltalk-bot/0.1" } });
      if (!res.ok) throw new Error(`${f.name} ${res.status}`);
      return parseFeed(await res.text(), f).filter((c) => isFresh(c, now)).slice(0, perFeed);
    }),
  );
  results.forEach((r, i) => r.status === "rejected" && console.warn("feed failed:", FEEDS[i].name, r.reason));
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
