// 키워드별 탭 공용 풀을 만든다: 관심사 전체 뉴스 수집 → 같은 사건 기사끼리 묶기 → 묶음마다 제목에서 키워드 뽑기. AI는 쓰지 않는다.
// 서버가 미리 만들어 두고(app/api/today), 관심사 고르기는 앱에서 한다(pickKeywords).
import { INTERESTS, type KeywordItem, type KeywordPool } from "@/lib/topics";
import { collect, type InterestId } from "./sources";
import { cluster, isSameEvent } from "./similar";
import { isSmallTalkSafe } from "./filter";
import { keywordOf } from "./keyword";
import { fetchTrends, markHot, type Trend } from "./realtime";

// news: 어디서 가져왔는지와 실패한 검색 이유(최대 3개). 네이버 연결 확인용.
export type LiveDaily = KeywordPool & {
  generatedAt: string;
  news: { source: "naver" | "google"; errors: string[] };
  realtime: { count: number; error?: string }; // 구글 트렌드 급상승 검색어 수 (연결 확인용)
};

// 관심사마다 만드는 키워드 수, 키워드마다 보여줄 기사 수
const PER_INTEREST = 8;
const NEWS_PER_ITEM = 3;

export async function buildToday(interests: InterestId[] = INTERESTS.map((i) => i.id)): Promise<LiveDaily> {
  const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  // 뉴스와 급상승 검색어를 같이 받는다. 급상승 검색어가 실패해도 뉴스만으로 진행.
  const [{ cands, errors, source }, trendsRes] = await Promise.all([
    collect(interests),
    fetchTrends().then(
      (t) => ({ trends: t, error: undefined }),
      (e) => ({ trends: [] as Trend[], error: String(e?.message ?? e) }),
    ),
  ]);
  if (cands.length === 0) throw new Error(`no news collected: ${errors.slice(0, 3).join(" | ")}`);

  const items: KeywordItem[] = [];
  const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  for (const id of interests) {
    const mine = cands.filter((c) => c.interest === id && c.url && isSmallTalkSafe(c));
    // 같은 사건 기사가 많은 묶음부터 (많이 다뤄진 소식)
    const groups = cluster(mine, (c) => c.title)
      .map((g, i) => ({ g, i }))
      .sort((a, b) => b.g.length - a.g.length || a.i - b.i)
      .slice(0, PER_INTEREST)
      .map(({ g }) => g);
    for (const g of groups) {
      const news = g.slice(0, NEWS_PER_ITEM).map((c) => ({ title: c.title, url: c.url!, source: c.source }));
      const keyword = keywordOf(g.map((c) => c.title));
      // 키워드가 같거나(같은 사람·같은 주제 다른 기사) 다른 관심사에서 이미 나온 같은 사건이면 관심사 태그와 기사만 더한다.
      const prev = items.find(
        (it) =>
          norm(it.keyword) === norm(keyword) ||
          it.news.some((n) => g.some((c) => n.title === c.title || isSameEvent(n.title, c.title))),
      );
      if (prev) {
        if (!prev.interests.includes(id)) prev.interests.push(id);
        const urls = new Set(prev.news.map((n) => n.url));
        prev.news = [...prev.news, ...news.filter((n) => !urls.has(n.url))].slice(0, NEWS_PER_ITEM);
        prev.size += g.length;
        continue;
      }
      items.push({ keyword, interests: [id], news, size: g.length });
    }
  }
  // 지금 급상승 검색어와 겹치는 키워드를 위로 올린다.
  markHot(items, trendsRes.trends);

  return {
    date,
    items,
    generatedAt: new Date().toISOString(),
    news: { source, errors: errors.slice(0, 3) },
    realtime: { count: trendsRes.trends.length, ...(trendsRes.error ? { error: trendsRes.error } : {}) },
  };
}
