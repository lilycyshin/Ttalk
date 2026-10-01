// 오늘의 토픽 풀을 실시간으로 만든다: 관심사별 뉴스 수집 → (키 있으면) Gemini로 멘트 생성, 없으면 틀 멘트.
import { geminiClient } from "@/lib/gemini";
import { INTERESTS, MIN_PICKS, TOTAL_PICKS, type AgeGroup, type Daily, type Topic } from "@/lib/topics";
import { collect, isRelevant, type InterestId } from "./sources";
import { isSameEvent } from "./similar";
import { generateForInterest } from "./generate";
import { fallbackTopics, isSmallTalkSafe } from "./fallback";
import { scoreByAge } from "./trend";
import { fetchTrends, markHot, type Trend } from "./realtime";

// news: 어디서 가져왔는지와 실패한 검색 이유(최대 3개). 네이버 연결 확인용.
export type LiveDaily = Daily & {
  generatedAt: string;
  mode: "gemini" | "template";
  news: { source: "naver" | "google"; errors: string[] };
  trendErrors: string[]; // 데이터랩 실패 이유 (연결 확인용)
  realtime: { count: number; error?: string }; // 구글 트렌드 급상승 검색어 수 (연결 확인용)
};

// interests: 수집할 관심사. 앱은 사용자가 고른 것만 넘겨서 수집·생성 비용을 줄인다.
export async function buildToday(
  interests: InterestId[] = INTERESTS.map((i) => i.id),
  ages: AgeGroup[] = [],
): Promise<LiveDaily> {
  const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  // 뉴스와 급상승 검색어를 같이 받는다. 급상승 검색어가 실패해도 뉴스만으로 진행.
  const [{ cands, errors, source }, trendsRes] = await Promise.all([
    collect(interests),
    fetchTrends().then(
      (t) => ({ trends: t, error: undefined }),
      (e) => ({ trends: [] as Trend[], error: String(e?.message ?? e) }),
    ),
  ]);
  const { trends } = trendsRes;
  if (cands.length === 0) throw new Error(`no news collected: ${errors.slice(0, 3).join(" | ")}`);

  const client = geminiClient();
  // 화면엔 전체 TOTAL_PICKS개만 나가므로 관심사당 그 몫에 여유분 2개를 더해 만든다 (연령대 필터·검색 관심도로 골라냄).
  // 관심사 하나만 골라도 MIN_PICKS개는 나오게 한다.
  const count = Math.max(Math.ceil(MIN_PICKS / interests.length) + 1, Math.ceil(TOTAL_PICKS / interests.length) + 2);
  const perInterest = await Promise.all(
    interests.map(async (id) => {
      const mine = cands.filter((c) => c.interest === id);
      if (mine.length === 0) return [];
      if (!client) return fallbackTopics(mine, count);
      try {
        const made = await generateForInterest(client, id, mine, date, count, ages);
        // 모델이 적게 골랐으면 안 쓴 기사로 틀 멘트를 만들어 개수를 채운다.
        if (made.length >= count) return made;
        const used = new Set(made.flatMap((t) => t.source_titles));
        return [...made, ...fallbackTopics(mine.filter((c) => !used.has(c.title)), count - made.length)];
      } catch (e) {
        // 한 관심사가 실패해도 나머지는 살린다. 이 관심사만 틀 멘트로.
        console.warn("generate failed:", id, e);
        return fallbackTopics(mine.filter(isSmallTalkSafe), count);
      }
    }),
  );

  // 근거 기사 제목으로 원문 링크를 붙인다 (최대 2개).
  const linkOf = (title: string) => {
    const c = cands.find((c) => c.title === title || c.title.startsWith(title.slice(0, 15)));
    return c?.url ? { title: c.title, url: c.url, source: c.source } : null;
  };
  for (const t of perInterest.flat())
    t.links = t.source_titles.map(linkOf).filter((l): l is NonNullable<typeof l> => !!l).slice(0, 2);

  // 같은 사건 토픽은 하나로 합치고 태그·링크를 모은다. 관심사끼리, 생성 묶음끼리 겹치는 걸 여기서 거른다.
  // 같은 사건: 검색 키워드가 같거나, 카드 제목이 비슷하거나, 근거 기사 제목이 비슷하면.
  const merged: Topic[] = [];
  for (const t of perInterest.flat()) {
    // AI·IT처럼 범위가 좁은 관심사 태그는 내용이 실제로 맞을 때만 단다. 태그가 다 빠지면 버린다.
    const text = [t.headline, t.summary, t.keyword ?? "", ...t.source_titles].join(" ");
    t.interests = t.interests.filter((i) => isRelevant(i as InterestId, text));
    if (t.interests.length === 0) continue;
    const prev = merged.find((m) => sameTopic(m, t));
    if (!prev) {
      merged.push(t);
      continue;
    }
    prev.interests = [...new Set([...prev.interests, ...t.interests])];
    const urls = new Set((prev.links ?? []).map((l) => l.url));
    prev.links = [...(prev.links ?? []), ...(t.links ?? []).filter((l) => !urls.has(l.url))].slice(0, 2);
  }

  // 같이 먹는 사람 연령대가 요즘 각 주제를 얼마나 검색하는지 붙인다 (정렬에 씀).
  const topics = merged;
  const trendErrors = ages.length ? await scoreByAge(topics, ages) : [];
  // 급상승 검색어는 토픽 소재로 쓰지 않고, 키워드 기사로 만든 토픽 중 겹치는 걸 위로 올리는 데만 쓴다.
  markHot(topics, trends);

  return {
    date,
    topics,
    generatedAt: new Date().toISOString(),
    mode: client ? "gemini" : "template",
    news: { source, errors: errors.slice(0, 3) },
    trendErrors,
    realtime: { count: trends.length, ...(trendsRes.error ? { error: trendsRes.error } : {}) },
  };
}

const normKey = (s?: string) => (s ?? "").toLowerCase().replace(/\s+/g, "");
function sameTopic(a: Topic, b: Topic) {
  const ka = normKey(a.keyword);
  if (ka.length >= 2 && ka === normKey(b.keyword)) return true;
  if (isSameEvent(a.headline, b.headline)) return true;
  return a.source_titles.some((x) => b.source_titles.some((y) => x === y || isSameEvent(x, y)));
}
